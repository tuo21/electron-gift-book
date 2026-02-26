/**
 * Search Store
 * Manages search-related state and operations
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Record } from '../types/database'
import type { SearchState, SearchActions } from '../types/stores'

export const useSearchStore = defineStore('search', (): SearchState & SearchActions => {
  // State
  const keyword = ref('')
  const results = ref<Record[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isSearching = ref(false)

  // Actions
  const setKeyword = (newKeyword: string): void => {
    keyword.value = newKeyword
  }

  const search = async (newKeyword: string): Promise<void> => {
    keyword.value = newKeyword
    await performSearch()
  }

  const performSearch = async (): Promise<void> => {
    if (!keyword.value.trim()) {
      results.value = []
      return
    }

    loading.value = true
    isSearching.value = true
    error.value = null
    try {
      const response = await window.db.searchRecords(keyword.value)
      if (response.success && response.data) {
        results.value = response.data
      } else {
        throw new Error(response.error || 'Failed to search records')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to search records:', err)
      results.value = []
    } finally {
      loading.value = false
      isSearching.value = false
    }
  }

  const clearSearch = (): void => {
    keyword.value = ''
    results.value = []
    isSearching.value = false
    error.value = null
  }

  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    keyword,
    results,
    loading,
    error,
    isSearching,

    // Actions
    setKeyword,
    search,
    performSearch,
    clearSearch,
    clearError,
  }
})