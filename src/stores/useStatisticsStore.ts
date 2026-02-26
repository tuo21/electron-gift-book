/**
 * Statistics Store
 * Manages statistics-related state and operations
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StatisticsState, StatisticsActions } from '../types/stores'

export const useStatisticsStore = defineStore('statistics', (): StatisticsState & StatisticsActions => {
  // State
  const statistics = ref({
    totalCount: 0,
    totalAmount: 0,
    cashAmount: 0,
    wechatAmount: 0,
    internalAmount: 0,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const loadStatistics = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.getStatistics()
      if (response.success && response.data) {
        statistics.value = response.data
      } else {
        throw new Error(response.error || 'Failed to load statistics')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load statistics:', err)
    } finally {
      loading.value = false
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    statistics,
    loading,
    error,

    // Actions
    loadStatistics,
    clearError,
  }
})