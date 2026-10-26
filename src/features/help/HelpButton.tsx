import React from 'react'
import { HelpCircle, BookOpen } from 'lucide-react'
import { useHelp } from './HelpContext'

interface HelpButtonProps {
  topicId?: string
  variant?: 'header' | 'topbar' | 'compact' | 'pill'
  className?: string
  showText?: boolean
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  topicId,
  variant = 'header',
  className = '',
  showText = true,
}) => {
  const { openHelp } = useHelp()

  if (variant === 'topbar') {
    return (
      <button
        onClick={() => openHelp(topicId)}
        className={`flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition-all hover:bg-amber-500/20 hover:border-amber-500/50 dark:text-amber-400 dark:bg-amber-500/15 ${className}`}
        title="Help & User Guide (مدد اور رہنمائی)"
        aria-label="Open App Help"
      >
        <HelpCircle className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
        {showText && (
          <span className="flex items-center gap-1">
            <span>Help</span>
            <span dir="rtl" className="font-urdu text-[11px] font-bold">
              (مدد)
            </span>
          </span>
        )}
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => openHelp(topicId)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 transition-all hover:bg-amber-500/20 dark:text-amber-400 ${className}`}
        title="Panel Help & Instructions (اس پینل کی رہنمائی)"
        aria-label="Open Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    )
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={() => openHelp(topicId)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-500/20 dark:text-amber-300 ${className}`}
      >
        <BookOpen className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span>How it works</span>
        <span dir="rtl" className="font-urdu text-[11px] font-bold">
          (طریقہ کار)
        </span>
      </button>
    )
  }

  // Default 'header' variant for PageHeader
  return (
    <button
      onClick={() => openHelp(topicId)}
      className={`group inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-sm active:scale-95 dark:text-amber-300 dark:bg-amber-500/15 ${className}`}
      title="Click for Instructions & Workflow (مدد اور رہنمائی کے لیے کلک کریں)"
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white font-extrabold text-[11px] shadow-sm group-hover:scale-110 transition-transform">
        ?
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">Help</span>
        <span className="text-amber-400 dark:text-amber-600">•</span>
        <span dir="rtl" className="font-urdu text-[12px] font-bold tracking-normal leading-none pt-0.5">
          مدد
        </span>
      </div>
    </button>
  )
}
