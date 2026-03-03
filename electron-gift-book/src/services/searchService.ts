/**
 * 搜索业务服务
 * 负责搜索相关的业务逻辑，包括关键词处理和搜索优化
 */

import type { Record } from '../types/database'

/**
 * 处理搜索关键词
 * @param keyword 原始关键词
 * @returns 处理后的关键词
 */
export function processSearchKeyword(keyword: string): string {
  if (!keyword) return ''

  // 去除首尾空格
  let processed = keyword.trim()

  // 移除多余空格
  processed = processed.replace(/\s+/g, ' ')

  // 如果关键词是纯数字，尝试匹配金额
  if (/^\d+$/.test(processed)) {
    // 保留原数字，数据库搜索会处理金额匹配
    return processed
  }

  return processed
}

/**
 * 分割关键词为搜索条件
 * @param keyword 关键词
 * @returns 搜索条件数组
 */
export function splitSearchConditions(keyword: string): string[] {
  if (!keyword) return []

  // 按空格分割
  const parts = keyword.split(' ').filter(part => part.length > 0)

  // 合并中文连续字符（防止单字分割影响搜索）
  const result: string[] = []
  let currentChinese = ''

  for (const part of parts) {
    // 检查是否为中文字符
    const isChinese = /[\u4e00-\u9fa5]/.test(part)

    if (isChinese && part.length === 1) {
      // 单中文字符，累积
      currentChinese += part
    } else {
      // 如果不是单中文字符，先处理累积的中文字符
      if (currentChinese) {
        result.push(currentChinese)
        currentChinese = ''
      }
      // 添加当前部分
      result.push(part)
    }
  }

  // 处理剩余的中文字符
  if (currentChinese) {
    result.push(currentChinese)
  }

  return result
}

/**
 * 构建搜索 SQL 条件
 * @param keyword 关键词
 * @returns SQL WHERE 条件片段和参数
 */
export function buildSearchSqlCondition(keyword: string): {
  whereClause: string
  params: string[]
} {
  const processedKeyword = processSearchKeyword(keyword)
  if (!processedKeyword) {
    return {
      whereClause: '1=1',
      params: [],
    }
  }

  const conditions = splitSearchConditions(processedKeyword)
  const whereParts: string[] = []
  const params: string[] = []

  conditions.forEach((condition) => {
    // 如果是数字，可能是金额
    if (/^\d+$/.test(condition)) {
      const amount = parseInt(condition, 10)
      whereParts.push(`(guestName LIKE ? OR amount = ? OR remark LIKE ?)`)
      params.push(`%${condition}%`, amount.toString(), `%${condition}%`)
    } else {
      // 文本搜索
      whereParts.push(`(guestName LIKE ? OR remark LIKE ? OR itemDescription LIKE ? OR amountChinese LIKE ?)`)
      params.push(`%${condition}%`, `%${condition}%`, `%${condition}%`, `%${condition}%`)
    }
  })

  const whereClause = whereParts.length > 0 
    ? `(${whereParts.join(' AND ')}) AND isDeleted = 0`
    : 'isDeleted = 0'

  return { whereClause, params }
}

/**
 * 在客户端过滤记录（用于小数据集）
 * @param records 记录列表
 * @param keyword 关键词
 * @returns 过滤后的记录列表
 */
export function filterRecordsByKeyword(records: Record[], keyword: string): Record[] {
  if (!keyword) return records

  const processedKeyword = processSearchKeyword(keyword).toLowerCase()

  return records.filter(record => {
    // 检查各个字段是否包含关键词
    return (
      record.guestName.toLowerCase().includes(processedKeyword) ||
      record.remark?.toLowerCase().includes(processedKeyword) ||
      record.itemDescription?.toLowerCase().includes(processedKeyword) ||
      record.amount.toString().includes(processedKeyword) ||
      (record.amountChinese && record.amountChinese.includes(processedKeyword))
    )
  })
}

/**
 * 高级搜索：组合多个条件
 * @param records 记录列表
 * @param criteria 搜索条件
 * @returns 过滤后的记录列表
 */
export function advancedSearch(
  records: Record[],
  criteria: {
    keyword?: string
    minAmount?: number
    maxAmount?: number
    paymentType?: number
    startDate?: string
    endDate?: string
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

    // 日期范围过滤（如果有创建时间）
    if (record.createTime) {
      const recordDate = new Date(record.createTime)
      
      if (criteria.startDate) {
        const startDate = new Date(criteria.startDate)
        if (recordDate < startDate) return false
      }

      if (criteria.endDate) {
        const endDate = new Date(criteria.endDate)
        endDate.setHours(23, 59, 59, 999) // 包含当天
        if (recordDate > endDate) return false
      }
    }

    return true
  })
}