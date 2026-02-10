"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("db", {
  getAllRecords: () => electron.ipcRenderer.invoke("db:getAllRecords"),
  getRecordById: (id) => electron.ipcRenderer.invoke("db:getRecordById", id),
  searchRecords: (keyword) => electron.ipcRenderer.invoke("db:searchRecords", keyword),
  insertRecord: (record) => electron.ipcRenderer.invoke("db:insertRecord", record),
  updateRecord: (record) => electron.ipcRenderer.invoke("db:updateRecord", record),
  softDeleteRecord: (id) => electron.ipcRenderer.invoke("db:softDeleteRecord", id),
  getRecordHistory: (recordId) => electron.ipcRenderer.invoke("db:getRecordHistory", recordId),
  getAllRecordHistory: () => electron.ipcRenderer.invoke("db:getAllRecordHistory"),
  getStatistics: () => electron.ipcRenderer.invoke("db:getStatistics"),
  batchInsertRecords: (records) => electron.ipcRenderer.invoke("db:batchInsertRecords", records)
});
electron.contextBridge.exposeInMainWorld("app", {
  generatePDF: (data) => electron.ipcRenderer.invoke("app:generatePDF", data)
});
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openDatabaseFile: () => electron.ipcRenderer.invoke("electron:openDatabaseFile"),
  createNewDatabase: (fileName) => electron.ipcRenderer.invoke("electron:createNewDatabase", fileName),
  switchDatabase: (filePath) => electron.ipcRenderer.invoke("electron:switchDatabase", filePath),
  saveCurrentDatabase: (fileName) => electron.ipcRenderer.invoke("electron:saveCurrentDatabase", fileName),
  getRecentDatabases: () => electron.ipcRenderer.invoke("electron:getRecentDatabases"),
  deleteDatabase: (filePath) => electron.ipcRenderer.invoke("electron:deleteDatabase", filePath),
  openImportFile: () => electron.ipcRenderer.invoke("electron:openImportFile"),
  parseImportFile: (filePath) => electron.ipcRenderer.invoke("electron:parseImportFile", filePath)
});
//# sourceMappingURL=preload.mjs.map
