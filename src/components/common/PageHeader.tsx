import React from 'react'
import { HelpButton } from '@/features/help/HelpButton'

export interface PageHeaderProps {
  title: string
  titleUrdu?: string
  description: string
  descriptionUrdu: string
  icon?: React.ElementType
  action?: React.ReactNode
  helpTopic?: string
  hideHelp?: boolean
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleUrdu,
  description,
  descriptionUrdu,
  icon: Icon,
  action,
  helpTopic,
  hideHelp = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="space-y-1">
        {/* Title Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {titleUrdu && (
            <span
              dir="rtl"
              className="font-urdu inline-flex items-center rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary tracking-normal"
            >
              {titleUrdu}
            </span>
          )}
        </div>

        {/* Descriptions (English & Urdu) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-xs">
          <p className="text-muted-foreground">{description}</p>
          <span className="hidden sm:inline text-border font-bold">•</span>
          <p
            dir="rtl"
            className="font-urdu text-[13px] font-medium text-primary/90 tracking-normal"
          >
            {descriptionUrdu}
          </p>
        </div>
      </div>

      {/* Action Element + Help Button */}
      <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
        {!hideHelp && <HelpButton topicId={helpTopic} />}
        {action}
      </div>
    </div>
  )
}

