/**
 * Store type definitions
 * Centralized type definitions for all Pinia stores
 */

import type { Ref } from 'vue'
import type { Record, RecordHistory, Statistics } from './database'

// ==================== Records Store Types ====================
export interface RecordsState {
  records: Ref<Record[]>
  editHistoryList: Ref<RecordHistory[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  currentPage: Ref<number>
  pageSize: Ref<number>
  totalRecords: Ref<number>
  totalPages: Ref<number>
  hasRecords: Ref<boolean>
  paginatedRecords: Ref<Record[]>
}

export interface RecordsActions {
  loadRecords(): Promise<void>
  loadRecordsPaginated(page: number, pageSize: number): Promise<void>
  findRecordPage(recordId: number): Promise<number | null>
  addRecord(record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): Promise<number>
  updateRecord(record: Record): Promise<void>
  deleteRecord(id: number): Promise<void>
  searchRecords(keyword: string): Promise<Record[]>
  loadEditHistory(): Promise<void>
  clearError(): void
}

// ==================== Statistics Store Types ====================
export interface StatisticsState {
  statistics: Ref<Statistics>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export interface StatisticsActions {
  loadStatistics(): Promise<void>
  clearError(): void
}

// ==================== Search Store Types ====================
export interface SearchState {
  keyword: Ref<string>
  results: Ref<Record[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  isSearching: Ref<boolean>
}

export interface SearchActions {
  setKeyword(keyword: string): void
  search(keyword: string): Promise<void>
  performSearch(): Promise<void>
  clearSearch(): void
  clearError(): void
}

// ==================== UI Store Types ====================
export interface UIState {
  showSplashScreen: Ref<boolean>
  isAppReady: Ref<boolean>
  appName: Ref<string>
  isEditingName: Ref<boolean>
  lunarDate: Ref<{ primary: string; secondary: string }>
  hideAmount: Ref<boolean>
  showStatisticsModal: Ref<boolean>
  showEditHistoryModal: Ref<boolean>
  showSearchModal: Ref<boolean>
  showExportModal: Ref<boolean>
  isExporting: Ref<boolean>
}

export interface UIActions {
  setAppName(name: string): void
  setIsEditingName(editing: boolean): void
  saveAppName(name?: string): void
  setLunarDate(date: { primary: string; secondary: string }): void
  toggleAmountDisplay(): void
  toggleHideAmount(): void
  openStatisticsModal(): void
  closeStatisticsModal(): void
  openEditHistoryModal(): void
  closeEditHistoryModal(): void
  openSearchModal(): void
  closeSearchModal(): void
  openExportModal(): void
  closeExportModal(): void
  setIsExporting(exporting: boolean): void
  showSplash(): void
  hideSplash(): void
  setAppReady(ready: boolean): void
}

// ==================== Combined Store Types ====================
export type RecordsStore = RecordsState & RecordsActions
export type StatisticsStore = StatisticsState & StatisticsActions
export type SearchStore = SearchState & SearchActions
export type UIStore = UIState & UIActions