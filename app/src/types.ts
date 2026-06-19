// Core schema + state types for תיק אתר אינטראקטיבי

export type FieldType = 'text' | 'textarea' | 'date' | 'select' | 'ip' | 'email' | 'status'

export interface Field {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]
}

export interface Column {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]
}

export type Row = Record<string, string> // includes optional _id

export type Block =
  | { kind: 'subhead'; text: string; optional?: boolean; id?: string }
  | { kind: 'note'; text: string }
  | { kind: 'bullets'; title?: string; items: string[] }
  | { kind: 'kv'; id: string; fields: Field[]; optional?: boolean }
  | { kind: 'table'; id: string; columns: Column[]; examples?: Row[]; seedRows?: Row[]; minRows?: number; optional?: boolean }
  | { kind: 'checklist'; id: string; rowHeader: string; columns: Column[]; rows: { id: string; label: string }[] }
  | { kind: 'box'; lines: string[] }
  | { kind: 'callout'; tone: 'info' | 'warn'; title: string; items: string[] }
  | { kind: 'image'; id: string; hint?: string; multi?: boolean }

export interface Section {
  id: string
  title: string
  note?: string
  blocks: Block[]
}

export interface Doc {
  sections: Section[]
}

// ---- runtime state ----
export interface SiteMeta {
  name: string
  code: string
  version: string
  classification: string
}

export type KvValues = Record<string, string>
export type ChecklistValues = Record<string, Record<string, string>>
export interface ImageItem {
  id: string
  name: string
  dataUrl: string
  type?: string
}
export type BlockValue = KvValues | Row[] | ChecklistValues | ImageItem[]

export interface SiteData {
  id: string
  createdAt: string
  updatedAt: string
  meta: SiteMeta
  values: Record<string, BlockValue>
  excluded?: { sections: string[]; subsections: string[] }
}

export interface AppState {
  sites: Record<string, SiteData>
  activeSiteId: string | null
  ui: { theme: 'light' | 'dark'; showExamples: boolean }
}

export const STATUS_OPTIONS = ['קיים', 'חלקי', 'חסר', 'לא רלוונטי'] as const
