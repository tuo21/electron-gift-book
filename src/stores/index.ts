/**
 * Pinia stores index file
 * Centralized export for all stores
 */

import { createPinia } from 'pinia'

// Create and export the Pinia instance
export const pinia = createPinia()

// Export store composition functions
export { useRecordsStore } from './useRecordsStore'
export { useStatisticsStore } from './useStatisticsStore'
export { useSearchStore } from './useSearchStore'
export { useUIStore } from './useUIStore'

// Re-export types for convenience
export type { RecordsState, RecordsActions, StatisticsState, StatisticsActions, SearchState, SearchActions, UIState, UIActions } from '../types/stores'