export interface WebsiteCatalogBank {
  filename: string
  label: string
  category: string
  remoteUrl: string
  mirrorPath: string
  voices?: readonly string[]
}

const factory = [
  ['rom1a.syx', 'ROM1A Master (EU/JP)'],
  ['rom1b.syx', 'ROM1B Keyboard & Plucked'],
  ['rom2a.syx', 'ROM2A Orchestral & Percussive'],
  ['rom2b.syx', 'ROM2B Synth, Complex & Effects'],
  ['rom3a.syx', 'ROM3A Master (US)'],
  ['rom3b.syx', 'ROM3B Keyboard & Plucked'],
  ['rom4a.syx', 'ROM4A Orchestral & Percussive'],
  ['rom4b.syx', 'ROM4B Synth, Complex & Effects'],
] as const

const vrcLabels: Readonly<Record<string, string>> = {
  '101': 'Keyboard, Plucked & Tuned Percussion',
  '102': 'Wind Instruments',
  '103': 'Sustain',
  '104': 'Percussion',
  '105': 'Sound Effects',
  '106': 'Synthesizer',
  '107': 'David Bristow Selection',
  '108': 'Gary Leuenberger Selection',
  '109': 'Studio 64',
  '110': 'Bo Tomlyn Selection',
  '111': 'Bo Tomlyn Selection II',
  '112': 'Live 64 — Akira Inoue',
}

