import React, { useState, useRef, useEffect } from 'react'
import { Check, Sparkles, Plus, Layers, Tag, ChevronDown } from 'lucide-react'

interface SuggestiveInputProps {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  iconType?: 'category' | 'brand'
  helperText?: string
}

export const SuggestiveInput: React.FC<SuggestiveInputProps> = ({
  label,
  required = false,
  value,
  onChange,
  suggestions,
  placeholder = '',
  iconType = 'category',
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmedQuery = value.trim().toLowerCase()

  // Deduplicate suggestions case-insensitively while preserving clean display text
  const uniqueSuggestions = Array.from(
    new Map(suggestions.map((s) => [s.trim().toLowerCase(), s.trim()])).values()
  ).filter((s) => s.length > 0)

  // Filter suggestions by query
  const filteredSuggestions = uniqueSuggestions.filter((item) =>
    item.toLowerCase().includes(trimmedQuery)
  )

  const exactMatchExists = uniqueSuggestions.some(
    (item) => item.toLowerCase() === trimmedQuery
  )

  const showAddNewOption = trimmedQuery.length > 0 && !exactMatchExists

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (selectedText: string) => {
    onChange(selectedText)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true)
        return
      }
    }

    const maxItems = filteredSuggestions.length + (showAddNewOption ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1 < maxItems ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : maxItems - 1))
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0) {
        e.preventDefault()
        if (highlightedIndex < filteredSuggestions.length) {
          handleSelect(filteredSuggestions[highlightedIndex])
        } else if (showAddNewOption) {
          handleSelect(value.trim())
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const IconComponent = iconType === 'brand' ? Tag : Layers

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>

      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground pointer-events-none">
          <IconComponent className="h-4 w-4" />
        </div>
        <input
          type="text"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-input bg-background/50 py-2 pl-9 pr-8 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 text-muted-foreground hover:text-foreground p-1 rounded-md"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {helperText && (
        <p className="mt-1 text-[10px] text-muted-foreground">{helperText}</p>
      )}

      {/* Suggestion Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {filteredSuggestions.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Learned & Existing Suggestions</span>
            </div>
          )}

          {filteredSuggestions.map((item, index) => {
            const isSelected = item.toLowerCase() === value.trim().toLowerCase()
            const isHighlighted = index === highlightedIndex

            return (
              <button
                key={item}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-semibold'
                    : isHighlighted
                    ? 'bg-muted text-foreground'
                    : 'text-foreground hover:bg-muted/70'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <IconComponent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            )
          })}

          {showAddNewOption && (
            <button
              type="button"
              onClick={() => handleSelect(value.trim())}
              onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
              className={`flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2.5 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors mt-1 ${
                highlightedIndex === filteredSuggestions.length ? 'ring-1 ring-primary' : ''
              }`}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Add & Learn new {iconType}: <strong className="font-bold">"{value.trim()}"</strong>
              </span>
            </button>
          )}

          {filteredSuggestions.length === 0 && !showAddNewOption && (
            <div className="px-3 py-2 text-center text-xs text-muted-foreground">
              Type to add a new {iconType}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
