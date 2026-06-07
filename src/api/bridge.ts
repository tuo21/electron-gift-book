import { invoke } from '@tauri-apps/api/core'
import type { Record, RecordHistory, Statistics, ApiResponse, PaginationResult, FontInfo } from '../types/database'

function wrapResult<T>(result: T): ApiResponse<T> {
  return { success: true, data: result }
}

function wrapError(error: string): ApiResponse<never> {
  return { success: false, error }
}

export const bridge = {
  async getAllRecords(): Promise<ApiResponse<Record[]>> {
    try {
      const result = await invoke<Record[]>('get_all_records')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getAllRecordsByPath(path: string): Promise<ApiResponse<Record[]>> {
    try {
      const result = await invoke<Record[]>('get_all_records_by_path', { path })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getRecordsPaginated(page: number, pageSize: number): Promise<ApiResponse<PaginationResult<Record>>> {
    try {
      const result = await invoke<PaginationResult<Record>>('get_records_paginated', { page, pageSize })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getRecordPage(recordId: number, pageSize: number): Promise<ApiResponse<number | null>> {
    try {
      const result = await invoke<number | null>('get_record_page', { recordId, pageSize })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getRecordById(id: number): Promise<ApiResponse<Record>> {
    try {
      const result = await invoke<Record | null>('get_record_by_id', { id })
      if (!result) {
        return wrapError('记录不存在')
      }
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async searchRecords(keyword: string): Promise<ApiResponse<Record[]>> {
    try {
      const result = await invoke<Record[]>('search_records', { keyword })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async insertRecord(record: Record): Promise<ApiResponse<{ id: number }>> {
    try {
      const result = await invoke<number>('insert_record', { record })
      return wrapResult({ id: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async updateRecord(record: Record): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('update_record', { record })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async softDeleteRecord(id: number): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('soft_delete_record', { id })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async restoreDeletedRecord(history: RecordHistory): Promise<ApiResponse<{ id: number }>> {
    try {
      const result = await invoke<number>('restore_deleted_record', { history })
      return wrapResult({ id: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getRecordHistory(recordId: number): Promise<ApiResponse<RecordHistory[]>> {
    try {
      const result = await invoke<RecordHistory[]>('get_record_history', { recordId })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getAllRecordHistory(): Promise<ApiResponse<RecordHistory[]>> {
    try {
      const result = await invoke<RecordHistory[]>('get_all_record_history')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getStatistics(): Promise<ApiResponse<Statistics>> {
    try {
      const result = await invoke<Statistics>('get_statistics')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async batchInsertRecords(records: Record[]): Promise<ApiResponse<{ count: number }>> {
    try {
      const result = await invoke<number>('batch_insert_records', { records })
      return wrapResult({ count: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async openDatabaseFile(): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('open_database_file')
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async createNewDatabase(fileName: string, theme?: string, eventName?: string, eventDate?: string): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('create_new_database', { 
        fileName, 
        theme, 
        eventName, 
        eventDate 
      })
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async switchDatabase(filePath: string): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('switch_database', { filePath })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async saveCurrentDatabase(fileName: string): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('save_current_database', { fileName })
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async renameDatabase(oldPath: string, newFileName: string): Promise<ApiResponse<{ newPath: string }>> {
    try {
      const result = await invoke<string>('rename_database', { oldPath, newFileName })
      return wrapResult({ newPath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getRecentDatabases(): Promise<ApiResponse<{ recentDatabases: { name: string; path: string; createdAt: string; lastModified: string; lastOpened: string; theme?: string; eventName?: string; eventDate?: string }[] }>> {
    try {
      const result = await invoke<{ name: string; path: string; createdAt: string; lastModified: string; lastOpened: string; theme?: string; eventName?: string; eventDate?: string }[]>('get_recent_databases')
      return wrapResult({ recentDatabases: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getDatabaseTheme(filePath: string): Promise<ApiResponse<string | null>> {
    try {
      const result = await invoke<string | null>('get_database_theme', { filePath })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async updateDatabaseTheme(filePath: string, theme: string): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('update_database_theme', { filePath, theme })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async updateDatabaseEventDate(filePath: string, eventDate: string): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('update_database_event_date', { filePath, eventDate })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async deleteDatabase(filePath: string): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('delete_database', { filePath })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async openImportFile(): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('open_import_file')
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async parseImportFile(filePath: string): Promise<ApiResponse<{ headers: string[]; data: any[]; totalRows: number }>> {
    try {
      const result = await invoke<{ headers: string[]; data: any[]; totalRows: number }>('parse_import_file', { filePath })
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async openFontFile(): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('open_font_file')
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getSystemFontsList(): Promise<ApiResponse<FontInfo[]>> {
    try {
      const result = await invoke<FontInfo[]>('get_system_fonts_list')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getDataPath(): Promise<ApiResponse<string>> {
    try {
      const result = await invoke<string>('get_data_path')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getDefaultDataPath(): Promise<ApiResponse<string>> {
    try {
      const result = await invoke<string>('get_default_data_path')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async selectDataFolder(): Promise<ApiResponse<string>> {
    try {
      const result = await invoke<string>('select_data_folder')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async setCustomDataPath(path: string, migrate: boolean): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('set_custom_data_path', { path, migrate })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async openPathInExplorer(path: string): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('open_path_in_explorer', { path })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async saveFileDialog(filename: string, extensions: string[]): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('save_file_dialog', { filename, extensions })
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async generatePDF(data: {
    records: Record[]
    appName: string
    exportDate: string
    filename: string
    theme?: 'red' | 'gray' | 'golden'
  }): Promise<ApiResponse<{ filePath: string }>> {
    try {
      const result = await invoke<string>('generate_pdf', { request: data })
      return wrapResult({ filePath: result })
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async getAppConfig(): Promise<ApiResponse<any>> {
    try {
      const result = await invoke<any>('get_app_config')
      return wrapResult(result)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async updateAppConfig(config: any): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('update_app_config', { config })
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

  async resetAppConfig(): Promise<ApiResponse<void>> {
    try {
      await invoke<void>('reset_app_config')
      return wrapResult(undefined as void)
    } catch (e) {
      return wrapError(String(e))
    }
  },

}

export default bridge