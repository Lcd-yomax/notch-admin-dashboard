// Types of api.mobileapi.dev responses, based on lib/mobileapi/__fixtures__/galaxy-a55.json.
// Every field may be missing or null on other devices. "id" keys and "*_parsed" keys are ignored.

type Text = string | null | undefined

export interface MobileApiSearchDevice {
  id: number
  match_certainty?: Text
  name: string
  manufacturer_name?: Text
  release_date?: Text
  image_b64?: Text
  storage?: Text
  colors?: Text
}

export interface MobileApiSearchResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  devices: MobileApiSearchDevice[]
}

export interface MobileApiDevice {
  id: number
  name: string
  manufacturer?: { name?: Text } | null
  manufacturer_name?: Text
  colors?: Text
  storage?: Text
  screen_resolution?: Text
  weight?: Text
  thickness?: Text
  release_date?: Text
  camera?: Text
  battery_capacity?: Text
  hardware?: Text
  network?: {
    technology?: Text
    bands_2g?: Text
    bands_3g?: Text
    bands_4g?: Text
    bands_5g?: Text
    speed?: Text
  } | null
  body?: {
    dimensions?: Text
    weight?: Text
    build?: Text
    sim?: Text
    other?: Text
  } | null
  display?: {
    type?: Text
    size?: Text
    resolution?: Text
    protection?: Text
    other?: Text
  } | null
  platform?: {
    os?: Text
    chipset?: Text
    cpu?: Text
    gpu?: Text
  } | null
  memory?: {
    card_slot?: Text
    internal?: Text
    other?: Text
  } | null
  main_camera?: { modules?: Text; features?: Text; video?: Text } | null
  selfie_camera?: { modules?: Text; features?: Text; video?: Text } | null
  sound?: { loudspeaker?: Text; audio_jack?: Text } | null
  comms?: {
    wlan?: Text
    bluetooth?: Text
    positioning?: Text
    nfc?: Text
    radio?: Text
    usb?: Text
  } | null
  features?: { sensors?: Text; other?: Text } | null
  battery?: {
    type?: Text
    capacity_mah?: number | string | null
    charging?: Text
  } | null
}

/** One product_specs row produced by the import (label_ar / value_ar stay empty) */
export interface ImportedSpec {
  group_name: string
  label: string
  value: string
  sort_order: number
}

export interface ImportedVariant {
  storage_gb: number
  ram_gb: number | null
}

export interface ImportedColor {
  /** Name from MobileAPI, e.g. "Iceblue" */
  original: string
  /** Prefilled French name, e.g. "Bleu glacier" */
  fr: string
}

/** What the details route sends to the browser (never the raw response) */
export interface MobileApiPreview {
  device_id: string
  name: string
  manufacturer: string | null
  specs: ImportedSpec[]
  variants: ImportedVariant[]
  colors: ImportedColor[]
}

export interface MobileApiSearchResult {
  id: string
  name: string
  manufacturer_name: string | null
  release_year: string | null
  match_certainty: string | null
  image_b64: string | null
  /** From the flat storage field: price fields shown before the details call */
  storages: number[]
  /** French color names */
  colors: string[]
}
