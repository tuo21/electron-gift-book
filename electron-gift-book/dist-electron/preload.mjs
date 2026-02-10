"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
electron.contextBridge.exposeInMainWorld("db", {
  getAllRecords: () => electron.ipcRenderer.invoke("db:getAllRecords"),
  getRecordById: (id) => electron.ipcRenderer.invoke("db:getRecordById", id),
  searchRecords: (keyword) => electron.ipcRenderer.invoke("db:searchRecords", keyword),
  insertRecord: (record) => electron.ipcRenderer.invoke("db:insertRecord", record),
  updateRecord: (record) => electron.ipcRenderer.invoke("db:updateRecord", record),
  softDeleteRecord: (id) => electron.ipcRenderer.invoke("db:softDeleteRecord", id),
  getRecordHistory: (recordId) => electron.ipcRenderer.invoke("db:getRecordHistory", recordId),
  getStatistics: () => electron.ipcRenderer.invoke("db:getStatistics")
});
//# sourceMappingURL=preload.mjs.map
