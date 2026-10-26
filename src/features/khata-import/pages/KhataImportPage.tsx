import React, { useState } from 'react'
import {
  BookOpen,
  Camera,
  History,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { RequirePermission } from '@/components/common/RequirePermission'
import { PERMISSIONS } from '@/lib/permissions'
import { KhataImportWizard } from '../KhataImportWizard'
import { KhataImportHistory } from '../KhataImportHistory'

export const KhataImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  return (
    <RequirePermission permission={PERMISSIONS.DATA_IMPORT}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Scan & Import Old Khata"
          titleUrdu="پرانا کھاتہ اسکین اور اندراج"
          description="Digitize paper registers, reconcile running balances, and update customer & supplier ledgers safely"
          descriptionUrdu="پرانے کاپی رجسٹر اسکین کریں، بقایا جات درست کریں اور کسٹمر و سپلائر کے کھاتے خودکار اپڈیٹ کریں"
          icon={BookOpen}
          helpTopic="khata-import"
        />

        {/* Beginner-friendly Helpful Quick Guide */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Beginner's Guide to Importing Paper Khatas (کھاتہ منتقلی کا آسان طریقہ)
                  </h3>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Step-by-Step
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Choose Customer (لینا) or Supplier (دینا) • 2. Snap a photo of your register or choose a sample • 3. Review AI-read rows and match party • 4. Confirm to safely post to ledger.
                </p>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'new'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>New Import</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Import History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab View */}
        {activeTab === 'new' ? <KhataImportWizard /> : <KhataImportHistory />}
      </div>
    </RequirePermission>
  )
}
