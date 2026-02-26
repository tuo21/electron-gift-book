/**
 * 导出业务服务
 * 负责导出相关的业务逻辑，包括数据准备和格式处理
 */

import type { Record } from '../types/database'
import { exportToExcel, exportToPDF } from '../utils/export'
import { numberToChinese } from '../utils/amountConverter'
import { getPaymentTypeText } from '../constants'

/**
 * 准备记录数据用于导出
 * @param records 记录列表
 * @param includeStats 是否包含统计信息
 * @returns 格式化后的导出数据
 */
export function prepareExportData(
  records: Record[],
  includeStats: boolean = true
): {
  records: Array<{
    序号: number
    姓名: string
    '金额（元）': number
    '金额（大写）': string
    物品: string
    支付方式: string
    备注: string
    创建时间: string
  }>
  statistics?: {
    总金额: number
    平均金额: number
    最大金额: number
    最小金额: number
    记录条数: number
  }
} {
  // 格式化记录数据
  const formattedRecords = records.map((record, index) => ({
    序号: index + 1,
    姓名: record.guestName,
    '金额（元）': record.amount,
    '金额（大写）': record.amountChinese || numberToChinese(record.amount),
    物品: record.itemDescription || '',
    支付方式: getPaymentTypeText(record.paymentType),
    备注: record.remark || '',
    创建时间: record.createTime || '',
  }))

  // 计算统计信息（如果需要）
  let statistics = undefined
  if (includeStats && records.length > 0) {
    const amounts = records.map(r => r.amount)
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
    const maxAmount = Math.max(...amounts)
    const minAmount = Math.min(...amounts)

    statistics = {
      总金额: totalAmount,
      平均金额: totalAmount / records.length,
      最大金额: maxAmount,
      最小金额: minAmount,
      记录条数: records.length,
    }
  }

  return {
    records: formattedRecords,
    statistics,
  }
}

/**
 * 导出记录到 Excel
 * @param records 记录列表
 * @param eventName 事务名称
 * @param includeStats 是否包含统计信息
 */
export function exportRecordsToExcel(
  records: Record[],
  eventName: string = '电子礼金簿',
  includeStats: boolean = true
): void {
  // 准备导出数据
  const exportData = prepareExportData(records, includeStats)

  // 如果有统计信息，添加到工作表
  if (exportData.statistics && exportData.records.length > 0) {
    // 目前 exportToExcel 不支持统计信息，可以扩展或单独处理
    // 暂时只导出记录数据
  }

  // 调用现有的导出函数
  exportToExcel(records, eventName)
}

/**
 * 导出记录到 PDF
 * @param records 记录列表
 * @param eventName 事务名称
 * @param theme 主题配置
 * @param includeStats 是否包含统计信息
 */
export async function exportRecordsToPDF(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme?: {
    primary?: string
    paper?: string
    textPrimary?: string
    accent?: string
  }
): Promise<void> {
  // 调用现有的导出函数
  await exportToPDF(records, eventName, theme)
}

/**
 * 导出统计报告
 * @param records 记录列表
 * @param eventName 事务名称
 */
export async function exportStatisticsReport(
  records: Record[],
  eventName: string = '电子礼金簿'
): Promise<void> {
  if (records.length === 0) {
    throw new Error('没有记录可导出')
  }

  // 计算详细统计信息
  const amounts = records.map(r => r.amount)
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
  const averageAmount = totalAmount / records.length
  const maxAmount = Math.max(...amounts)
  const minAmount = Math.min(...amounts)

  // 按支付方式分组统计
  const paymentStatsMap: { [key: number]: { count: number; total: number } } = {}
  records.forEach(record => {
    if (!paymentStatsMap[record.paymentType]) {
      paymentStatsMap[record.paymentType] = { count: 0, total: 0 }
    }
    paymentStatsMap[record.paymentType].count++
    paymentStatsMap[record.paymentType].total += record.amount
  })

  // 准备统计数据
  const statsData = [
    ['统计项目', '数值'],
    ['总记录数', records.length],
    ['总金额', totalAmount],
    ['平均金额', averageAmount.toFixed(2)],
    ['最大金额', maxAmount],
    ['最小金额', minAmount],
    ['', ''],
    ['支付方式统计', ''],
  ]

  Object.entries(paymentStatsMap).forEach(([paymentType, stats]) => {
    const paymentTypeText = getPaymentTypeText(parseInt(paymentType, 10))
    statsData.push([
      `${paymentTypeText} (${(stats as { count: number; total: number }).count}笔)`,
      (stats as { count: number; total: number }).total,
    ])
  })

  // 创建新的工作簿
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(statsData)

  // 设置列宽
  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
  ]

  // 添加工作表
  XLSX.utils.book_append_sheet(wb, ws, '统计报告')

  // 生成文件名
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const cleanName = eventName.replace(/[\\/:*?"<>|]/g, '_')
  const filename = `${cleanName}_统计报告_${dateStr}`

  // 保存文件
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 导出编辑历史
 * @param historyList 编辑历史列表
 * @param eventName 事务名称
 */
export function exportEditHistory(
  historyList: Array<{
    recordId: number
    guestName: string
    changeType: string
    oldValue?: string
    newValue?: string
    changeTime: string
    operator: string
  }>,
  eventName: string = '电子礼金簿'
): void {
  if (historyList.length === 0) {
    throw new Error('没有编辑历史可导出')
  }

  // 准备数据
  const data = historyList.map((history, index) => ({
    '序号': index + 1,
    '记录ID': history.recordId,
    '姓名': history.guestName,
    '变更类型': history.changeType,
    '旧值': history.oldValue || '',
    '新值': history.newValue || '',
    '变更时间': history.changeTime,
    '操作人': history.operator,
  }))

  // 创建新的工作簿
  const XLSX = require('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  ws['!cols'] = [
    { wch: 8 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
  ]

  // 添加工作表
  XLSX.utils.book_append_sheet(wb, ws, '编辑历史')

  // 生成文件名
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const cleanName = eventName.replace(/[\\/:*?"<>|]/g, '_')
  const filename = `${cleanName}_编辑历史_${dateStr}`

  // 保存文件
  XLSX.writeFile(wb, `${filename}.xlsx`)
}