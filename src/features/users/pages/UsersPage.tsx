import { useState } from 'react'
import { UserCheck, UserX, Search } from 'lucide-react'
import { useUsers, useUpdateUser } from '../queries'
import { toast } from 'sonner'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { PERMISSIONS } from '@/lib/permissions'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const { data: users = [], isLoading, error } = useUsers()
  const updateUserMutation = useUpdateUser()

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.role_name && u.role_name.toLowerCase().includes(search.toLowerCase()))
  )

  const handleToggleActive = async (user: any) => {
    try {
      await updateUserMutation.mutateAsync({
        user_id: user.id,
        is_active: !user.is_active,
      })
      toast.success(`User ${user.full_name} is now ${!user.is_active ? 'Active' : 'Inactive'}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status')
    }
  }

  const handleRoleChange = async (user: any, newRoleCode: string) => {
    try {
      await updateUserMutation.mutateAsync({
        user_id: user.id,
        role_code: newRoleCode,
      })
      toast.success(`Updated ${user.full_name}'s role to ${newRoleCode}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role')
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.USERS_MANAGE}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="User Management & Permissions"
          titleUrdu="عملے کے اکاؤنٹس اور اختیارات"
          description="Manage staff accounts, assign system roles (Admin, Sales, Inventory), and enforce access controls."
          descriptionUrdu="ملازمین کے اکاؤنٹس، ایڈمن یا سیلز کے اختیارات اور لاگ اِن کنٹرول"
        />

        {/* Search */}
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading staff users...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed to load users: {(error as any).message}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No users found matching your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Email / Phone</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{u.email || 'No Email'}</div>
                        <div>{u.phone || 'No Phone'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role_code}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="input py-1 px-2 text-xs bg-muted/30 font-medium"
                        >
                          <option value="admin">System Admin</option>
                          <option value="sales">Sales Officer</option>
                          <option value="inventory">Inventory Clerk</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {u.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={updateUserMutation.isPending}
                          className={`btn text-xs ${u.is_active ? 'btn-outline border-destructive text-destructive' : 'btn-primary'}`}
                        >
                          {u.is_active ? 'Disable Access' : 'Enable Access'}
                        </button>
                      </td>
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
