import { ipcRenderer, contextBridge } from 'electron'

// 数据库操作 API 响应类型
type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: string }

// 数据库操作 API
interface DatabaseAPI {
  getAllRecords: () => Promise<ApiResponse<any[]>>
  getRecordById: (id: number) => Promise<ApiResponse<any>>
  searchRecords: (keyword: string) => Promise<ApiResponse<any[]>>
  insertRecord: (record: any) => Promise<ApiResponse<{ id: number }>>
  updateRecord: (record: any) => Promise<ApiResponse>
  softDeleteRecord: (id: number) => Promise<ApiResponse>
  getRecordHistory: (recordId: number) => Promise<ApiResponse<any[]>>
  getStatistics: () => Promise<ApiResponse<any>>
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// 暴露数据库 API
contextBridge.exposeInMainWorld('db', {
  getAllRecords: () => ipcRenderer.invoke('db:getAllRecords'),
  getRecordById: (id: number) => ipcRenderer.invoke('db:getRecordById', id),
  searchRecords: (keyword: string) => ipcRenderer.invoke('db:searchRecords', keyword),
  insertRecord: (record: Record) => ipcRenderer.invoke('db:insertRecord', record),
  updateRecord: (record: Record) => ipcRenderer.invoke('db:updateRecord', record),
  softDeleteRecord: (id: number) => ipcRenderer.invoke('db:softDeleteRecord', id),
  getRecordHistory: (recordId: number) => ipcRenderer.invoke('db:getRecordHistory', recordId),
  getStatistics: () => ipcRenderer.invoke('db:getStatistics'),
} as DatabaseAPI)

// 类型声明，供渲染进程使用
declare global {
  interface Window {
    db: DatabaseAPI
  }
}
