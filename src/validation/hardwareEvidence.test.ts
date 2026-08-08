import { describe, expect, it } from 'vitest'
import type { MidiMonitorEntry } from '../midi/monitor'
import {
  createEmptyHardwareChecks,
  hardwareEvidenceOutstandingChecks,
  summarizeHardwareMidiCapture,
} from './hardwareEvidence'

function entry(direction: 'in' | 'out', data: readonly number[], timestamp: number, portName: string): MidiMonitorEntry {
  return {
    id: `${direction}-${timestamp}-${data.length}`,
    timestamp,
    direction,
    portId: `${portName}-id`,
    portName,
    data,
    summary: 'fixture',
  }
}

function yamahaBank(): number[] {
  const data = new Array<number>(4104).fill(0)
  data[0] = 0xf0
  data[1] = 0x43
  data[2] = 0x00
  data[3] = 0x09
  data[4] = 0x20
  data[5] = 0x00
  data[4103] = 0xf7
  return data
}

function yamahaSingleVoice(): number[] {
  const data = new Array<number>(163).fill(0)
  data[0] = 0xf0
  data[1] = 0x43
  data[2] = 0x00
  data[3] = 0x00
  data[4] = 0x01
  data[5] = 0x1b
  data[162] = 0xf7
  return data
}

describe('hardware validation evidence', () => {
  it('summarizes physical-session MIDI without duplicating raw capture bytes', () => {
    const entries = [
      entry('out', yamahaBank(), 100, 'FM-1 MIDI'),
      entry('out', yamahaSingleVoice(), 200, 'FM-1 MIDI'),
      entry('out', [0x90, 60, 100], 300, 'FM-1 MIDI'),
      entry('in', [0xf0, 0x43, 0x01, 0x02, 0xf7], 400, 'FM-1 MIDI IN'),
      entry('in', [0x80, 60, 0], 500, 'FM-1 MIDI IN'),
    ]

    expect(summarizeHardwareMidiCapture(entries)).toEqual({
      messageCount: 5,
      inputCount: 2,
      outputCount: 3,
      sysexInputCount: 1,
      sysexOutputCount: 2,
      yamahaBankOutputCount: 1,
      yamahaSingleVoiceOutputCount: 1,
      sysexInputLengths: { '5': 1 },
      sysexOutputLengths: { '163': 1, '4104': 1 },
      inputPorts: ['FM-1 MIDI IN'],
      outputPorts: ['FM-1 MIDI'],
      firstTimestamp: 100,
      lastTimestamp: 500,
    })
  })

  it('keeps every physical protocol check pending until a tester records evidence', () => {
    const checks = createEmptyHardwareChecks()
    const outstanding = hardwareEvidenceOutstandingChecks(checks)
    expect(outstanding.length).toBeGreaterThan(10)
    expect(outstanding).toContain('bank-destination-prompt')
    expect(outstanding).toContain('dump-completion-signal')
    expect(outstanding).toContain('audio-saved-wav')
    expect(outstanding).toContain('browser-note-off-recovery')
    expect(outstanding).toContain('browser-channel-selection')
    expect(outstanding).toContain('sequencer-protocol')

    checks['audio-saved-wav'] = { status: 'fail', notes: 'Recorded file was silent.' }
    expect(hardwareEvidenceOutstandingChecks(checks)).not.toContain('audio-saved-wav')
    expect(hardwareEvidenceOutstandingChecks(checks)).toContain('browser-note-off-recovery')
    expect(hardwareEvidenceOutstandingChecks(checks)).toContain('browser-channel-selection')
    expect(hardwareEvidenceOutstandingChecks(checks)).toContain('sequencer-protocol')
  })
})
