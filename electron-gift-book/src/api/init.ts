import { bridge } from './bridge'
import type { DatabaseAPI, AppAPI, ElectronAPI } from '../types/database'

function initAPI() {
  const db: DatabaseAPI = {
    getAllRecords: bridge.getAllRecords,
    getRecordsPaginated: bridge.getRecordsPaginated,
    getRecordPage: bridge.getRecordPage,
    getRecordById: bridge.getRecordById,
    searchRecords: bridge.searchRecords,
    insertRecord: bridge.insertRecord,
    updateRecord: bridge.updateRecord,
    softDeleteRecord: bridge.softDeleteRecord,
    restoreDeletedRecord: bridge.restoreDeletedRecord,
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
}

initAPI()
