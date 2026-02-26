import { ipcRenderer, contextBridge } from 'electron'

// 数据库操作 API 响应类型
type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: string }

// 记录类型
interface DbRecord {
  id?: number
  guestName: string
  amount: number
  amountChinese?: string
  itemDescription?: string
  paymentType: number
  remark?: string
  createTime?: string
  updateTime?: string
  isDeleted?: number
}

// 分页结果类型
interface PaginationResult<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 数据库操作 API
interface DatabaseAPI {
  getAllRecords: () => Promise<ApiResponse<DbRecord[]>>
  getRecordsPaginated: (page: number, pageSize: number) => Promise<ApiResponse<PaginationResult<DbRecord>>>
  getRecordPage: (recordId: number, pageSize: number) => Promise<ApiResponse<number>>
  getRecordById: (id: number) => Promise<ApiResponse<DbRecord>>
  searchRecords: (keyword: string) => Promise<ApiResponse<DbRecord[]>>
  insertRecord: (record: DbRecord) => Promise<ApiResponse<{ id: number }>>
  updateRecord: (record: DbRecord) => Promise<ApiResponse>
  softDeleteRecord: (id: number) => Promise<ApiResponse>
  getRecordHistory: (recordId: number) => Promise<ApiResponse<any[]>>
  getAllRecordHistory: () => Promise<ApiResponse<any[]>>
  getStatistics: () => Promise<ApiResponse<any>>
  batchInsertRecords: (records: DbRecord[]) => Promise<ApiResponse<{ count: number }>>
}

// 应用 API 接口
interface AppAPI {
  generatePDF: (data: {
    records: any[]
    appName: string
    exportDate: string
    filename: string
    theme?: {
      primary?: string
      paper?: string
      textPrimary?: string
      accent?: string
    }
  }) => Promise<ApiResponse<{ filePath: string }>>
}

// Electron API 接口（新增）
interface ElectronAPI {
  // 打开数据库文件对话框
  openDatabaseFile: () => Promise<ApiResponse<{ filePath: string }>>
  // 创建新数据库
  createNewDatabase: (fileName: string) => Promise<ApiResponse<{ filePath: string }>>
  // 切换数据库
  switchDatabase: (filePath: string) => Promise<ApiResponse>
  // 保存当前数据库
  saveCurrentDatabase: (fileName: string) => Promise<ApiResponse<{ filePath: string }>>
  // 获取最近打开的文件列表
  getRecentDatabases: () => Promise<ApiResponse<{ recentDatabases: { name: string; path: string; lastOpened: string }[] }>>
  // 删除数据库文件
  deleteDatabase: (filePath: string) => Promise<ApiResponse>
  // 打开导入文件对话框（Excel）
  openImportFile: () => Promise<ApiResponse<{ filePath: string }>>
  // 解析导入文件
  parseImportFile: (filePath: string) => Promise<ApiResponse<{ headers: string[]; data: any[][]; totalRows: number }>>
}

// 只暴露必要的数据库 API，遵循 Electron 安全最佳实践
contextBridge.exposeInMainWorld('db', {
  getAllRecords: () => ipcRenderer.invoke('db:getAllRecords'),
  getRecordsPaginated: (page: number, pageSize: number) => ipcRenderer.invoke('db:getRecordsPaginated', page, pageSize),
  getRecordPage: (recordId: number, pageSize: number) => ipcRenderer.invoke('db:getRecordPage', recordId, pageSize),
  getRecordById: (id: number) => ipcRenderer.invoke('db:getRecordById', id),
  searchRecords: (keyword: string) => ipcRenderer.invoke('db:searchRecords', keyword),
  insertRecord: (record: DbRecord) => ipcRenderer.invoke('db:insertRecord', record),
  updateRecord: (record: DbRecord) => ipcRenderer.invoke('db:updateRecord', record),
  softDeleteRecord: (id: number) => ipcRenderer.invoke('db:softDeleteRecord', id),
  getRecordHistory: (recordId: number) => ipcRenderer.invoke('db:getRecordHistory', recordId),
  getAllRecordHistory: () => ipcRenderer.invoke('db:getAllRecordHistory'),
  getStatistics: () => ipcRenderer.invoke('db:getStatistics'),
  batchInsertRecords: (records: DbRecord[]) => ipcRenderer.invoke('db:batchInsertRecords', records),
} as DatabaseAPI)

// 暴露应用 API
contextBridge.exposeInMainWorld('app', {
  generatePDF: (data: Parameters<AppAPI['generatePDF']>[0]) => ipcRenderer.invoke('app:generatePDF', data),
} as AppAPI)

// 暴露 Electron API（新增）
contextBridge.exposeInMainWorld('electronAPI', {
  openDatabaseFile: () => ipcRenderer.invoke('electron:openDatabaseFile'),
  createNewDatabase: (fileName: string) => ipcRenderer.invoke('electron:createNewDatabase', fileName),
  switchDatabase: (filePath: string) => ipcRenderer.invoke('electron:switchDatabase', filePath),
  saveCurrentDatabase: (fileName: string) => ipcRenderer.invoke('electron:saveCurrentDatabase', fileName),
  getRecentDatabases: () => ipcRenderer.invoke('electron:getRecentDatabases'),
  deleteDatabase: (filePath: string) => ipcRenderer.invoke('electron:deleteDatabase', filePath),
  openImportFile: () => ipcRenderer.invoke('electron:openImportFile'),
  parseImportFile: (filePath: string) => ipcRenderer.invoke('electron:parseImportFile', filePath),
  // 安全 IPC 通信（用于 print.html）
  sendToMain: (channel: string, data: any) => {
    const validChannels = ['print-ready', 'render-giftbook'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  onFromMain: (channel: string, callback: (event: any, data: any) => void) => {
    const validChannels = ['render-giftbook'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  }
} as ElectronAPI)

// 类型声明已移至 src/types/database.ts
