import { invoke } from '@tauri-apps/api/core'
import type { Record, RecordHistory, Statistics, ApiResponse, PaginationResult } from '../types/database'

function checkIsTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_METADATA__' in window || '__TAURI__' in window)
}

const isTauri = checkIsTauri()

function wrapResult<T>(result: T): ApiResponse<T> {
  return { success: true, data: result }
}

function wrapError(error: string): ApiResponse<never> {
  return { success: false, error }
}

export const bridge = {
  isTauri,
  checkIsTauri,

  async getAllRecords(): Promise<ApiResponse<Record[]>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<Record[]>('get_all_records')
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getAllRecords()
  },

  async getRecordsPaginated(page: number, pageSize: number): Promise<ApiResponse<PaginationResult<Record>>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<PaginationResult<Record>>('get_records_paginated', { page, pageSize })
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getRecordsPaginated(page, pageSize)
  },

  async getRecordPage(recordId: number, pageSize: number): Promise<ApiResponse<number | null>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<number | null>('get_record_page', { recordId, pageSize })
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getRecordPage(recordId, pageSize)
  },

  async getRecordById(id: number): Promise<ApiResponse<Record>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<Record | null>('get_record_by_id', { id })
        if (!result) {
          return wrapError('记录不存在')
        }
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getRecordById(id)
  },

  async searchRecords(keyword: string): Promise<ApiResponse<Record[]>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<Record[]>('search_records', { keyword })
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.searchRecords(keyword)
  },

  async insertRecord(record: Record): Promise<ApiResponse<{ id: number }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<number>('insert_record', { record })
        return wrapResult({ id: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.insertRecord(record)
  },

  async updateRecord(record: Record): Promise<ApiResponse<void>> {
    if (checkIsTauri()) {
      try {
        await invoke<void>('update_record', { record })
        return wrapResult(undefined as void)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    const result = await window.db.updateRecord(record)
    return result as ApiResponse<void>
  },

  async softDeleteRecord(id: number): Promise<ApiResponse<void>> {
    if (checkIsTauri()) {
      try {
        await invoke<void>('soft_delete_record', { id })
        return wrapResult(undefined as void)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    const result = await window.db.softDeleteRecord(id)
    return result as ApiResponse<void>
  },

  async getRecordHistory(recordId: number): Promise<ApiResponse<RecordHistory[]>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<RecordHistory[]>('get_record_history', { recordId })
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getRecordHistory(recordId)
  },

  async getAllRecordHistory(): Promise<ApiResponse<RecordHistory[]>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<RecordHistory[]>('get_all_record_history')
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getAllRecordHistory()
  },

  async getStatistics(): Promise<ApiResponse<Statistics>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<Statistics>('get_statistics')
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.getStatistics()
  },

  async batchInsertRecords(records: Record[]): Promise<ApiResponse<{ count: number }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<number>('batch_insert_records', { records })
        return wrapResult({ count: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.db.batchInsertRecords(records)
  },

  async openDatabaseFile(): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('open_database_file')
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.openDatabaseFile()
  },

  async createNewDatabase(fileName: string): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('create_new_database', { fileName })
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.createNewDatabase(fileName)
  },

  async switchDatabase(filePath: string): Promise<ApiResponse<void>> {
    if (checkIsTauri()) {
      try {
        await invoke<void>('switch_database', { filePath })
        return wrapResult(undefined as void)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    const result = await window.electronAPI.switchDatabase(filePath)
    return result as ApiResponse<void>
  },

  async saveCurrentDatabase(fileName: string): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('save_current_database', { fileName })
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.saveCurrentDatabase(fileName)
  },

  async getRecentDatabases(): Promise<ApiResponse<{ recentDatabases: { name: string; path: string; lastOpened: string }[] }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<{ name: string; path: string; lastOpened: string }[]>('get_recent_databases')
        return wrapResult({ recentDatabases: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.getRecentDatabases()
  },

  async deleteDatabase(filePath: string): Promise<ApiResponse<void>> {
    if (checkIsTauri()) {
      try {
        await invoke<void>('delete_database', { filePath })
        return wrapResult(undefined as void)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    const result = await window.electronAPI.deleteDatabase(filePath)
    return result as ApiResponse<void>
  },

  async openImportFile(): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('open_import_file')
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.openImportFile()
  },

  async parseImportFile(filePath: string): Promise<ApiResponse<{ headers: string[]; data: any[]; totalRows: number }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<{ headers: string[]; data: any[]; totalRows: number }>('parse_import_file', { filePath })
        return wrapResult(result)
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.electronAPI.parseImportFile(filePath)
  },

  async saveFileDialog(filename: string, extensions: string[]): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('save_file_dialog', { filename, extensions })
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    // Electron 下返回默认值
    return wrapResult({ filePath: filename })
  },

  async generatePDF(data: {
    records: Record[]
    appName: string
    exportDate: string
    filename: string
    theme?: 'red' | 'gray'
  }): Promise<ApiResponse<{ filePath: string }>> {
    if (checkIsTauri()) {
      try {
        const result = await invoke<string>('generate_pdf', { request: data })
        return wrapResult({ filePath: result })
      } catch (e) {
        return wrapError(String(e))
      }
    }
    return window.app.generatePDF(data)
  }
}

export default bridge
