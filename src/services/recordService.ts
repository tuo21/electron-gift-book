/**
 * 记录业务服务
 * 负责记录相关的业务逻辑，包括验证、转换和复杂操作
 */

import type { Record } from '../types/database'
import type { DatabaseRecord } from '../utils/recordMapper'
import { recordToDbRecord, dbRecordListToRecordList } from '../utils/recordMapper'

/**
 * 验证记录数据
 * @param record 记录数据
 * @returns 错误消息数组，空数组表示验证通过
 */
export function validateRecord(record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): string[] {
  const errors: string[] = []

  if (!record.guestName?.trim()) {
    errors.push('姓名不能为空')
  }

  if (record.amount <= 0) {
    errors.push('金额必须大于0')
  }

  if (record.amount > 1000000) {
    errors.push('金额不能超过100万')
  }

  if (record.guestName.length > 50) {
    errors.push('姓名长度不能超过50个字符')
  }

  if (record.itemDescription && record.itemDescription.length > 200) {
    errors.push('物品描述长度不能超过200个字符')
  }

  if (record.remark && record.remark.length > 500) {
    errors.push('备注长度不能超过500个字符')
  }

  return errors
}

/**
 * 准备记录数据用于数据库存储
 * @param record 应用层记录
 * @returns 数据库记录格式
 */
export function prepareRecordForDb(record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): Omit<DatabaseRecord, 'Id' | 'CreateTime' | 'UpdateTime'> {
  return recordToDbRecord({
    id: 0,
    guestName: record.guestName.trim(),
    amount: record.amount,
    amountChinese: record.amountChinese || '',
    itemDescription: record.itemDescription?.trim() || '',
    paymentType: record.paymentType,
    remark: record.remark?.trim() || '',
    isDeleted: 0,
  })
}

/**
 * 准备更新记录数据
 * @param record 应用层记录
 * @returns 数据库记录格式
 */
export function prepareRecordUpdateForDb(record: Record): DatabaseRecord {
  return recordToDbRecord({
    ...record,
    guestName: record.guestName.trim(),
    itemDescription: record.itemDescription?.trim() || '',
    remark: record.remark?.trim() || '',
  })
}

/**
 * 转换数据库记录到应用层记录列表
 * @param dbRecords 数据库记录列表
 * @returns 应用层记录列表
 */
export function convertDbRecordsToAppRecords(dbRecords: any[]): Record[] {
  return dbRecordListToRecordList(dbRecords)
}

/**
 * 计算记录统计信息
 * @param records 记录列表
 * @returns 统计信息对象
 */
export function calculateRecordStatistics(records: Record[]): {
  totalAmount: number
  averageAmount: number
  maxAmount: number
  minAmount: number
  recordCount: number
} {
  if (records.length === 0) {
    return {
      totalAmount: 0,
      averageAmount: 0,
      maxAmount: 0,
      minAmount: 0,
      recordCount: 0,
    }
  }

  const amounts = records.map(r => r.amount)
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
  const maxAmount = Math.max(...amounts)
  const minAmount = Math.min(...amounts)

  return {
    totalAmount,
    averageAmount: totalAmount / records.length,
    maxAmount,
    minAmount,
    recordCount: records.length,
  }
}

/**
 * 过滤记录（用于客户端过滤）
 * @param records 记录列表
 * @param criteria 过滤条件
 * @returns 过滤后的记录列表
 */
export function filterRecords(
  records: Record[],
  criteria: {
    keyword?: string
    minAmount?: number
    maxAmount?: number
    paymentType?: number
  }
): Record[] {
  return records.filter(record => {
    // 关键词过滤
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase()
      const matchesKeyword = 
        record.guestName.toLowerCase().includes(keyword) ||
        record.remark?.toLowerCase().includes(keyword) ||
        record.itemDescription?.toLowerCase().includes(keyword) ||
        record.amount.toString().includes(keyword) ||
        (record.amountChinese && record.amountChinese.includes(keyword))
      if (!matchesKeyword) return false
    }

    // 金额范围过滤
    if (criteria.minAmount !== undefined && record.amount < criteria.minAmount) {
      return false
    }
    if (criteria.maxAmount !== undefined && record.amount > criteria.maxAmount) {
      return false
    }

    // 支付方式过滤
    if (criteria.paymentType !== undefined && record.paymentType !== criteria.paymentType) {
      return false
    }

    return true
  })
}