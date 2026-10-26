import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  X,
  Search,
  BookOpen,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lightbulb,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Building2,
  DollarSign,
  Receipt,
  BarChart3,
  UserCheck,
  Settings,
  ArrowDownLeft,
  ShoppingBag,
  PlusCircle,
  LayoutDashboard,
} from 'lucide-react'
import { useHelp } from './HelpContext'
import {
  HELP_TOPICS,
  WORKFLOW_STAGES,
  SHOPKEEPER_FAQS,
} from './helpData'

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  PlusCircle,
  Boxes,
  Package,
  Users,
  Building2,
  DollarSign,
  BookOpen,
  ArrowDownLeft,
  Receipt,
  BarChart3,
  UserCheck,
  Settings,
}

export const HelpModal: React.FC = () => {
  const {
    isOpen,
    closeHelp,
    activeTopicId,
    setActiveTopicId,
    activeTab,
    setActiveTab,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
  } = useHelp()

  const navigate = useNavigate()
  const [selectedFaqIndex, setSelectedFaqIndex] = useState<number | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeHelp()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeHelp])

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Current selected topic object
  const currentTopic = useMemo(() => {
    return HELP_TOPICS.find((t) => t.id === activeTopicId) || HELP_TOPICS[0]
  }, [activeTopicId])

  // Filter topics based on search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return HELP_TOPICS
    const q = searchQuery.toLowerCase().trim()
    return HELP_TOPICS.filter(
      (t) =>
        t.titleEn.toLowerCase().includes(q) ||
        t.titleUr.includes(q) ||
        t.overviewEn.toLowerCase().includes(q) ||
        t.overviewUr.includes(q) ||
        t.steps.some((s) => s.titleEn.toLowerCase().includes(q) || s.titleUr.includes(q))
    )
  }, [searchQuery])

  // Filter FAQs based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return SHOPKEEPER_FAQS
    const q = searchQuery.toLowerCase().trim()
    return SHOPKEEPER_FAQS.filter(
      (f) =>
        f.questionEn.toLowerCase().includes(q) ||
        f.questionUr.includes(q) ||
        f.answerEn.toLowerCase().includes(q) ||
        f.answerUr.includes(q)
    )
  }, [searchQuery])

  if (!isOpen) return null

  const isUrdu = language === 'ur'
  const isEnglish = language === 'en'
  const isDual = language === 'dual'

  const CurrentIcon = ICON_MAP[currentTopic.iconName] || BookOpen

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeHelp}
        aria-hidden="true"
      />

      {/* Main Container Dialog */}
      <div className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden text-foreground">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-border bg-card/90 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Shopkeeper Guide & Help
                </h2>
                <span className="hidden sm:inline-block text-muted-foreground">•</span>
                <span dir="rtl" className="font-urdu text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">
                  دکاندار کی رہنمائی اور مدد
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Master hardware wholesale billing, credit khata, stock management, and app workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
            {/* Language Selector Switch */}
            <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLanguage('ur')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isUrdu
                    ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="صرف اردو میں دیکھیں"
              >
                <span dir="rtl" className="font-urdu text-xs">
                  اردو
                </span>
              </button>
              <button
                onClick={() => setLanguage('dual')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isDual
                    ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="English + اردو (دونوں زبانیں)"
              >
                <span>Both (دونوں)</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isEnglish
                    ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="View in English"
              >
                <span>English</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={closeHelp}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close Help"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-border bg-muted/30 px-4 py-2 sm:px-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'current'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Active Panel Guide</span>
              <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                (اس پینل کی مدد)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'workflow'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5 text-secondary" />
              <span>App Flow & Business Cycle</span>
              <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                (مکمل طریقہ کار)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-blue-500" />
              <span>All Modules</span>
              <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                (تمام پینلز)
              </span>
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                activeTab === 'faq'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span>FAQs & Pro Tips</span>
              <span dir="rtl" className="font-urdu text-[11px] opacity-80">
                (اہم سوالات)
              </span>
            </button>
          </div>

          {/* Quick Filter Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help / ادھار، اسٹاک تلاش کریں..."
              className="w-full rounded-lg border border-input bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ACTIVE PANEL GUIDE */}
          {activeTab === 'current' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Panel Header Banner */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                        <CurrentIcon className="h-5 w-5" />
                      </div>
                      <div>
                        {(!isUrdu) && (
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            {currentTopic.titleEn}
                          </h3>
                        )}
                        {(!isEnglish) && (
                          <div dir="rtl" className="font-urdu text-lg sm:text-xl font-bold text-primary">
                            {currentTopic.titleUr}
                          </div>
                        )}
                      </div>
                    </div>

                    {(!isUrdu) && (
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        {currentTopic.subtitleEn}
                      </p>
                    )}
                    {(!isEnglish) && (
                      <p dir="rtl" className="font-urdu text-xs sm:text-sm text-foreground/80 font-medium">
                        {currentTopic.subtitleUr}
                      </p>
                    )}
                  </div>

                  {/* Switch Topic Quick Dropdown */}
                  <div className="shrink-0 hidden md:block">
                    <select
                      value={activeTopicId}
                      onChange={(e) => setActiveTopicId(e.target.value)}
                      aria-label="Select panel help topic"
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none"
                    >
                      {HELP_TOPICS.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.titleEn} — {topic.titleUr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Overview Explanation */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>What is this panel used for? / یہ پینل کس کام آتا ہے؟</span>
                </h4>
                
                {(!isUrdu) && (
                  <p className="text-sm leading-relaxed text-foreground">
                    {currentTopic.overviewEn}
                  </p>
                )}

                {(!isEnglish) && (
                  <div
                    dir="rtl"
                    className="font-urdu text-sm sm:text-base leading-loose text-foreground/90 border-t border-border/50 pt-2"
                  >
                    {currentTopic.overviewUr}
                  </div>
                )}
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>How to manage this panel step-by-step</span>
                    <span dir="rtl" className="font-urdu text-xs text-muted-foreground font-normal">
                      (استعمال کرنے کا آسان طریقہ)
                    </span>
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {currentTopic.steps.length} Easy Steps
                  </span>
                </div>

                <div className="grid gap-3 sm:gap-4">
                  {currentTopic.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {step.stepNumber}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            {(!isUrdu) && (
                              <h5 className="font-bold text-sm text-foreground">
                                {step.titleEn}
                              </h5>
                            )}
                            {(!isEnglish) && (
                              <div
                                dir="rtl"
                                className="font-urdu text-sm sm:text-base font-bold text-primary"
                              >
                                {step.titleUr}
                              </div>
                            )}
                          </div>

                          {(!isUrdu) && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                              {step.descriptionEn}
                            </p>
                          )}

                          {(!isEnglish) && (
                            <p
                              dir="rtl"
                              className="font-urdu text-xs sm:text-sm text-foreground/80 leading-relaxed"
                            >
                              {step.descriptionUr}
                            </p>
                          )}

                          {(step.tipEn || step.tipUr) && (
                            <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                              {(!isUrdu && step.tipEn) && (
                                <p className="font-medium">💡 Pro Tip: {step.tipEn}</p>
                              )}
                              {(!isEnglish && step.tipUr) && (
                                <p dir="rtl" className="font-urdu text-xs font-medium pt-1">
                                  💡 دکاندار کے لیے نکتہ: {step.tipUr}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What Happens Behind the Scenes */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  <GitBranch className="h-4 w-4" />
                  <span>How everything is handled behind the scenes / سسٹم بیک گراؤنڈ میں کیا کرتا ہے؟</span>
                </div>

                <div className="grid gap-2 text-xs sm:text-sm">
                  {currentTopic.behindTheScenesEn.map((pointEn, idx) => {
                    const pointUr = currentTopic.behindTheScenesUr[idx]
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-lg bg-card/60 p-2.5 border border-border/40"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                        <div className="space-y-1 w-full">
                          {(!isUrdu) && <p className="text-foreground">{pointEn}</p>}
                          {(!isEnglish && pointUr) && (
                            <p dir="rtl" className="font-urdu text-foreground/80 text-xs sm:text-sm">
                              {pointUr}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Shopkeeper Golden Rules */}
              {currentTopic.shopkeeperTipsEn.length > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Golden Rules for Shopkeepers / دکانداروں کے لیے اہم مشورے</span>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm">
                    {currentTopic.shopkeeperTipsEn.map((tipEn, i) => {
                      const tipUr = currentTopic.shopkeeperTipsUr[i]
                      return (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <div className="space-y-0.5">
                            {(!isUrdu) && <span className="text-foreground">{tipEn}</span>}
                            {(!isEnglish && tipUr) && (
                              <div dir="rtl" className="font-urdu text-foreground/80 text-xs sm:text-sm">
                                {tipUr}
                              </div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLETE APP FLOW & BUSINESS WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Banner */}
              <div className="rounded-2xl border border-secondary/30 bg-gradient-to-r from-secondary/15 via-secondary/5 to-transparent p-5 sm:p-6 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-md">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      How Does the Complete App Flow Work?
                    </h3>
                    <div dir="rtl" className="font-urdu text-base sm:text-lg font-bold text-secondary">
                      ہارڈ ویئر دکان کا پورا سسٹم کیسے چلتا ہے؟
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Understand how goods enter your warehouse, how invoices deduct stock, how credit ledgers balance, and how you see net profit.
                </p>
                <div dir="rtl" className="font-urdu text-xs sm:text-sm text-foreground/80">
                  مال خریدنے سے لے کر، کسٹمر کو بیچنے، ادھار کھاتہ سنبھالنے اور منافع دیکھنے تک کے تمام مراحل۔
                </div>
              </div>

              {/* 7 Business Lifecycle Stages */}
              <div className="space-y-4">
                {WORKFLOW_STAGES.map((stage) => (
                  <div
                    key={stage.stageNumber}
                    className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Stage Title & Description */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm">
                            {stage.stageNumber}
                          </span>
                          
                          <div>
                            {(!isUrdu) && (
                              <h4 className="text-base font-bold text-foreground">
                                {stage.titleEn}
                              </h4>
                            )}
                            {(!isEnglish) && (
                              <div dir="rtl" className="font-urdu text-base font-bold text-primary">
                                {stage.titleUr}
                              </div>
                            )}
                          </div>

                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {(!isUrdu) ? stage.shortBadgeEn : ''} {(!isEnglish) ? `(${stage.shortBadgeUr})` : ''}
                          </span>
                        </div>

                        {(!isUrdu) && (
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {stage.descriptionEn}
                          </p>
                        )}
                        {(!isEnglish) && (
                          <p dir="rtl" className="font-urdu text-xs sm:text-sm text-foreground/85 leading-loose">
                            {stage.descriptionUr}
                          </p>
                        )}

                        {/* Dual Action Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* What You Do */}
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                              What you do at counter / آپ کا کام
                            </span>
                            {(!isUrdu) && (
                              <p className="text-xs text-foreground font-medium">
                                {stage.whatShopkeeperDoesEn}
                              </p>
                            )}
                            {(!isEnglish) && (
                              <p dir="rtl" className="font-urdu text-xs text-foreground/90 font-medium">
                                {stage.whatShopkeeperDoesUr}
                              </p>
                            )}
                          </div>

                          {/* What System Does */}
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                              System handles automatically / کمپیوٹر کا کام
                            </span>
                            {(!isUrdu) && (
                              <p className="text-xs text-foreground font-medium">
                                {stage.howSystemHandlesItEn}
                              </p>
                            )}
                            {(!isEnglish) && (
                              <p dir="rtl" className="font-urdu text-xs text-foreground/90 font-medium">
                                {stage.howSystemHandlesItUr}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Jump Button */}
                      <div className="shrink-0 self-end md:self-center">
                        <button
                          onClick={() => {
                            closeHelp()
                            navigate(stage.relatedRoute)
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-bold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm"
                        >
                          <span>Go to Panel</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ALL MODULES DIRECTORY */}
          {activeTab === 'all' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">All Application Panels</h3>
                  <p dir="rtl" className="font-urdu text-sm text-primary font-bold">
                    تمام پینلز کی رہنمائی اور تفصیلات
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredTopics.length} modules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTopics.map((topic) => {
                  const TopicIcon = ICON_MAP[topic.iconName] || BookOpen
                  const isCurrentActive = topic.id === activeTopicId
                  return (
                    <div
                      key={topic.id}
                      onClick={() => {
                        setActiveTopicId(topic.id)
                        setActiveTab('current')
                      }}
                      className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-primary hover:shadow-md ${
                        isCurrentActive
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <TopicIcon className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-foreground">
                              {topic.titleEn}
                            </h4>
                            <span dir="rtl" className="font-urdu text-xs font-bold text-primary">
                              {topic.titleUr}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {(!isUrdu) ? topic.subtitleEn : topic.subtitleUr}
                          </p>
                          <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-primary">
                            <span>Read Instructions &rarr;</span>
                            <span dir="rtl" className="font-urdu">
                              طریقہ کار پڑھیں
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SHOPKEEPER FAQS & PRO TIPS */}
          {activeTab === 'faq' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm font-bold">
                    ?
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Frequently Asked Questions by Shopkeepers
                    </h3>
                    <div dir="rtl" className="font-urdu text-base font-bold text-emerald-600 dark:text-emerald-400">
                      دکانداروں کے عام سوالات اور ان کے آسان حل
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Common doubts regarding credit, stock counting, receipts, refunds, and daily cash closing.
                </p>
              </div>

              {/* FAQ Accordions */}
              <div className="space-y-3">
                {filteredFaqs.map((faq, index) => {
                  const isExpanded = selectedFaqIndex === index
                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-border bg-card overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setSelectedFaqIndex(isExpanded ? null : index)}
                        className="w-full flex items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="space-y-1 flex-1">
                          {(!isUrdu) && (
                            <h4 className="font-bold text-sm text-foreground">
                              {faq.questionEn}
                            </h4>
                          )}
                          {(!isEnglish) && (
                            <div dir="rtl" className="font-urdu text-sm sm:text-base font-bold text-primary">
                              {faq.questionUr}
                            </div>
                          )}
                        </div>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-xs text-muted-foreground">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 p-4 space-y-3 animate-in fade-in duration-150">
                          {(!isUrdu) && (
                            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                              {faq.answerEn}
                            </p>
                          )}
                          {(!isEnglish) && (
                            <div
                              dir="rtl"
                              className="font-urdu text-xs sm:text-sm text-foreground/90 leading-loose border-t border-border/40 pt-2"
                            >
                              {faq.answerUr}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-border bg-card/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Ejaz and sons hardware store v1.0</span>
            <span>•</span>
            <span dir="rtl" className="font-urdu text-[11px]">
              دکاندار کا بااعتماد ساتھی
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('workflow')}
              className="text-xs font-semibold text-secondary hover:underline"
            >
              View System Flow (طریقہ کار)
            </button>
            <span>•</span>
            <button
              onClick={closeHelp}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95"
            >
              Close (بند کریں)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
