import React, { useState, useId } from 'react'
import { useNavigate } from 'react-router'
import {
  Upload,
  Camera,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  UserCheck,
  UserPlus,
  Info,
  Sparkles,
  Loader2,
  BookOpen,
  DollarSign,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { useCustomers } from '@/features/customers/queries'
import { useSuppliers } from '@/features/suppliers/queries'
import {
  scannedToDraftLines,
  applyForwardRowPolicy,
  buildPartyChoice,
  newLineId,
  totalsFor,
  checkReadiness,
  buildPostPayload,
  fillMissingDates,
  reconcileLines,
  validateLine,
} from './lib'
import type { PartyType, DraftLine, PartyChoice, KnownParty } from './lib'
import { useScanKhata, usePostKhataImport } from './queries'
import { SAMPLE_KHATA_SCANS } from './api'

interface KhataImportWizardProps {
  onSuccessNavigate?: (importId: string) => void
}

type WizardStep = 1 | 2 | 3 | 4 | 5

export const KhataImportWizard: React.FC<KhataImportWizardProps> = ({ onSuccessNavigate }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>(1)
  const [partyType, setPartyType] = useState<PartyType>('customer')

  // Scanned / draft data
  const [sourceFileName, setSourceFileName] = useState<string>('')
  const [pageTitle, setPageTitle] = useState<string>('')
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [partyChoices, setPartyChoices] = useState<PartyChoice[]>([])
  const [importTitle, setImportTitle] = useState<string>('')
  const [importNotes, setImportNotes] = useState<string>('')
  const [forcePost, setForcePost] = useState<boolean>(false)

  // Success result
  const [postResult, setPostResult] = useState<any>(null)

  // Batch missing date setter
  const [batchDate, setBatchDate] = useState<string>('')

  // Queries & mutations
  const { data: rawCustomers = [] } = useCustomers()
  const { data: rawSuppliers = [] } = useSuppliers()
  const scanMutation = useScanKhata()
  const postMutation = usePostKhataImport()

  // Convert raw customers / suppliers to KnownParty list
  const knownParties: KnownParty[] = React.useMemo(() => {
    if (partyType === 'customer') {
      return (rawCustomers as any[]).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        phone: c.phone,
        balance: c.balance?.current_balance,
      }))
    } else {
      return (rawSuppliers as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        company_name: s.company_name,
        phone: s.phone,
        balance: s.balance?.current_balance,
      }))
    }
  }, [partyType, rawCustomers, rawSuppliers])

  // Handle file selection & scanning
  const handleScanFile = async (file: File) => {
    try {
      setSourceFileName(file.name)
      const res = await scanMutation.mutateAsync({
        file,
        partyType,
        knownParties: knownParties.map((p) => p.name),
      })
      processScanResult(res, file.name)
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan image. You can try sample data or manual entry.')
    }
  }

  // Handle 1-click sample scan
  const handleLoadSample = (type: PartyType) => {
    setPartyType(type)
    const sample = SAMPLE_KHATA_SCANS[type]
    processScanResult(sample, `Sample_${type}_Khata_Page.jpg`)
    toast.success(`Loaded sample ${type === 'customer' ? 'Customer (Lena)' : 'Supplier (Dena)'} khata record!`)
  }

  // Handle manual entry without scanning
  const handleStartManual = () => {
    setSourceFileName('Manual Entry (دستی اندراج)')
    setPageTitle('')
    const initialLine: DraftLine = {
      id: newLineId(),
      partyKey: 'manual_party',
      date: new Date().toISOString().split('T')[0],
      description: 'پرانا بقایا (Old ledger balance)',
      kind: 'charge',
      amount: '',
      writtenBalance: null,
      isForward: false,
      uncertain: false,
      include: true,
      source: 'manual',
      page: null,
    }
    setDraftLines([initialLine])
    setPartyChoices([
      {
        key: 'manual_party',
        scannedName: 'New Party',
        mode: 'new',
        partyId: null,
        newName: '',
        phone: '',
        suggestionId: null,
        suggestionScore: 0,
      },
    ])
    setStep(2)
  }

  const processScanResult = (scan: typeof SAMPLE_KHATA_SCANS['customer'], fileName: string) => {
    setPageTitle(scan.page_title || '')
    if (scan.notes) {
      setImportNotes(scan.notes)
    }
    setImportTitle(`${partyType === 'customer' ? 'Customer' : 'Supplier'} Khata - ${fileName}`)

    const lines = scannedToDraftLines(scan.entries, 0)
    const policyLines = applyForwardRowPolicy(lines)
    setDraftLines(policyLines)

    // Build party choices for each unique party detected
    const detectedPartyNames = Array.from(new Set(scan.entries.map((e) => e.party_name || scan.page_title || 'Unnamed Party')))
    const choices = detectedPartyNames.map((name) => buildPartyChoice(name, knownParties))
    setPartyChoices(choices)

    setStep(2)
  }

  // Add a new row in Review step
  const handleAddRow = () => {
    const defaultPartyKey = partyChoices[0]?.key || ''
    const newLine: DraftLine = {
      id: newLineId(),
      partyKey: defaultPartyKey,
      date: new Date().toISOString().split('T')[0],
      description: '',
      kind: 'charge',
      amount: '',
      writtenBalance: null,
      isForward: false,
      uncertain: false,
      include: true,
      source: 'manual',
      page: null,
    }
    setDraftLines((prev) => [...prev, newLine])
  }

  // Remove a row
  const handleDeleteRow = (id: string) => {
    setDraftLines((prev) => prev.filter((l) => l.id !== id))
  }

  // Update a line field
  const handleUpdateLine = (id: string, updates: Partial<DraftLine>) => {
    setDraftLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  // Reconcile calculation
  const mismatches = React.useMemo(() => reconcileLines(draftLines), [draftLines])
  const totals = React.useMemo(() => totalsFor(draftLines), [draftLines])
  const readiness = React.useMemo(
    () => checkReadiness(draftLines, partyChoices),
    [draftLines, partyChoices]
  )

  // Handle final ledger post
  const handleConfirmPost = async () => {
    if (!readiness.ready) {
      toast.error('Please fix errors before posting.')
      return
    }

    try {
      const payload = buildPostPayload(partyType, draftLines, partyChoices, {
        title: importTitle,
        notes: importNotes,
        sourceFiles: sourceFileName ? [sourceFileName] : undefined,
      })

      const res = await postMutation.mutateAsync({ payload, force: forcePost })
      setPostResult(res)
      if (onSuccessNavigate) {
        onSuccessNavigate(res.import_id)
      }
      setStep(5)
      toast.success(`Khata import posted successfully as #${res.import_number}!`)
    } catch (err: any) {
      if (err.message && err.message.includes('DUPLICATE')) {
        toast.error('Possible duplicate entries detected in ledger. You can tick "Force post duplicate rows" if intended.')
      } else {
        toast.error(err.message || 'Failed to post khata import to ledger.')
      }
    }
  }

  const stepsHeader = [
    { num: 1, label: 'Upload or Select', labelUrdu: 'فائل یا فوٹو منتخب کریں' },
    { num: 2, label: 'Match Parties', labelUrdu: 'کھاتے دار کی شناخت' },
    { num: 3, label: 'Review & Edit Rows', labelUrdu: 'اندراجات کی جانچ' },
    { num: 4, label: 'Ledger Summary', labelUrdu: 'کھاتہ خلاصہ اور منظوری' },
  ]

  const fileInputId = useId()

  return (
    <div className="space-y-6">
      {/* Wizard Progress Stepper */}
      {step < 5 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stepsHeader.map((s) => {
              const isActive = step === s.num
              const isPassed = step > s.num
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 rounded-xl p-2.5 transition-all ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : isPassed
                      ? 'bg-muted/40 text-muted-foreground'
                      : 'opacity-40 text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{s.label}</p>
                    <p dir="rtl" className="font-urdu text-[11px] truncate text-primary/80">
                      {s.labelUrdu}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 1: Upload / Pick Khata Page */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Party Type Selector (Lena vs Dena) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-bold text-foreground">Select Ledger Account Type • کھاتہ کی قسم منتخب کریں</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose whether this khata belongs to Customers (who owe you) or Suppliers (whom you owe).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPartyType('customer')}
                className={`relative flex flex-col rounded-2xl border p-5 text-left transition-all ${
                  partyType === 'customer'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                    : 'border-border bg-background/50 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Customer Khata (Lena)</h3>
                      <span dir="rtl" className="font-urdu text-xs font-bold text-emerald-600">
                        کسٹمر کھاتہ (لینا)
                      </span>
                    </div>
                  </div>
                  {partyType === 'customer' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Records goods given on credit (charges) and money received from customers (payments).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPartyType('supplier')}
                className={`relative flex flex-col rounded-2xl border p-5 text-left transition-all ${
                  partyType === 'supplier'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                    : 'border-border bg-background/50 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Supplier Khata (Dena)</h3>
                      <span dir="rtl" className="font-urdu text-xs font-bold text-amber-600">
                        سپلائر کھاتہ (دینا)
                      </span>
                    </div>
                  </div>
                  {partyType === 'supplier' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Records goods bought on credit (charges) and payments made to suppliers (payments).
                </p>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center shadow-sm">
            <input
              id={fileInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleScanFile(file)
              }}
            />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Camera className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-base font-bold text-foreground">
              Take a Photo or Upload Scanned Khata Page
            </h3>
            <p dir="rtl" className="font-urdu mt-1 text-sm font-medium text-primary">
              پرانے کھاتے کے صفحے کی تصویر کھینچیں یا اپ لوڈ کریں
            </p>
            <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">
              Supports JPEG, PNG or WebP images. Works best in good lighting with all amounts and dates clearly visible.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor={fileInputId}
                className={`flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 ${
                  scanMutation.isPending ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Reading Khata Page... (اسکین جاری ہے)</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Select Photo from Device</span>
                  </>
                )}
              </label>

              <button
                type="button"
                onClick={handleStartManual}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span>Manual Entry Mode (بغیر تصویر کے لکھیں)</span>
              </button>
            </div>
          </div>

          {/* Quick 1-Click Samples for Easy Testing */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Want to test without a photo? Try a realistic sample in 1 click:</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleLoadSample('customer')}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500/10"
              >
                <span>Try Sample Customer Khata (طارق ہارڈویئر ادھار)</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('supplier')}
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500/10"
              >
                <span>Try Sample Supplier Khata (اتحاد اسٹیل ملز)</span>
              </button>
            </div>
          </div>

          {/* Safety & Ledger Invariant Card */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Safe Ledger-Only Import (محفوظ کھاتہ اندراج):</p>
                <p>
                  Old khata imports adjust customer/supplier running balances and statements accurately without altering
                  current warehouse stock or touching cash register drawer balances.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Match Parties */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Match Party Names • کھاتے دار کی تصدیق
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm who this ledger page belongs to. You can connect it to an existing account or automatically create a new party.
                </p>
              </div>
              {pageTitle && (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  Page Header: {pageTitle}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {partyChoices.map((choice, idx) => {
                const isExact = choice.mode === 'existing' && choice.partyId
                const isNew = choice.mode === 'new'
                return (
                  <div
                    key={choice.key || idx}
                    className="rounded-2xl border border-border bg-background/50 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          Detected in Khata: <span className="text-primary font-black">"{choice.scannedName}"</span>
                        </span>
                      </div>
                      {choice.suggestionScore >= 0.85 && (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          Auto-Matched (ملتا جلتا نام)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {/* Option 1: Existing Party */}
                      <button
                        type="button"
                        onClick={() =>
                          setPartyChoices((prev) =>
                            prev.map((c, i) =>
                              i === idx
                                ? { ...c, mode: 'existing', partyId: c.suggestionId || knownParties[0]?.id || null }
                                : c
                            )
                          )
                        }
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          isExact
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <UserCheck className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Existing Account</p>
                          <p className="text-[11px] text-muted-foreground">Select from app</p>
                        </div>
                      </button>

                      {/* Option 2: New Party */}
                      <button
                        type="button"
                        onClick={() =>
                          setPartyChoices((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, mode: 'new', partyId: null } : c))
                          )
                        }
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          isNew
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <UserPlus className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Create New Party</p>
                          <p className="text-[11px] text-muted-foreground">Auto-register in app</p>
                        </div>
                      </button>

                      {/* Option 3: Skip */}
                      <button
                        type="button"
                        onClick={() =>
                          setPartyChoices((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, mode: 'skip' } : c))
                          )
                        }
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          choice.mode === 'skip'
                            ? 'border-destructive bg-destructive/5 ring-1 ring-destructive'
                            : 'border-border bg-card hover:border-border'
                        }`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Skip this Name</p>
                          <p className="text-[11px] text-muted-foreground">Exclude all rows</p>
                        </div>
                      </button>
                    </div>

                    {/* Mode Configurations */}
                    {isExact && (
                      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Select {partyType === 'customer' ? 'Customer' : 'Supplier'} Account:
                        </label>
                        <select
                          value={choice.partyId || ''}
                          onChange={(e) =>
                            setPartyChoices((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, partyId: e.target.value } : c))
                            )
                          }
                          className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">-- Choose Party --</option>
                          {knownParties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.company_name ? `(${p.company_name})` : ''} {p.phone ? `• ${p.phone}` : ''}{' '}
                              {p.balance !== undefined ? `• Balance: Rs. ${p.balance.toLocaleString()}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isNew && (
                      <div className="rounded-xl border border-border bg-card p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Party Name:</label>
                          <input
                            type="text"
                            value={choice.newName}
                            onChange={(e) =>
                              setPartyChoices((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, newName: e.target.value } : c))
                              )
                            }
                            placeholder="Full Name / دکان کا نام"
                            className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Phone (Optional):</label>
                          <input
                            type="text"
                            value={choice.phone}
                            onChange={(e) =>
                              setPartyChoices((prev) =>
                                prev.map((c, i) => (i === idx ? { ...c, phone: e.target.value } : c))
                              )
                            }
                            placeholder="0300-1234567"
                            className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95"
              >
                <span>Continue to Review Rows</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Edit Entries */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Review & Edit Khata Entries • اندراجات کی تصدیق
              </h2>
              <p className="text-xs text-muted-foreground">
                Check dates and amounts against the book. Untick any row you do not want to import.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="bg-transparent text-xs text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!batchDate) {
                      toast.error('Choose a date first.')
                      return
                    }
                    setDraftLines((prev) => fillMissingDates(prev, batchDate))
                    toast.success('Filled missing dates!')
                  }}
                  className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                >
                  Fill Empty Dates
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-3 w-10 text-center">Include</th>
                  <th className="p-3 w-32">Date (تاریخ)</th>
                  <th className="p-3 min-w-[200px]">Particulars (تفصیل / مال)</th>
                  <th className="p-3 w-28">Type</th>
                  <th className="p-3 w-32">Amount (رقم)</th>
                  <th className="p-3 w-28">Book Balance</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {draftLines.map((line) => {
                  const mismatch = mismatches.get(line.id)
                  const issues = validateLine(line, mismatch)
                  const hasError = issues.some((i) => i.level === 'error')
                  const hasWarn = issues.some((i) => i.level === 'warning')

                  return (
                    <tr
                      key={line.id}
                      className={`transition-colors ${
                        !line.include
                          ? 'opacity-40 bg-muted/20 line-through'
                          : hasError
                          ? 'bg-rose-500/5'
                          : hasWarn
                          ? 'bg-amber-500/5'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={line.include}
                          onChange={(e) => handleUpdateLine(line.id, { include: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-3">
                        <input
                          type="date"
                          value={line.date}
                          onChange={(e) => handleUpdateLine(line.id, { date: e.target.value })}
                          className="w-full rounded-lg border border-input bg-background/80 p-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                      </td>

                      {/* Description */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                            placeholder="تفصیل یا بل نمبر"
                            className="w-full rounded-lg border border-input bg-background/80 p-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                          {line.uncertain && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                              <AlertTriangle className="h-3 w-3" /> Scanner was uncertain, check book
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kind Toggle (Charge vs Payment) */}
                      <td className="p-3">
                        <select
                          value={line.kind}
                          onChange={(e) => handleUpdateLine(line.id, { kind: e.target.value as any })}
                          className={`w-full rounded-lg border p-1.5 text-xs font-bold focus:outline-none ${
                            line.kind === 'charge'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                              : 'border-blue-500/30 bg-blue-500/10 text-blue-700'
                          }`}
                        >
                          <option value="charge">Charge (ادھار / مال)</option>
                          <option value="payment">Payment (وصولی / جمع)</option>
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="p-3">
                        <input
                          type="number"
                          step="any"
                          value={line.amount}
                          onChange={(e) =>
                            handleUpdateLine(line.id, {
                              amount: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg border border-input bg-background/80 p-1.5 font-numeric text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                        />
                      </td>

                      {/* Book Balance / Discrepancy Alert */}
                      <td className="p-3">
                        {line.writtenBalance !== null ? (
                          <div className="space-y-0.5">
                            <span className="font-numeric font-semibold text-muted-foreground">
                              {line.writtenBalance.toLocaleString()}
                            </span>
                            {mismatch && (
                              <div
                                title={issues.find((i) => i.code === 'BALANCE_MISMATCH')?.message}
                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600"
                              >
                                <AlertCircle className="h-3 w-3" />
                                <span>Mismatch!</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(line.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Running Totals Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Total Charges (مال / ادھار):</span>
              <p className="mt-1 text-lg font-black font-numeric text-emerald-600">
                {formatCurrency(totals.charges)}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Total Payments (وصولی / جمع):</span>
              <p className="mt-1 text-lg font-black font-numeric text-blue-600">
                {formatCurrency(totals.payments)}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Net Ledger Balance Adjustment:</span>
              <p className="mt-1 text-lg font-black font-numeric text-primary">
                {formatCurrency(totals.net)}
              </p>
            </div>
          </div>

          {/* Validation Problems Callout if Any */}
          {!readiness.ready && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Please fix the following items before continuing:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                {readiness.problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Stepper Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Parties</span>
            </button>

            <button
              type="button"
              disabled={!readiness.ready}
              onClick={() => setStep(4)}
              className={`flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 ${
                !readiness.ready ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>Summary & Final Review</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Summary & Confirm Adjustment */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Confirm Khata Ledger Import • کھاتہ کی تصدیق اور پوسٹنگ
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the ledger entries before saving. Once posted, all statements and balances update automatically.
              </p>
            </div>

            {/* Batch Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Import Title / Reference:</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="e.g. Khata Book 2025 - Page 14"
                  className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Notes / Remarks (Optional):</label>
                <input
                  type="text"
                  value={importNotes}
                  onChange={(e) => setImportNotes(e.target.value)}
                  placeholder="e.g. Verified by Haji Sb"
                  className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Impact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="mt-1 text-sm font-bold text-foreground capitalize">
                  {partyType === 'customer' ? 'Customer (لینا)' : 'Supplier (دینا)'}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <span className="text-xs text-muted-foreground">Rows to Post</span>
                <p className="mt-1 text-sm font-bold font-numeric text-foreground">
                  {totals.count} entries
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <span className="text-xs text-muted-foreground">Total Charges</span>
                <p className="mt-1 text-sm font-bold font-numeric text-emerald-600">
                  {formatCurrency(totals.charges)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <span className="text-xs text-muted-foreground">Net Ledger Adjustment</span>
                <p className="mt-1 text-sm font-black font-numeric text-primary">
                  {formatCurrency(totals.net)}
                </p>
              </div>
            </div>

            {/* Safety Options */}
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forcePost}
                  onChange={(e) => setForcePost(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Allow duplicate entries if identical entries exist in previous batches
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Edit Rows</span>
              </button>

              <button
                type="button"
                disabled={postMutation.isPending}
                onClick={handleConfirmPost}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {postMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Posting Ledger Entries...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Post to Ledger (کھاتہ محفوظ کریں)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Success State */}
      {step === 5 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-card p-8 text-center shadow-lg space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              Khata Record Successfully Posted!
            </h2>
            <p dir="rtl" className="font-urdu text-sm font-bold text-emerald-600">
              پرانا کھاتہ کامیابی سے سسٹم میں درج ہو گیا ہے
            </p>
            <p className="text-xs text-muted-foreground">
              Import Ref: <span className="font-bold text-foreground">#{postResult?.import_number}</span> •{' '}
              {postResult?.total_lines} entries posted
            </p>
          </div>

          <div className="mx-auto max-w-sm rounded-xl border border-border bg-background p-4 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Charges:</span>
              <span className="font-bold font-numeric text-emerald-600">
                {formatCurrency(postResult?.total_charges || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payments:</span>
              <span className="font-bold font-numeric text-blue-600">
                {formatCurrency(postResult?.total_payments || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-bold">
              <span>Net Ledger Impact:</span>
              <span className="font-numeric text-primary">
                {formatCurrency(postResult?.total_net || 0)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setDraftLines([])
                setPartyChoices([])
                setPostResult(null)
              }}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              <span>Scan Another Khata Page</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(partyType === 'customer' ? '/customers' : '/suppliers')}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View {partyType === 'customer' ? 'Customers' : 'Suppliers'} Ledger</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
