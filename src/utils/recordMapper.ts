import type { Record as DbRecord } from '../types/database';

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

export function recordToDbRecord(record: DbRecord): DatabaseRecord {
  return {
    Id: record.id,
    GuestName: record.guestName,
    Amount: record.amount,
    AmountChinese: record.amountChinese || null,
    ItemDescription: record.itemDescription || null,
    PaymentType: record.paymentType,
    Remark: record.remark || null,
    IsDeleted: record.isDeleted ?? 0,
  };
}

export function dbRecordToRecord(dbRecord: DatabaseRecord): DbRecord {
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
  };
}

export function dbRecordListToRecordList(dbRecords: DatabaseRecord[]): DbRecord[] {
  return dbRecords.map(dbRecordToRecord);
}
