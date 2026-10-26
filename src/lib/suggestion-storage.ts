/**
 * Storage helper to maintain user-typed suggestions in LocalStorage.
 * Enables system learning from previously written user input across sessions.
 */

export const STORAGE_KEYS = {
  CATEGORIES: 'hw_learned_categories',
  BRANDS: 'hw_learned_brands',
} as const

export function getLearnedSuggestions(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    }
    return []
  } catch (err) {
    console.warn('Failed to load learned suggestions from localStorage:', err)
    return []
  }
}

export function saveLearnedSuggestion(key: string, value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return getLearnedSuggestions(key)

  try {
    const current = getLearnedSuggestions(key)
    const exists = current.some((item) => item.toLowerCase() === trimmed.toLowerCase())

    let updated: string[]
    if (exists) {
      updated = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())]
    } else {
      updated = [trimmed, ...current]
    }

    // Limit to max 100 entries per category/brand type
    updated = updated.slice(0, 100)

    localStorage.setItem(key, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.warn('Failed to save learned suggestion to localStorage:', err)
    return getLearnedSuggestions(key)
  }
}
