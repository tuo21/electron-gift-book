import type { Record } from '../types/database'

export function mapApiRecord(apiRecord: any): Record {
  return {
    id: apiRecord.id,
    guestName: apiRecord.guestName,
    amount: apiRecord.amount,
    amountChinese: apiRecord.amountChinese,
    itemDescription: apiRecord.itemDescription,
    paymentType: apiRecord.paymentType,
    remark: apiRecord.remark,
    createTime: apiRecord.createTime,
    updateTime: apiRecord.updateTime,
    isDeleted: apiRecord.isDeleted,
  }
}

export function mapApiRecords(apiRecords: any[]): Record[] {
  return apiRecords.map(mapApiRecord)
}

export interface DatabaseRecord {
  Id?: number
  GuestName: string
  Amount: number
  AmountChinese?: string
  ItemDescription?: string
  PaymentType: number
  Remark?: string
  CreateTime?: string
  UpdateTime?: string
  IsDeleted?: number
}

export function recordToDbRecord(record: Record): DatabaseRecord {
  return {
    Id: record.id,
    GuestName: record.guestName,
    Amount: record.amount,
    AmountChinese: record.amountChinese || undefined,
    ItemDescription: record.itemDescription || undefined,
    PaymentType: record.paymentType,
    Remark: record.remark || undefined,
    IsDeleted: record.isDeleted ?? 0,
  }
}

export function dbRecordToRecord(dbRecord: DatabaseRecord): Record {
  return {
    id: dbRecord.Id,
    guestName: dbRecord.GuestName,
    amount: dbRecord.Amount,
    amountChinese: dbRecord.AmountChinese,
    itemDescription: dbRecord.ItemDescription,
    paymentType: dbRecord.PaymentType,
    remark: dbRecord.Remark,
    createTime: dbRecord.CreateTime,
    updateTime: dbRecord.UpdateTime,
    isDeleted: dbRecord.IsDeleted,
  }
}

export function dbRecordListToRecordList(dbRecords: DatabaseRecord[]): Record[] {
  return dbRecords.map(dbRecordToRecord)
}
