export interface ExternalCatalogSource {
  id: string
  name: string
  description: string
  url: string
  attribution: string
  licenseNote: string
}

export const externalCatalogSources: readonly ExternalCatalogSource[] = [
  {
    id: 'yamaha-black-boxes-dx7',
    name: 'Yamaha Black Boxes — DX7 patches',
    description: 'Browse the provider collection, download a permitted SysEx file, then import it into the local FM1 Editor library.',
    url: 'https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/',
    attribution: 'Yamaha Black Boxes',
    licenseNote: 'Rights and usage terms remain with the source and individual patch authors. FM1 Editor does not mirror or redistribute the files.',
  },
]
