import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMidiMonitorEntry, type MidiMonitorEntry } from '../midi/monitor'
import type { MidiOutputTarget } from '../midi/output'
import {
  choosePreferredPort,
  createMidiPortPreference,
  type MidiPortPreference,
} from '../midi/portPreferences'
import { describePort, getMidiSupport, requestSysexMidiAccess, type MidiPortInfo } from '../midi/webMidi'

export type MidiPermissionState = 'idle' | 'requesting' | 'granted' | 'denied'

export interface MidiState {
  support: ReturnType<typeof getMidiSupport>
  permission: MidiPermissionState
  sysexEnabled: boolean
  inputs: MidiPortInfo[]
  outputs: MidiPortInfo[]
  selectedInputId: string | null
  selectedOutputId: string | null
  error: string | null
}

const INPUT_PREFERENCE_KEY = 'fm1-editor.midi.input'
const OUTPUT_PREFERENCE_KEY = 'fm1-editor.midi.output'
const MONITOR_LIMIT = 1000

function readPreference(key: string): MidiPortPreference | null {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<MidiPortPreference>
    return typeof parsed.id === 'string' && typeof parsed.name === 'string' && typeof parsed.manufacturer === 'string'
      ? { id: parsed.id, name: parsed.name, manufacturer: parsed.manufacturer }
      : null
  } catch {
    return null
  }
}

function writePreference(key: string, preference: MidiPortPreference | null): void {
  try {
    if (preference) localStorage.setItem(key, JSON.stringify(preference))
    else localStorage.removeItem(key)
  } catch {
    // Port persistence is optional; MIDI access remains usable when storage is blocked.
  }
}

export function useMidi() {
  const support = useMemo(getMidiSupport, [])
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [permission, setPermission] = useState<MidiPermissionState>('idle')
  const [inputs, setInputs] = useState<MidiPortInfo[]>([])
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([])
  const [selectedInputId, setSelectedInputIdState] = useState<string | null>(null)
  const [selectedOutputId, setSelectedOutputIdState] = useState<string | null>(null)
  const [monitorEntries, setMonitorEntries] = useState<readonly MidiMonitorEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const appendMonitorEntry = useCallback((entry: MidiMonitorEntry) => {
    setMonitorEntries((current) => [...current, entry].slice(-MONITOR_LIMIT))
  }, [])

  const clearMonitor = useCallback(() => setMonitorEntries([]), [])

  const refreshPorts = useCallback((midiAccess: MIDIAccess) => {
    const nextInputs = Array.from(midiAccess.inputs.values(), describePort)
      .sort((left, right) => left.name.localeCompare(right.name))
    const nextOutputs = Array.from(midiAccess.outputs.values(), describePort)
      .sort((left, right) => left.name.localeCompare(right.name))

    setInputs(nextInputs)
    setOutputs(nextOutputs)
    setSelectedInputIdState((current) => choosePreferredPort(nextInputs, current, readPreference(INPUT_PREFERENCE_KEY)))
    setSelectedOutputIdState((current) => choosePreferredPort(nextOutputs, current, readPreference(OUTPUT_PREFERENCE_KEY)))
  }, [])

  const connect = useCallback(async () => {
    if (!support.supported) {
      setError(support.reason)
      return
    }

    setPermission('requesting')
    setError(null)

    try {
      const nextAccess = await requestSysexMidiAccess()
      setAccess(nextAccess)
      setPermission('granted')
      refreshPorts(nextAccess)
    } catch (cause) {
      setPermission('denied')
      setError(cause instanceof Error ? cause.message : 'MIDI permission was not granted.')
    }
  }, [refreshPorts, support])

  const setSelectedInputId = useCallback((id: string | null) => {
    setSelectedInputIdState(id)
    const port = inputs.find((candidate) => candidate.id === id)
    writePreference(INPUT_PREFERENCE_KEY, port ? createMidiPortPreference(port) : null)
  }, [inputs])

  const setSelectedOutputId = useCallback((id: string | null) => {
    setSelectedOutputIdState(id)
    const port = outputs.find((candidate) => candidate.id === id)
    writePreference(OUTPUT_PREFERENCE_KEY, port ? createMidiPortPreference(port) : null)
  }, [outputs])

  useEffect(() => {
    if (!access) return

    const handleStateChange = () => refreshPorts(access)
    access.addEventListener('statechange', handleStateChange)
    return () => access.removeEventListener('statechange', handleStateChange)
  }, [access, refreshPorts])

  useEffect(() => {
    if (!access || !selectedInputId) return
    const input = access.inputs.get(selectedInputId)
    if (!input) return

    const handleMessage = (event: MIDIMessageEvent) => {
      if (!event.data) return
      appendMonitorEntry(createMidiMonitorEntry('in', input, event.data))
    }
    input.addEventListener('midimessage', handleMessage)
    void input.open().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'The selected MIDI input could not be opened.')
    })
    return () => input.removeEventListener('midimessage', handleMessage)
  }, [access, appendMonitorEntry, selectedInputId])

  const output = useMemo<MidiOutputTarget | null>(() => {
    if (!access || !selectedOutputId) return null
    const port = access.outputs.get(selectedOutputId)
    if (!port) return null
    const clearablePort = port as MIDIOutput & { clear?: () => void }

    return {
      id: port.id,
      name: port.name,
      open: () => port.open(),
      send: (data, timestamp) => {
        const bytes = Uint8Array.from(data)
        if (timestamp === undefined) port.send(bytes)
        else port.send(bytes, timestamp)
        appendMonitorEntry(createMidiMonitorEntry('out', port, bytes))
      },
      ...(typeof clearablePort.clear === 'function'
        ? { clear: () => { clearablePort.clear?.() } }
        : {}),
    }
  }, [access, appendMonitorEntry, selectedOutputId])

  return {
    state: {
      support,
      permission,
      sysexEnabled: access?.sysexEnabled ?? false,
      inputs,
      outputs,
      selectedInputId,
      selectedOutputId,
      error,
    } satisfies MidiState,
    access,
    output,
    monitorEntries,
    clearMonitor,
    connect,
    setSelectedInputId,
    setSelectedOutputId,
  }
}
