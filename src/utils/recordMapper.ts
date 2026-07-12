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
    groupId: apiRecord.groupId,
    groupRole: apiRecord.groupRole,
    groupTotal: apiRecord.groupTotal,
    groupExpense: apiRecord.groupExpense,
    groupBalance: apiRecord.groupBalance,
    groupExpenseDetail: apiRecord.groupExpenseDetail,
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
  GroupId?: number
  GroupRole?: string
  GroupTotal?: number
  GroupExpense?: number
  GroupBalance?: number
  GroupExpenseDetail?: string
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
    GroupId: record.groupId || undefined,
    GroupRole: record.groupRole || undefined,
    GroupTotal: record.groupTotal || undefined,
    GroupExpense: record.groupExpense || undefined,
    GroupBalance: record.groupBalance || undefined,
    GroupExpenseDetail: record.groupExpenseDetail || undefined,
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
    groupId: dbRecord.GroupId,
    groupRole: dbRecord.GroupRole as any,
    groupTotal: dbRecord.GroupTotal,
    groupExpense: dbRecord.GroupExpense,
    groupBalance: dbRecord.GroupBalance,
    groupExpenseDetail: dbRecord.GroupExpenseDetail,
  }
}

export function dbRecordListToRecordList(dbRecords: DatabaseRecord[]): Record[] {
  return dbRecords.map(dbRecordToRecord)
}
