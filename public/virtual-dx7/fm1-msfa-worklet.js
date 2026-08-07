import createFm1MsfaModule from './fm1-msfa.mjs'

const PROCESSOR_NAME = 'fm1-msfa-one-voice'
const PATCH_LENGTH = 156
const ENGINE_BLOCK_FRAMES = 64

class Fm1MsfaOneVoiceProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.module = null
    this.session = 0
    this.outputPointer = 0
    this.ready = false
    this.disposed = false
    this.reportedFatal = false
    this.pendingCommands = []
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
        // AudioWorkletGlobalScope does not expose URL in Chrome/Edge. The WASM
        // bytes are already supplied above, so prevent Emscripten from resolving
        // a URL that will never be fetched.
        locateFile: (path) => path,
      })
      if (this.disposed) return
      this.assertModule(module)
      const session = module._fm1_msfa_session_create(sampleRate)
      if (!session) throw new Error(`Unable to create MSFA session at ${sampleRate} Hz`)
      const outputPointer = module._malloc(ENGINE_BLOCK_FRAMES * Float32Array.BYTES_PER_ELEMENT)
      if (!outputPointer) {
        module._fm1_msfa_session_destroy(session)
        throw new Error('Unable to allocate MSFA AudioWorklet output block')
      }

      this.module = module
      this.session = session
      this.outputPointer = outputPointer
      this.ready = true
      this.port.postMessage({ type: 'ready', sampleRate, blockFrames: ENGINE_BLOCK_FRAMES })

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
          this.checkStatus(this.module._fm1_msfa_session_note_on(this.session, command.midiNote, command.velocity), 'noteOn')
          this.respond(command.requestId, true)
          break
        case 'noteOff':
          this.checkStatus(this.module._fm1_msfa_session_note_off(this.session), 'noteOff')
          this.respond(command.requestId, true)
          break
        case 'allNotesOff':
          this.checkStatus(this.module._fm1_msfa_session_all_notes_off(this.session), 'allNotesOff')
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
      this.checkStatus(
        this.module._fm1_msfa_session_load_patch(this.session, pointer, PATCH_LENGTH, command.randomSeed >>> 0),
        'loadVoice',
      )
    } finally {
      this.module._free(pointer)
    }
    this.respond(command.requestId, true)
  }

  checkStatus(status, operation) {
    if (status !== 0) throw new Error(`MSFA ${operation} failed with status ${status}`)
  }

  respond(requestId, ok, error) {
    if (!Number.isInteger(requestId)) return
    this.port.postMessage({
      type: 'response',
      requestId,
      ok,
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
    this.pendingCommands = []
    if (this.module && this.session) this.module._fm1_msfa_session_destroy(this.session)
    if (this.module && this.outputPointer) this.module._free(this.outputPointer)
    this.session = 0
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
    if (!this.ready || !this.module || !this.session || !this.outputPointer) return true

    try {
      const channels = outputs[0]
      const mono = channels?.[0]
      if (!mono) return true
      if (mono.length % ENGINE_BLOCK_FRAMES !== 0) {
        throw new Error(`AudioWorklet callback length ${mono.length} is not divisible by ${ENGINE_BLOCK_FRAMES}`)
      }

      for (let offset = 0; offset < mono.length; offset += ENGINE_BLOCK_FRAMES) {
        this.checkStatus(this.module._fm1_msfa_session_render64(this.session, this.outputPointer), 'render64')
        const firstSample = this.outputPointer / Float32Array.BYTES_PER_ELEMENT
        mono.set(this.module.HEAPF32.subarray(firstSample, firstSample + ENGINE_BLOCK_FRAMES), offset)
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

registerProcessor(PROCESSOR_NAME, Fm1MsfaOneVoiceProcessor)