const websiteOnlyVoices: Readonly<Record<string, readonly string[]>> = {
  'rom3a.syx': ['FLUTE 1', 'HARPSICH 1', 'STRG ENS 1', 'BRIGHT BOW', 'BRASSHORNS', 'BR TRUMPET', 'MARIMBA', 'E.PIANO 1', 'PIANO 1', 'PIPES 1', 'E.ORGAN 1', 'E.BASS 1', 'CLAV 1', 'HARMONICA1', 'JAZZ GUIT1', 'PRC SYNTH1', 'SAX BC', 'FRETLESS 1', 'HARP 1', 'TIMPANI', 'HEAVYMETAL', 'STEEL DRUM', 'SYN-LEAD 1', 'VOICES BC', 'CLAV ENS', 'LASERSWEEP', 'TUB ERUPT', 'GRAND PRIX', 'REFS WHISL', 'TRAIN', 'BRASS S H', 'TAKE OFF'],
  'rom3b.syx': ['PIANO 2', 'E.GRAND 1', 'E.GRAND 2', 'HONKY TONK', 'E.PIANO 2', 'E.PIANO 3', 'E.PIANO 4', 'CELESTE', 'FUNK CLAV', 'CLAV ENS 2', 'PERC CLAV', 'HARPSICH 2', 'E.ORGAN 2', 'E.ORGAN 3', '60-S ORGAN', 'PIPES 2', 'PIPES 3', 'CALIOPE', 'ACCORDION', 'TOY PIANO', 'SITAR', 'KOTO', 'JAZZ GUIT2', 'SPANISHGTR', 'FOLK GUIT', 'LUTE', 'BANJO', 'CLAS.GUIT', 'HARP 2', 'E.BASS 2', 'FRETLESS 2', 'PLUCK BASS'],
  'rom4a.syx': ['PICCOLO', 'FLUTE 2', 'OBOE', 'CLARINET', 'BASSOON', 'PAN FLUTE', 'LEAD BRASS', 'HORNS', 'SOLO TBONE', 'BRASS BC', 'BRASS 5THS', 'SYNTHBRASS', 'STRG QRT 1', 'STRG ENS 2', 'VIOLA SECN', 'STRGS LOW', 'HIGH STRGS', 'PIZZ STGS', 'STG CRSNDO', 'STGS 5THS', 'BELLS', 'TUB BELLS', 'RECORDERS', 'CHIMES', 'VOICES', 'XYLOPHONE', 'COWBELL', 'WOOD BLOCK', 'FLEXATONE', 'LOG DRUM', 'GLOKENSPL', 'VIBE'],
  'rom4b.syx': ['CLAV-E.PNO', 'PERC BRASS', 'PRC SYNTH2', 'HARPSI-STG', 'CHIME-STRG', 'HARP-FLUTE', 'BELL-FLUTE', 'STRG-CHIME', 'STRG-MARIM', 'STRG-PIZZT', 'ORCHESTRA', 'LEAD GUITR', 'PIANO-BRS', 'BRS-CHIME', 'B.DRM-SNAR', 'E.P-BRS BC', 'ORG-BRS BC', 'CLV-BRS BC', 'WHISTLES', 'FILTER SWP', 'FUNKY RISE', 'WILD BOAR', 'SHIMMER', 'EVOLUTION', 'WATER GDN', 'WASP STING', 'MULTI NOTE', 'DESCENT', 'OCTAVE WAR', '..GOTCHA..', 'ST.HELENS', 'EXPLOSION'],
  '2.syx': ['KICK-SNRC2', 'TOMS C3-C4', 'SNARE SNAP', 'SNARE SHOT', 'OPEN HIHAT', 'CLOSE HAT', 'BASS DRUM1', 'BASS DRUM2', 'W.BLOCK 1', 'FINGER CLP', 'AGOGO', 'CASTENET', 'HARD TAMB', 'SOFT TAMB', 'TRIANGLE', 'TIMBALI', 'CONGABONGO', 'CONGADRUM', 'SQUARES 1', 'COOL VIBES', 'STAC.HEAV1', 'BONGO 2', 'SAX KS 1.4', 'MARACAS', 'ROCKIN...B', 'TAMBOURIN2', 'WARMKS1...', 'JX-10 1', 'CASCADE 21', 'SLOW3D PAD', 'MIRIDOR 1', 'CASCADE 21'],
  '5.syx': ['REAL>TINE', 'ICECAVES', '2001 BELL.', 'WET-COMP 2', '155SEC.EFX', "LYLE'S II", 'ORCH.POWER', 'TITEGUITAR', 'SUMMER II', 'HOJO B...', 'YES-TALK.', '-A- TALK.', 'YAMATALK-A', 'YAMATALK-B', 'YAMATALK-C', '-D- TALK.', 'WARMKS1...', 'SAX KS 1.4', 'HOJO B...', 'PWR-GUITAR', '*DLECTRIX*', 'HARMO KS-1', 'CLAVINEAT1', 'GUIT PHAS2', 'ICE2REV 5A', 'ANNA PAD 1', 'CLAREBELL1', 'ROE BEAR', 'SIMMONS4MF', 'HAMMERED4', 'BIG BASSS3', 'HI-HAT 1'],
  '7.syx': ['TRIANGLE 1', 'TRIANGLE 2', 'SNARE SNP1', 'WINDCHIME2', 'CRASHER 1', 'CRASHER 2', 'HI-HAT 1', 'HI-HAT 2', 'COWBELL 1', 'COWBELL 2', 'AGOGOBELL1', 'AGOGOBELL2', 'SHAKER', 'MARACAS', 'SAMBA WHS.', 'ACMESIREN', 'QUIJADA', 'TIMPANI 1', 'TIMPANI 2', 'SLEIGHBELL', 'FLEXATONE', 'CHINA GONG', 'SYN.GONG', 'MARACAS 1', 'TABLA 2', 'ECHO TOMS', 'GLASSHARP1', 'GLASSHARP2', 'GAMELAN 1', 'GAMELAN 2', 'TOMSWEEP', 'BOINGO'],
}

function createBank(filename: string, label: string, category: string, relativePath: string): WebsiteCatalogBank {
  return {
    filename,
    label,
    category,
    remoteUrl: `https://yamahablackboxes.com/patches/dx7/${relativePath}`,
    mirrorPath: `catalog/yamaha-black-boxes/${relativePath}`,
    ...(websiteOnlyVoices[filename] ? { voices: websiteOnlyVoices[filename] } : {}),
  }
}

export const YAMAHA_BLACK_BOXES_BANKS: readonly WebsiteCatalogBank[] = [
  ...factory.map(([filename, label]) => createBank(filename, label, 'Factory', `factory/${filename}`)),
  ...Object.entries(vrcLabels).flatMap(([number, label]) => ['a', 'b'].map((side) => {
    const filename = `vrc${number}${side}.syx`
    return createBank(filename, `VRC${number}${side.toUpperCase()} — ${label}`, 'VRC Voice ROM', `vrc/${filename}`)
  })),
  ...['2', '5', '7'].map((disk) => createBank(`${disk}.syx`, `GreyMatter E! Card — Disk #${disk}`, 'GreyMatter E! Card', `greymatter/${disk}.syx`)),
]
