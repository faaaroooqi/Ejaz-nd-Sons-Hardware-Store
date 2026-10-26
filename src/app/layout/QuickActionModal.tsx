import React from 'react'
import { useNavigate } from 'react-router'
import { ShoppingCart, ShoppingBag, ArrowDownLeft, ArrowUpRight, Receipt, Users, BookOpen, X } from 'lucide-react'

interface QuickActionModalProps {
  isOpen: boolean
  onClose: () => void
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const actions = [
    {
      label: 'New Sale Invoice',
      labelUrdu: 'نیا سیلز بل',
      description: 'Create cash/credit sale',
      descriptionUrdu: 'نقد یا ادھار بل بنائیں',
      icon: ShoppingCart,
      to: '/sales/new',
      color: 'bg-primary text-primary-foreground',
    },
    {
      label: 'New Purchase Entry',
      labelUrdu: 'خریداری کا مال',
      description: 'Record inventory stock-in',
      descriptionUrdu: 'گودام میں مال داخل کریں',
      icon: ShoppingBag,
      to: '/purchases/new',
      color: 'bg-emerald-700 text-white',
    },
    {
      label: 'Receive Payment',
      labelUrdu: 'کسٹمر سے وصولی',
      description: 'Customer khata receipt',
      descriptionUrdu: 'کسٹمر سے پیسے آئے',
      icon: ArrowDownLeft,
      to: '/customer-payments/new',
      color: 'bg-blue-600 text-white',
    },
    {
      label: 'Pay Supplier',
      labelUrdu: 'سپلائر کو ادائیگی',
      description: 'Supplier khata payment',
      descriptionUrdu: 'سپلائر کو پیسے دیے',
      icon: ArrowUpRight,
      to: '/supplier-payments/new',
      color: 'bg-amber-600 text-white',
    },
    {
      label: 'Add Expense',
      labelUrdu: 'خرچہ درج کریں',
      description: 'Rent, freight, shop expense',
      descriptionUrdu: 'دکان کا خرچہ، کرایہ',
      icon: Receipt,
      to: '/expenses/new',
      color: 'bg-rose-600 text-white',
    },
    {
      label: 'Customer Ledger',
      labelUrdu: 'کسٹمر کھاتہ',
      description: 'Check party balance & khata',
      descriptionUrdu: 'بقایا رقم اور کھاتہ دیکھیں',
      icon: Users,
      to: '/customers',
      color: 'bg-purple-600 text-white',
    },
    {
      label: 'Scan Old Khata',
      labelUrdu: 'پرانا کھاتہ درج کریں',
      description: 'Digitize paper ledger books',
      descriptionUrdu: 'کاپی رجسٹر اسکین کریں',
      icon: BookOpen,
      to: '/khata-import',
      color: 'bg-teal-600 text-white',
    },
  ]

  const handleSelect = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Quick Business Action</h2>
              <span dir="rtl" className="font-urdu rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                فوری انٹری
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select transaction to record immediately • <span dir="rtl" className="font-urdu text-primary/85">فوری لین دین منتخب کریں</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actions.map((act) => {
            const Icon = act.icon
            return (
              <button
                key={act.to}
                onClick={() => handleSelect(act.to)}
                className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-primary hover:bg-muted/50 hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${act.color} shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-foreground truncate">{act.label}</p>
                    <span dir="rtl" className="font-urdu text-[11px] font-semibold text-primary/90 shrink-0">
                      {act.labelUrdu}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{act.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
