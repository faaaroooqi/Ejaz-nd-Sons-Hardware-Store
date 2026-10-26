import React, { useState } from 'react'
import {
  RotateCcw,
  Eye,
  FileText,
  AlertTriangle,
  X,
  Building2,
  Users,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import { useKhataImports, useKhataImportDetails, useUndoKhataImport } from './queries'
import type { KhataImportRecord } from './api'

export const KhataImportHistory: React.FC = () => {
  const { data: imports = [], isLoading } = useKhataImports()
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [importToUndo, setImportToUndo] = useState<KhataImportRecord | null>(null)
  const [undoReason, setUndoReason] = useState<string>('')

  const { data: details, isLoading: isDetailsLoading } = useKhataImportDetails(selectedImportId)
  const undoMutation = useUndoKhataImport()

  const handleConfirmUndo = async () => {
    if (!importToUndo) return
    try {
      const res = await undoMutation.mutateAsync({
        importId: importToUndo.id,
        reason: undoReason || 'User requested reversal',
      })
      toast.success(`Import #${importToUndo.import_number} reversed successfully (Ref: #${res.reversal_import_number})`)
      setImportToUndo(null)
      setUndoReason('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo import.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Khata Import History & Audit Trail • کھاتہ تاریخ اور آڈٹ
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review all scanned batches and ledger adjustments. Every import is immutable and reversible.
            </p>
          </div>
          <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {imports.length} Batches Recorded
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading import history...
          </div>
        ) : imports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-bold text-foreground">No Old Khata Batches Yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the "New Khata Import" tab to scan or enter past ledger records.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                  <th className="p-3">Import #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Title / Ref</th>
                  <th className="p-3 text-right">Rows</th>
                  <th className="p-3 text-right">Net Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {imports.map((item) => {
                  const isReversed = item.status === 'reversed'
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isReversed ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-foreground">
                        #{item.import_number}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(item.posted_at || item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            item.party_type === 'customer'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-amber-500/10 text-amber-700'
                          }`}
                        >
                          {item.party_type === 'customer' ? (
                            <>
                              <Users className="h-3 w-3" /> Customer (لینا)
                            </>
                          ) : (
                            <>
                              <Building2 className="h-3 w-3" /> Supplier (دینا)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-foreground font-medium">
                        {item.title || 'Khata Batch'}
                      </td>
                      <td className="p-3 text-right font-numeric font-bold">
                        {item.total_lines}
                      </td>
                      <td className="p-3 text-right font-numeric font-bold text-primary">
                        {formatCurrency(item.total_net)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isReversed
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-emerald-500/10 text-emerald-700'
                          }`}
                        >
                          {isReversed ? 'Reversed (واپس کیا گیا)' : 'Posted (محفوظ)'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedImportId(item.id)}
                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </button>

                          {!isReversed && (
                            <button
                              type="button"
                              onClick={() => {
                                setImportToUndo(item)
                                setUndoReason('')
                              }}
                              className="flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Undo</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedImportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Import Details #{details?.importRecord?.import_number}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {details?.importRecord?.title || 'Batch Entries'} • Posted{' '}
                  {details?.importRecord?.posted_at &&
                    new Date(details.importRecord.posted_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedImportId(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-4">
              {isDetailsLoading ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading line records...
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Party</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Charge</th>
                      <th className="p-2.5 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(details?.lines || []).map((l) => (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground">{l.line_no}</td>
                        <td className="p-2.5">{l.entry_date}</td>
                        <td className="p-2.5 font-bold text-foreground">
                          {l.customer?.name || l.supplier?.name || '-'}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{l.description}</td>
                        <td className="p-2.5 text-right font-numeric font-bold text-emerald-600">
                          {l.charge > 0 ? formatCurrency(l.charge) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-numeric font-bold text-blue-600">
                          {l.payment > 0 ? formatCurrency(l.payment) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedImportId(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Modal */}
      {importToUndo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Undo Khata Import</h3>
                <p className="text-xs text-muted-foreground">Reversal of Batch #{importToUndo.import_number}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will create an append-only reversal of all ledger entries posted in this batch, safely backing them out
              from customer or supplier running balances without touching invoices or stock.
            </p>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reason for Reversal:</label>
              <input
                type="text"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                placeholder="e.g. Scanned wrong register page"
                className="mt-1 w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={undoMutation.isPending}
                onClick={() => setImportToUndo(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={undoMutation.isPending}
                onClick={handleConfirmUndo}
                className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-destructive-foreground shadow hover:brightness-110 disabled:opacity-50"
              >
                {undoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Reversing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Confirm Reversal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
