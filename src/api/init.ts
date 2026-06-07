import { bridge } from './bridge'
import type { DatabaseAPI, AppAPI, TauriAPI } from '../types/database'
import { licenseAPI } from './license'

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

  const electronAPI: TauriAPI = {
    openDatabaseFile: bridge.openDatabaseFile,
    createNewDatabase: bridge.createNewDatabase,
    switchDatabase: bridge.switchDatabase,
    saveCurrentDatabase: bridge.saveCurrentDatabase,
    renameDatabase: bridge.renameDatabase,
    getRecentDatabases: bridge.getRecentDatabases,
    deleteDatabase: bridge.deleteDatabase,
    getDatabaseTheme: bridge.getDatabaseTheme,
    updateDatabaseTheme: bridge.updateDatabaseTheme,
    updateDatabaseEventDate: bridge.updateDatabaseEventDate,
    openImportFile: bridge.openImportFile,
    parseImportFile: bridge.parseImportFile,
    openFontFile: bridge.openFontFile,
    getSystemFontsList: bridge.getSystemFontsList,
    getDataPath: bridge.getDataPath,
    getDefaultDataPath: bridge.getDefaultDataPath,
    selectDataFolder: bridge.selectDataFolder,
    setCustomDataPath: bridge.setCustomDataPath,
    openPathInExplorer: bridge.openPathInExplorer,
    saveFileDialog: bridge.saveFileDialog,
    getAllRecordsByPath: bridge.getAllRecordsByPath,
  }

  window.db = db
  window.app = app
  window.electronAPI = electronAPI
  window.license = licenseAPI
}

initAPI()
