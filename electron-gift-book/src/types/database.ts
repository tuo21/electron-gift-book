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

// 数据库 API 接口
export interface DatabaseAPI {
  getAllRecords: () => Promise<ApiResponse<Record[]>>
  getRecordById: (id: number) => Promise<ApiResponse<Record>>
  searchRecords: (keyword: string) => Promise<ApiResponse<Record[]>>
  insertRecord: (record: Record) => Promise<ApiResponse<{ id: number }>>
  updateRecord: (record: Record) => Promise<ApiResponse>
  softDeleteRecord: (id: number) => Promise<ApiResponse>
  getRecordHistory: (recordId: number) => Promise<ApiResponse<RecordHistory[]>>
  getStatistics: () => Promise<ApiResponse<Statistics>>
}

// 扩展 Window 接口
declare global {
  interface Window {
    db: DatabaseAPI
  }
}
