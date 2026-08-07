import createFm1MsfaModule from './fm1-msfa.mjs'

const PROCESSOR_NAME = 'fm1-msfa-one-voice'
const PATCH_LENGTH = 156
const ENGINE_BLOCK_FRAMES = 64
const MAX_POLYPHONY = 16

class Fm1MsfaProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.module = null
    this.voices = []
    this.outputPointer = 0
    this.ready = false
    this.voiceLoaded = false
    this.disposed = false
    this.reportedFatal = false
    this.pendingCommands = []
    this.ageCounter = 0
    this.port.onmessage = (event) => this.receiveCommand(event.data)

    const wasmBinary = options?.processorOptions?.wasmBinary
    if (!(wasmBinary instanceof ArrayBuffer)) {
      this.fail('AudioWorklet requires a local MSFA WebAssembly ArrayBuffer')
      return
    }
    void this.initialize(wasmBinary)
  }

  async initialize(wasmBinary) {
    try {
      const module = await createFm1MsfaModule({
        wasmBinary: new Uint8Array(wasmBinary),
        locateFile: (path) => path,
      })
      if (this.disposed) return
      this.assertModule(module)

      const voices = []
      for (let index = 0; index < MAX_POLYPHONY; index += 1) {
        const session = module._fm1_msfa_session_create(sampleRate)
        if (!session) {
          for (const voice of voices) module._fm1_msfa_session_destroy(voice.session)
          throw new Error(`Unable to create MSFA polyphony session ${index + 1} at ${sampleRate} Hz`)
        }
        voices.push({ session, note: null, state: 'idle', age: 0, index })
      }

      const outputPointer = module._malloc(ENGINE_BLOCK_FRAMES * Float32Array.BYTES_PER_ELEMENT)
      if (!outputPointer) {
        for (const voice of voices) module._fm1_msfa_session_destroy(voice.session)
        throw new Error('Unable to allocate MSFA AudioWorklet output block')
      }

      this.module = module
      this.voices = voices
      this.outputPointer = outputPointer
      this.ready = true
      this.port.postMessage({
        type: 'ready',
        sampleRate,
        blockFrames: ENGINE_BLOCK_FRAMES,
        polyphony: MAX_POLYPHONY,
      })

      const queued = this.pendingCommands
      this.pendingCommands = []
      for (const command of queued) this.executeCommand(command)
    } catch (error) {
      this.fail(error)
    }
  }

  assertModule(module) {
    const required = [
      '_malloc',
      '_free',
      '_fm1_msfa_patch_length',
      '_fm1_msfa_block_size',
      '_fm1_msfa_session_create',
      '_fm1_msfa_session_destroy',
      '_fm1_msfa_session_load_patch',
      '_fm1_msfa_session_note_on',
      '_fm1_msfa_session_note_off',
      '_fm1_msfa_session_all_notes_off',
      '_fm1_msfa_session_render64',
      '_fm1_msfa_session_is_playing',
    ]
    for (const name of required) {
      if (typeof module[name] !== 'function') throw new Error(`Packaged MSFA module is missing ${name}`)
    }
    if (module._fm1_msfa_patch_length() !== PATCH_LENGTH) {
      throw new Error(`Packaged MSFA patch length is not ${PATCH_LENGTH}`)
    }
    if (module._fm1_msfa_block_size() !== ENGINE_BLOCK_FRAMES) {
      throw new Error(`Packaged MSFA block size is not ${ENGINE_BLOCK_FRAMES}`)
    }
  }

  receiveCommand(command) {
    if (!command || command.type !== 'command') return
    if (this.disposed) {
      this.respond(command.requestId, false, 'AudioWorklet session is disposed')
      return
    }
    if (!this.ready) {
      this.pendingCommands.push(command)
      return
    }
    this.executeCommand(command)
  }

  executeCommand(command) {
    try {
      switch (command.command) {
        case 'loadVoice':
          this.loadVoice(command)
          break
        case 'noteOn':
          this.noteOn(command)
          break
        case 'noteOff':
          this.noteOff(command)
          break
        case 'allNotesOff':
          this.allNotesOff()
          this.respond(command.requestId, true)
          break
        case 'dispose':
          this.respond(command.requestId, true)
          this.dispose()
          break
        default:
          throw new Error(`Unsupported AudioWorklet command ${String(command.command)}`)
      }
    } catch (error) {
      this.respond(command.requestId, false, error)
    }
  }

  loadVoice(command) {
    const patch = command.patch instanceof Uint8Array
      ? command.patch
      : command.patch instanceof ArrayBuffer
        ? new Uint8Array(command.patch)
        : null
    if (!patch || patch.length !== PATCH_LENGTH) {
      throw new Error(`AudioWorklet voice patch must contain ${PATCH_LENGTH} bytes`)
    }
    const pointer = this.module._malloc(PATCH_LENGTH)
    if (!pointer) throw new Error('Unable to allocate MSFA voice buffer')
    try {
      this.module.HEAPU8.set(patch, pointer)
      for (const voice of this.voices) {
        this.checkStatus(
          this.module._fm1_msfa_session_load_patch(
            voice.session,
            pointer,
            PATCH_LENGTH,
            command.randomSeed >>> 0,
          ),
          `loadVoice[${voice.index}]`,
        )
        voice.note = null
        voice.state = 'idle'
        voice.age = 0
      }
      this.ageCounter = 0
      this.voiceLoaded = true
    } finally {
      this.module._free(pointer)
    }
    this.respond(command.requestId, true)
  }

  selectVoice(note) {
    const repeated = this.voices.find((voice) => voice.state === 'held' && voice.note === note)
    if (repeated) return repeated
    const idle = this.voices.find((voice) => voice.state === 'idle')
    if (idle) return idle
    const releasing = this.voices
      .filter((voice) => voice.state === 'release')
      .sort((left, right) => left.age - right.age || left.index - right.index)[0]
    if (releasing) return releasing
    return [...this.voices].sort((left, right) => left.age - right.age || left.index - right.index)[0]
  }

  noteOn(command) {
    if (!this.voiceLoaded) throw new Error('Load a semantic voice before note-on')
    const note = command.midiNote
    const velocity = command.velocity
    if (!Number.isInteger(note) || note < 0 || note > 127) throw new RangeError('midiNote must be 0 through 127')
    if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) throw new RangeError('velocity must be 1 through 127')

    const voice = this.selectVoice(note)
    if (!voice) throw new Error('No MSFA polyphony voice is available')
    if (voice.state !== 'idle') {
      this.checkStatus(this.module._fm1_msfa_session_all_notes_off(voice.session), `steal[${voice.index}]`)
    }
    this.checkStatus(this.module._fm1_msfa_session_note_on(voice.session, note, velocity), `noteOn[${voice.index}]`)
    voice.note = note
    voice.state = 'held'
    voice.age = ++this.ageCounter
    this.respond(command.requestId, true, undefined, { voiceIndex: voice.index })
  }

  noteOff(command) {
    if (!this.voiceLoaded) throw new Error('Load a semantic voice before note-off')
    const hasNote = Number.isInteger(command.midiNote)
    const note = hasNote ? command.midiNote : null
    if (hasNote && (note < 0 || note > 127)) throw new RangeError('midiNote must be 0 through 127')
    const matches = this.voices.filter((voice) => (
      voice.state === 'held' && (note === null || voice.note === note)
    ))
    for (const voice of matches) {
      this.checkStatus(this.module._fm1_msfa_session_note_off(voice.session), `noteOff[${voice.index}]`)
      voice.state = 'release'
    }
    this.respond(command.requestId, true)
  }

  allNotesOff() {
    if (!this.voiceLoaded) return
    for (const voice of this.voices) {
      this.checkStatus(this.module._fm1_msfa_session_all_notes_off(voice.session), `allNotesOff[${voice.index}]`)
      voice.note = null
      voice.state = 'idle'
      voice.age = 0
    }
  }

  checkStatus(status, operation) {
    if (status !== 0) throw new Error(`MSFA ${operation} failed with status ${status}`)
  }

  respond(requestId, ok, error, result) {
    if (!Number.isInteger(requestId)) return
    this.port.postMessage({
      type: 'response',
      requestId,
      ok,
      ...(result === undefined ? {} : { result }),
      ...(ok ? {} : { error: this.errorMessage(error) }),
    })
  }

  errorMessage(error) {
    return error instanceof Error ? error.message : String(error)
  }

  fail(error) {
    if (this.reportedFatal) return
    this.reportedFatal = true
    this.port.postMessage({ type: 'fatal', error: this.errorMessage(error) })
    this.dispose()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.ready = false
    this.voiceLoaded = false
    this.pendingCommands = []
    if (this.module) {
      for (const voice of this.voices) {
        if (voice.session) this.module._fm1_msfa_session_destroy(voice.session)
      }
      if (this.outputPointer) this.module._free(this.outputPointer)
    }
    this.voices = []
    this.outputPointer = 0
  }

  clearOutputs(outputs) {
    for (const output of outputs) {
      for (const channel of output) channel.fill(0)
    }
  }

  process(_inputs, outputs) {
    this.clearOutputs(outputs)
    if (this.disposed) return false
    if (!this.ready || !this.voiceLoaded || !this.module || !this.outputPointer) return true

    try {
      const channels = outputs[0]
      const mono = channels?.[0]
      if (!mono) return true
      if (mono.length % ENGINE_BLOCK_FRAMES !== 0) {
        throw new Error(`AudioWorklet callback length ${mono.length} is not divisible by ${ENGINE_BLOCK_FRAMES}`)
      }
      const firstSample = this.outputPointer / Float32Array.BYTES_PER_ELEMENT

      for (let offset = 0; offset < mono.length; offset += ENGINE_BLOCK_FRAMES) {
        for (const voice of this.voices) {
          this.checkStatus(
            this.module._fm1_msfa_session_render64(voice.session, this.outputPointer),
            `render64[${voice.index}]`,
          )
          const scratch = this.module.HEAPF32.subarray(firstSample, firstSample + ENGINE_BLOCK_FRAMES)
          if (voice.state !== 'idle') {
            for (let index = 0; index < ENGINE_BLOCK_FRAMES; index += 1) {
              mono[offset + index] += scratch[index]
            }
          }
          if (voice.state !== 'idle' && !this.module._fm1_msfa_session_is_playing(voice.session)) {
            voice.note = null
            voice.state = 'idle'
            voice.age = 0
          }
        }
        for (let index = 0; index < ENGINE_BLOCK_FRAMES; index += 1) {
          const outputIndex = offset + index
          mono[outputIndex] = Math.max(-1, Math.min(1, mono[outputIndex]))
        }
      }
      for (let channel = 1; channel < channels.length; channel += 1) channels[channel].set(mono)
      return true
    } catch (error) {
      this.clearOutputs(outputs)
      this.fail(error)
      return false
    }
  }
}

registerProcessor(PROCESSOR_NAME, Fm1MsfaProcessor)
