/**
 * 导出功能工具函数
 * 支持 Excel 和 PDF 格式导出
 */

import * as XLSX from 'xlsx'
import type { Record } from '../types/database'
import { numberToChinese } from './amountConverter'
import { getPaymentTypeText } from '../constants'

/**
 * 导出为 Excel 文件
 * @param records 记录列表
 * @param filename 文件名（不含扩展名）
 */
export function exportToExcel(records: Record[], filename: string = '礼金簿导出'): void {
  // 准备数据
  const data = records.map((record, index) => ({
    '序号': index + 1,
    '姓名': record.guestName,
    '金额（元）': record.amount,
    '金额（大写）': record.amountChinese || numberToChinese(record.amount),
    '物品': record.itemDescription || '',
    '支付方式': getPaymentTypeText(record.paymentType),
    '备注': record.remark || '',
    '创建时间': record.createTime || '',
  }))

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  const colWidths = [
    { wch: 8 },   // 序号
    { wch: 15 },  // 姓名
    { wch: 15 },  // 金额（元）
    { wch: 25 },  // 金额（大写）
    { wch: 15 },  // 物品
    { wch: 10 },  // 支付方式
    { wch: 20 },  // 备注
    { wch: 20 },  // 创建时间
  ]
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '礼金记录')

  // 生成文件并下载
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 导出为 PDF 文件（使用 Electron printToPDF）
 * @param records 记录列表
 * @param filename 文件名（不含扩展名）
 * @param appName 应用名称（用于标题）
 * @param theme 主题配置
 */
export async function exportToPDF(
  records: Record[],
  _filename: string = '礼金簿导出',
  appName: string = '电子礼金簿',
  theme?: {
    primary?: string
    paper?: string
    textPrimary?: string
    accent?: string
  }
): Promise<void> {
  // 获取当前日期
  const now = new Date()
  const exportDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  try {
    // 处理 records 数组，确保其中的每个对象只包含可序列化的属性
    const serializableRecords = records.map(record => ({
      guestName: record.guestName,
      amount: record.amount,
      amountChinese: record.amountChinese,
      itemDescription: record.itemDescription,
      paymentType: record.paymentType,
      remark: record.remark
    }))

    // 调用 Electron API 生成 PDF
    const response = await window.app.generatePDF({
      records: serializableRecords,
      appName,
      exportDate,
      theme
    })

    if (!response.success) {
      throw new Error(response.error || '生成 PDF 失败')
    }
  } catch (error) {
    console.error('导出 PDF 失败:', error)
    throw error
  }
}
