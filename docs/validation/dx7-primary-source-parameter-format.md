# Yamaha DX7 primary-source parameter format

Primary source: Yamaha DX7 Operating Manual, MIDI Data Format, pages 30–32 (`DX7E1.pdf` in Yamaha's official manual library).

## Verified parameter-change frame

The original Yamaha table defines parameter change format 1-2-4 as:

```text
F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7
```

- `n`: zero-based MIDI channel 0–15
- `g = 0`: DX common voice parameter group
- `g = 2`: DX7 function parameter group
- the low two bits of the group byte carry the high two parameter-number bits
- the next byte carries the low seven parameter-number bits
- data is seven-bit

This repository now encodes only documented DX7 function parameters 64–77 through the selected DX7 target. Each parameter uses the semantic range printed by Yamaha, requires an explicit session enable confirmation and a parameter-specific confirmation before transmission.

DX7 voice-parameter writes remain disabled until every editor field is mapped to parameters 0–155 with the same semantic guarantees.

## Dump-request decision

The original MIDI Data Format defines transmission and reception formats for one-voice and 32-voice bulk data. It does not define a programmatic single-voice or bank dump-request frame for the stock DX7.

The application therefore constructs no dump-request message. Voice and bank dumps must continue to be initiated from the DX7 front panel unless a later primary Yamaha source proves another supported request workflow.

## Hardware boundary

Software encoding is not physical-device validation. Stock DX7 reception still requires hardware verification with matching MIDI channel, System Info available, Memory Protect off and recovery testing after interrupted operations.
