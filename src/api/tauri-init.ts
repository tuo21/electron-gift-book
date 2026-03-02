import { bridge } from './bridge'
import type { DatabaseAPI, AppAPI, ElectronAPI } from '../types/database'

function initTauriAPI() {
  console.log('[Tauri Init] checkIsTauri:', bridge.checkIsTauri())
  console.log('[Tauri Init] window.__TAURI_METADATA__:', (window as any).__TAURI_METADATA__)
  console.log('[Tauri Init] window.__TAURI__:', (window as any).__TAURI__)
  
  if (!bridge.checkIsTauri()) {
    console.log('[Tauri Init] Not in Tauri environment, skipping initialization')
    return
  }

  console.log('[Tauri Init] Initializing Tauri API...')

  const db: DatabaseAPI = {
    getAllRecords: bridge.getAllRecords,
    getRecordsPaginated: bridge.getRecordsPaginated,
    getRecordPage: bridge.getRecordPage,
    getRecordById: bridge.getRecordById,
    searchRecords: bridge.searchRecords,
    insertRecord: bridge.insertRecord,
    updateRecord: bridge.updateRecord,
    softDeleteRecord: bridge.softDeleteRecord,
    getRecordHistory: bridge.getRecordHistory,
    getAllRecordHistory: bridge.getAllRecordHistory,
    getStatistics: bridge.getStatistics,
    batchInsertRecords: bridge.batchInsertRecords,
  }

  const app: AppAPI = {
    generatePDF: bridge.generatePDF,
  }

  const electronAPI: ElectronAPI = {
    openDatabaseFile: bridge.openDatabaseFile,
    createNewDatabase: bridge.createNewDatabase,
    switchDatabase: bridge.switchDatabase,
    saveCurrentDatabase: bridge.saveCurrentDatabase,
    getRecentDatabases: bridge.getRecentDatabases,
    deleteDatabase: bridge.deleteDatabase,
    openImportFile: bridge.openImportFile,
    parseImportFile: bridge.parseImportFile,
  }

  window.db = db
  window.app = app
  window.electronAPI = electronAPI
  
  console.log('[Tauri Init] Tauri API initialized successfully')
}

initTauriAPI()
