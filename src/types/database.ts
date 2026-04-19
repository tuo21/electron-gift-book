import type { ThemeType } from './theme';

// 记录类型
export interface Record {
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

// 历史记录类型
export interface RecordHistory {
  historyId?: number
  recordId: number
  guestName: string
  amount?: number
  itemDescription?: string
  paymentType?: number
  remark?: string
  newGuestName?: string
  newAmount?: number
  newItemDescription?: string
  newPaymentType?: number
  newRemark?: string
  operationType?: 'UPDATE' | 'DELETE' | 'RESTORE'
  updateBy?: string
  updateTime?: string
  changeDesc?: string
}

// 统计数据类型
export interface Statistics {
  totalCount: number
  totalAmount: number
  cashAmount: number
  wechatAmount: number
  internalAmount: number
}

// 数据库 API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 分页结果类型
export interface PaginationResult<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 字体信息类型
export interface FontInfo {
  name: string        // 显示名称
  css_name: string     // CSS 字体名称
  is_default: boolean  // 是否为默认字体
}

// 数据库 API 接口
export interface DatabaseAPI {
  getAllRecords: () => Promise<ApiResponse<Record[]>>
  getRecordsPaginated: (page: number, pageSize: number) => Promise<ApiResponse<PaginationResult<Record>>>
  getRecordPage: (recordId: number, pageSize: number) => Promise<ApiResponse<number | null>>
  getRecordById: (id: number) => Promise<ApiResponse<Record>>
  searchRecords: (keyword: string) => Promise<ApiResponse<Record[]>>
  insertRecord: (record: Record) => Promise<ApiResponse<{ id: number }>>
  updateRecord: (record: Record) => Promise<ApiResponse>
  softDeleteRecord: (id: number) => Promise<ApiResponse>
  restoreDeletedRecord: (history: RecordHistory) => Promise<ApiResponse<{ id: number }>>
  getRecordHistory: (recordId: number) => Promise<ApiResponse<RecordHistory[]>>
  getAllRecordHistory: () => Promise<ApiResponse<RecordHistory[]>>
  getStatistics: () => Promise<ApiResponse<Statistics>>
  batchInsertRecords: (records: Record[]) => Promise<ApiResponse<{ count: number }>>
}

// 应用 API 接口
export interface AppAPI {
  generatePDF: (data: {
    records: Record[]
    appName: string
    exportDate: string
    filename: string
    theme?: ThemeType
  }) => Promise<ApiResponse<{ filePath: string }>>
}

// Tauri 后端 API 接口（启动页、文件管理、导入导出相关）
export interface TauriAPI {
  // 打开数据库文件对话框
  openDatabaseFile: () => Promise<ApiResponse<{ filePath: string }>>
  // 创建新数据库
  createNewDatabase: (fileName: string, theme?: string, eventName?: string, eventDate?: string) => Promise<ApiResponse<{ filePath: string }>>
  // 切换数据库
  switchDatabase: (filePath: string) => Promise<ApiResponse>
  // 保存当前数据库
  saveCurrentDatabase: (fileName: string) => Promise<ApiResponse<{ filePath: string }>>
  // 重命名数据库
  renameDatabase: (oldPath: string, newFileName: string) => Promise<ApiResponse<{ newPath: string }>>
  // 获取最近打开的文件列表
  getRecentDatabases: () => Promise<ApiResponse<{ recentDatabases: { name: string; path: string; createdAt: string; lastModified: string; lastOpened: string; theme?: string; eventName?: string; eventDate?: string }[] }>>
  // 删除数据库文件
  deleteDatabase: (filePath: string) => Promise<ApiResponse>
  // 获取数据库主题
  getDatabaseTheme: (filePath: string) => Promise<ApiResponse<string | null>>
  // 更新数据库主题
  updateDatabaseTheme: (filePath: string, theme: string) => Promise<ApiResponse>
  // 更新数据库事件日期
  updateDatabaseEventDate: (filePath: string, eventDate: string) => Promise<ApiResponse>
  // 打开导入文件对话框（Excel）
  openImportFile: () => Promise<ApiResponse<{ filePath: string }>>
  // 解析导入文件
  parseImportFile: (filePath: string) => Promise<ApiResponse<{ headers: string[]; data: any[]; totalRows: number }>>
  // 打开字体文件对话框
  openFontFile: () => Promise<ApiResponse<{ filePath: string }>>
  // 获取系统字体列表
  getSystemFontsList: () => Promise<ApiResponse<FontInfo[]>>
  // 数据存储路径管理
  getDataPath: () => Promise<ApiResponse<string>>
  getDefaultDataPath: () => Promise<ApiResponse<string>>
  selectDataFolder: () => Promise<ApiResponse<string>>
  setCustomDataPath: (path: string, migrate: boolean) => Promise<ApiResponse>
  openPathInExplorer: (path: string) => Promise<ApiResponse>
}

// 扩展 Window 接口
declare global {
  interface Window {
    db: DatabaseAPI
    app: AppAPI
    electronAPI: TauriAPI
    confirmDialog: (message: string, options?: { 
      title?: string, 
      confirmText?: string, 
      cancelText?: string, 
      confirmType?: 'danger' | 'warning' | 'primary' 
    }) => Promise<boolean>
  }
}

export {};