export interface BookInfo {
  name: string
  theme: 'red' | 'gray'
  coverColor: string
  createTime?: string
}

export interface GiftRecord {
  name: string
  amount: number          // 单位：分
  paymentMethod: number   // 0-现金, 1-微信, 2-内收
  remark?: string
  giftItem?: string
  eventDate?: string
}

export interface SyncQRData {
  qrDataUrl: string
  token: string
  expiresAt: number
}

export type SyncStatus = 'loading' | 'qr' | 'success' | 'expired' | 'error'

export interface SyncUploadPayload {
  action: 'upload'
  bookInfo: BookInfo
  records: GiftRecord[]
}

export interface SyncStatusPayload {
  action: 'status'
  token: string
}