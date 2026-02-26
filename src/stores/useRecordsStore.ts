/**
 * Records Store
 * Manages record-related state and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Record, RecordHistory } from '../types/database'
import type { RecordsState, RecordsActions } from '../types/stores'
import { recordToDbRecord, dbRecordListToRecordList } from '../utils/recordMapper'

export const useRecordsStore = defineStore('records', (): RecordsState & RecordsActions => {
  // State
  const records = ref<Record[]>([])
  const editHistoryList = ref<RecordHistory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const pageSize = ref(15)
  const totalRecords = ref(0)

  // Getters
  const paginatedRecords = computed(() => records.value)

  const hasRecords = computed(() => records.value.length > 0)
  const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

  // Actions
  const loadRecords = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.getAllRecords()
      if (response.success && response.data) {
        // Convert database records to application records
        records.value = dbRecordListToRecordList(response.data as any)
        // Reverse to match original display order (newest first)
        records.value.reverse()
        totalRecords.value = records.value.length
      } else {
        throw new Error(response.error || 'Failed to load records')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load records:', err)
    } finally {
      loading.value = false
    }
  }

  const loadRecordsPaginated = async (page: number, size: number): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.getRecordsPaginated(page, size)
      if (response.success && response.data) {
        // Convert database records to application records
        const paginationResult = response.data
        records.value = dbRecordListToRecordList(paginationResult.records as any)
        // Reverse to match original display order (newest first)
        records.value.reverse()
        totalRecords.value = paginationResult.total
        currentPage.value = paginationResult.page
        pageSize.value = paginationResult.pageSize
      } else {
        throw new Error(response.error || 'Failed to load paginated records')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load paginated records:', err)
    } finally {
      loading.value = false
    }
  }

  const findRecordPage = async (recordId: number): Promise<number | null> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.getRecordPage(recordId, pageSize.value)
      if (response.success && response.data !== undefined) {
        return response.data
      } else {
        throw new Error(response.error || 'Failed to find record page')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to find record page:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const addRecord = async (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): Promise<number> => {
    loading.value = true
    error.value = null
    try {
      // Convert application record to database record format
      const dbRecord = recordToDbRecord({
        id: 0,
        guestName: record.guestName.trim(),
        amount: record.amount,
        amountChinese: record.amountChinese || '',
        itemDescription: record.itemDescription?.trim() || '',
        paymentType: record.paymentType,
        remark: record.remark?.trim() || '',
        isDeleted: 0,
      })
      const response = await window.db.insertRecord(dbRecord as any)
      if (response.success && response.data) {
        // Reload records to get the latest data (go to first page)
        currentPage.value = 1
        await loadRecordsPaginated(1, pageSize.value)
        return response.data.id
      } else {
        throw new Error(response.error || 'Failed to add record')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to add record:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRecord = async (record: Record): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      // Convert application record to database record format with trimmed fields
      const dbRecord = recordToDbRecord({
        ...record,
        guestName: record.guestName.trim(),
        itemDescription: record.itemDescription?.trim() || '',
        remark: record.remark?.trim() || '',
      })
      const response = await window.db.updateRecord(dbRecord as any)
      if (response.success) {
        // Reload records to get the latest data (stay on same page)
        await loadRecordsPaginated(currentPage.value, pageSize.value)
      } else {
        throw new Error(response.error || 'Failed to update record')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to update record:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRecord = async (id: number): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.softDeleteRecord(id)
      if (response.success) {
        // Reload records to get the latest data (stay on same page)
        await loadRecordsPaginated(currentPage.value, pageSize.value)
      } else {
        throw new Error(response.error || 'Failed to delete record')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to delete record:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const searchRecords = async (keyword: string): Promise<Record[]> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.searchRecords(keyword)
      if (response.success && response.data) {
        // Convert database records to application records
         return dbRecordListToRecordList(response.data as any)
      } else {
        throw new Error(response.error || 'Failed to search records')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to search records:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadEditHistory = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const response = await window.db.getAllRecordHistory()
      if (response.success && response.data) {
        editHistoryList.value = response.data
      } else {
        throw new Error(response.error || 'Failed to load edit history')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load edit history:', err)
    } finally {
      loading.value = false
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    records,
    editHistoryList,
    loading,
    error,
    currentPage,
    pageSize,
    totalRecords,

    // Getters
    paginatedRecords,
    hasRecords,
    totalPages,

    // Actions
    loadRecords,
    loadRecordsPaginated,
    findRecordPage,
    addRecord,
    updateRecord,
    deleteRecord,
    searchRecords,
    loadEditHistory,
    clearError,
  }
})