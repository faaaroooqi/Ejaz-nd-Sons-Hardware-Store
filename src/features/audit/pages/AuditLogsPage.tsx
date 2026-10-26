import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Search, ShieldAlert, Clock } from 'lucide-react'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { PERMISSIONS } from '@/lib/permissions'

export function AuditLogsPage() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['activity-logs', search],
    queryFn: async () => {
      let query = (supabase as any)
        .from('activity_logs')
        .select(`
          *,
          actor:profiles(full_name, email)
        `)
        .order('occurred_at', { ascending: false })
        .limit(100)

      if (search && search.trim().length > 0) {
        query = query.or(`action.ilike.%${search.trim()}%,summary.ilike.%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_VIEW}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Activity & Audit Trail Logs"
          titleUrdu="سسٹم سرگرمی لاگز"
          description="Immutable audit logs recording all price updates, invoice creations, ledger edits, and system actions."
          descriptionUrdu="سسٹم میں ہونے والی تمام تبدیلیاں (کس نے کب کیا تبدیل کیا) کا محفوظ ریکارڈ"
          icon={ShieldAlert}
        />

        {/* Search */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit trail by action, summary, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading audit log entries...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load audit logs: {(error as any).message}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No audit logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User / Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Summary Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(log.occurred_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {log.actor?.full_name || 'System / RPC'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{log.entity_type}</td>
                      <td className="px-4 py-3 text-foreground">{log.summary || JSON.stringify(log.metadata)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  )
}
