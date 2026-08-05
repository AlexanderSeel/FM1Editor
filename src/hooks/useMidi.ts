import { useCallback, useEffect, useMemo, useState } from 'react'
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

function listPorts<T extends MIDIPort>(ports: MIDIPortMap<T>): MidiPortInfo[] {
  return Array.from(ports.values(), describePort).sort((a, b) => a.name.localeCompare(b.name))
}

export function useMidi() {
  const support = useMemo(getMidiSupport, [])
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [permission, setPermission] = useState<MidiPermissionState>('idle')
  const [inputs, setInputs] = useState<MidiPortInfo[]>([])
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([])
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null)
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshPorts = useCallback((midiAccess: MIDIAccess) => {
    const nextInputs = listPorts(midiAccess.inputs)
    const nextOutputs = listPorts(midiAccess.outputs)

    setInputs(nextInputs)
    setOutputs(nextOutputs)
    setSelectedInputId((current) =>
      current && nextInputs.some((port) => port.id === current) ? current : (nextInputs[0]?.id ?? null),
    )
    setSelectedOutputId((current) =>
      current && nextOutputs.some((port) => port.id === current) ? current : (nextOutputs[0]?.id ?? null),
    )
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

  useEffect(() => {
    if (!access) return

    const handleStateChange = () => refreshPorts(access)
    access.addEventListener('statechange', handleStateChange)
    return () => access.removeEventListener('statechange', handleStateChange)
  }, [access, refreshPorts])

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
    connect,
    setSelectedInputId,
    setSelectedOutputId,
  }
}
