import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { HELP_TOPICS, type LanguageMode } from './helpData'

type HelpTab = 'current' | 'workflow' | 'all' | 'faq'

interface HelpContextType {
  isOpen: boolean
  openHelp: (topicId?: string) => void
  closeHelp: () => void
  activeTopicId: string
  setActiveTopicId: (id: string) => void
  activeTab: HelpTab
  setActiveTab: (tab: HelpTab) => void
  language: LanguageMode
  setLanguage: (lang: LanguageMode) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  currentTopicId: string
}

const HelpContext = createContext<HelpContextType | undefined>(undefined)

const STORAGE_LANG_KEY = 'hw_help_language_preference'

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  // Language Preference (Defaults to dual or urdu for maximum shopkeeper clarity)
  const [language, setLanguageState] = useState<LanguageMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as LanguageMode
      if (saved === 'ur' || saved === 'en' || saved === 'dual') return saved
    } catch {}
    return 'dual' // Default to bilingual so both English and Urdu are clearly visible
  })

  const setLanguage = (lang: LanguageMode) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang)
    } catch {}
  }

  // Detect current route's corresponding help topic
  const findTopicForPath = (path: string): string => {
    const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/'
    // Special match for sales new / purchases new
    if (cleanPath === '/sales/new') return 'new-sale'
    if (cleanPath === '/purchases/new') return 'purchases'
    
    const matched = HELP_TOPICS.find((t) =>
      t.routePatterns.some((pattern) => cleanPath === pattern || cleanPath.startsWith(pattern + '/'))
    )
    return matched ? matched.id : 'dashboard'
  }

  const currentTopicId = findTopicForPath(location.pathname)
  const [activeTopicId, setActiveTopicId] = useState<string>(currentTopicId)
  const [activeTab, setActiveTab] = useState<HelpTab>('current')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync active topic when route changes and help is not currently open
  useEffect(() => {
    if (!isOpen) {
      setActiveTopicId(currentTopicId)
    }
  }, [currentTopicId, isOpen])

  const openHelp = (topicId?: string) => {
    const targetTopic = topicId || currentTopicId
    setActiveTopicId(targetTopic)
    setActiveTab(topicId === 'workflow' ? 'workflow' : 'current')
    setSearchQuery('')
    setIsOpen(true)
  }

  const closeHelp = () => {
    setIsOpen(false)
  }

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        openHelp,
        closeHelp,
        activeTopicId,
        setActiveTopicId,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        searchQuery,
        setSearchQuery,
        currentTopicId,
      }}
    >
      {children}
    </HelpContext.Provider>
  )
}

export const useHelp = (): HelpContextType => {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider')
  }
  return context
}
