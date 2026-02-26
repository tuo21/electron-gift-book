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
  operationType?: 'UPDATE' | 'DELETE'
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

// 数据库 API 接口
export interface DatabaseAPI {
  getAllRecords: () => Promise<ApiResponse<Record[]>>
  getRecordsPaginated: (page: number, pageSize: number) => Promise<ApiResponse<PaginationResult<Record>>>
  getRecordPage: (recordId: number, pageSize: number) => Promise<ApiResponse<number>>
  getRecordById: (id: number) => Promise<ApiResponse<Record>>
  searchRecords: (keyword: string) => Promise<ApiResponse<Record[]>>
  insertRecord: (record: Record) => Promise<ApiResponse<{ id: number }>>
  updateRecord: (record: Record) => Promise<ApiResponse>
  softDeleteRecord: (id: number) => Promise<ApiResponse>
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
    theme?: {
      primary?: string
      paper?: string
      textPrimary?: string
      accent?: string
    }
  }) => Promise<ApiResponse<{ filePath: string }>>
}

// Electron API 接口（启动页相关）
export interface ElectronAPI {
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
  parseImportFile: (filePath: string) => Promise<ApiResponse<{ headers: string[]; data: any[]; totalRows: number }>>
}

// 扩展 Window 接口
declare global {
  interface Window {
    db: DatabaseAPI
    app: AppAPI
    electronAPI: ElectronAPI
  }
}
