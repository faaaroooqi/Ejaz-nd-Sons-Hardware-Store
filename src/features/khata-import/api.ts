import { supabase } from '@/lib/supabase'
import type { PartyType, ScannedEntry, buildPostPayload } from './lib'

export interface KhataImportRecord {
  id: string
  import_number: string
  party_type: PartyType
  title: string | null
  source_files: string[] | null
  total_lines: number
  total_charges: number
  total_payments: number
  total_net: number
  posted_at: string
  posted_by: string | null
  status: 'posted' | 'reversed'
  reversal_of: string | null
  reversal_reason: string | null
  created_at: string
}

export interface KhataImportLineRecord {
  id: string
  import_id: string
  line_no: number
  party_type: PartyType
  customer_id: string | null
  supplier_id: string | null
  entry_date: string
  description: string
  charge: number
  payment: number
  customer_ledger_entry_id: string | null
  supplier_ledger_entry_id: string | null
  is_reversed: boolean
  customer?: { id: string; name: string; phone?: string | null } | null
  supplier?: { id: string; name: string; phone?: string | null } | null
}

export interface ScanResult {
  page_title: string | null
  notes: string | null
  entries: ScannedEntry[]
  is_sample?: boolean
}

export const SAMPLE_KHATA_SCANS: Record<PartyType, ScanResult> = {
  customer: {
    page_title: 'محمد طارق ہارڈویئر (Tariq Hardware)',
    notes: 'صفحہ نمبر 14 - پرانا ادھار کھاتہ (Page 14 - Old Credit Ledger)',
    is_sample: true,
    entries: [
      {
        party_name: 'Tariq Hardware',
        date: '2026-01-10',
        description: 'پچھلا بقایا (B/F)',
        charge: 25000,
        payment: 0,
        written_balance: 25000,
        is_balance_forward: true,
        uncertain: false,
      },
      {
        party_name: 'Tariq Hardware',
        date: '2026-01-15',
        description: '1/2 inch PVC pipe 20 bundles + socket',
        charge: 18500,
        payment: 0,
        written_balance: 43500,
        is_balance_forward: false,
        uncertain: false,
      },
      {
        party_name: 'Tariq Hardware',
        date: '2026-01-22',
        description: 'نقد وصول بذریعہ جاوید (Cash received)',
        charge: 0,
        payment: 20000,
        written_balance: 23500,
        is_balance_forward: false,
        uncertain: false,
      },
      {
        party_name: 'Tariq Hardware',
        date: '2026-01-28',
        description: 'Brass gate valves 1 inch x 12 pcs',
        charge: 9600,
        payment: 0,
        written_balance: 33100,
        is_balance_forward: false,
        uncertain: false,
      },
    ],
  },
  supplier: {
    page_title: 'اتحاد اسٹیل ملز (Ittehad Steel Mills)',
    notes: 'کھاتہ نمبر 4 - سامان خریداری اور ادائیگیاں (Ledger 4 - Purchases & Payments)',
    is_sample: true,
    entries: [
      {
        party_name: 'Ittehad Steel Mills',
        date: '2026-01-05',
        description: 'پچھلا بقایا (Brought Forward)',
        charge: 85000,
        payment: 0,
        written_balance: 85000,
        is_balance_forward: true,
        uncertain: false,
      },
      {
        party_name: 'Ittehad Steel Mills',
        date: '2026-01-12',
        description: 'G.I. Wire 16 gauge 10 bundles',
        charge: 42000,
        payment: 0,
        written_balance: 127000,
        is_balance_forward: false,
        uncertain: false,
      },
      {
        party_name: 'Ittehad Steel Mills',
        date: '2026-01-20',
        description: 'بینک ٹرانسفر ادائیگی (Bank transfer payment)',
        charge: 0,
        payment: 50000,
        written_balance: 77000,
        is_balance_forward: false,
        uncertain: false,
      },
      {
        party_name: 'Ittehad Steel Mills',
        date: '2026-01-26',
        description: 'Hex nuts & bolts 1/2 x 2 inch (5 bags)',
        charge: 16500,
        payment: 0,
        written_balance: 93500,
        is_balance_forward: false,
        uncertain: false,
      },
    ],
  },
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      // Strip data:image/...;base64,
      const comma = res.indexOf(',')
      resolve(comma >= 0 ? res.substring(comma + 1) : res)
    }
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

export async function scanKhataPage(params: {
  file?: File | null
  partyType: PartyType
  knownParties?: string[]
  useSample?: boolean
}): Promise<ScanResult> {
  if (params.useSample || !params.file) {
    return SAMPLE_KHATA_SCANS[params.partyType]
  }

  const base64 = await fileToBase64(params.file)
  const mimeType = params.file.type || 'image/jpeg'

  try {
    const { data, error } = await supabase.functions.invoke('khata-scan', {
      body: {
        image_base64: base64,
        mime_type: mimeType,
        party_type: params.partyType,
        known_parties: params.knownParties || [],
      },
    })

    if (error) {
      console.warn('Edge function invoke returned error:', error)
      throw new Error(error.message || 'Error processing khata image via AI Vision.')
    }

    if (data?.error) {
      if (data.code === 'OCR_NOT_CONFIGURED') {
        throw new Error(
          'GEMINI_API_KEY is not configured in Supabase Edge Functions. You can still use "Manual Entry" or "Try Sample Khata" to import records!',
        )
      }
      throw new Error(data.error)
    }

    return {
      page_title: data.page_title ?? null,
      notes: data.notes ?? null,
      entries: Array.isArray(data.entries) ? data.entries : [],
    }
  } catch (err: any) {
    console.error('scanKhataPage failed:', err)
    throw err
  }
}

export async function fetchKhataImports(): Promise<KhataImportRecord[]> {
  const { data, error } = await (supabase as any)
    .from('khata_imports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchKhataImportDetails(id: string): Promise<{
  importRecord: KhataImportRecord
  lines: KhataImportLineRecord[]
}> {
  const { data: importRecord, error: importErr } = await (supabase as any)
    .from('khata_imports')
    .select('*')
    .eq('id', id)
    .single()

  if (importErr) throw importErr

  const { data: lines, error: linesErr } = await (supabase as any)
    .from('khata_import_lines')
    .select(`
      *,
      customer:customers(id, name, phone),
      supplier:suppliers(id, name, phone)
    `)
    .eq('import_id', id)
    .order('line_no', { ascending: true })

  if (linesErr) throw linesErr

  return {
    importRecord,
    lines: lines || [],
  }
}

export interface PostKhataImportResult {
  import_id: string
  import_number: string
  total_lines: number
  total_charges: number
  total_payments: number
  total_net: number
  customers_updated: number
  suppliers_updated: number
}

export async function postKhataImport(
  payload: ReturnType<typeof buildPostPayload>,
  force = false,
): Promise<PostKhataImportResult> {
  const { data, error } = await (supabase as any).rpc('post_khata_import', {
    p_payload: payload,
    p_force: force,
  })

  if (error) throw error
  return data as PostKhataImportResult
}

export interface UndoKhataImportResult {
  reversed_import_id: string
  reversal_import_id: string
  reversal_import_number: string
  lines_reversed: number
  charges_reversed: number
  payments_reversed: number
}

export async function undoKhataImport(
  importId: string,
  reason?: string,
): Promise<UndoKhataImportResult> {
  const { data, error } = await (supabase as any).rpc('undo_khata_import', {
    p_import_id: importId,
    p_reason: reason?.trim() || null,
  })

  if (error) throw error
  return data as UndoKhataImportResult
}
