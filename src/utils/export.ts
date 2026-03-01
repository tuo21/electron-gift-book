import * as XLSX from 'xlsx'
import type { Record } from '../types/database'
import { exportToPDFWithSave } from './pdfExport'

const CN_NUMBERS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_BIG_UNITS = ['', '万', '亿', '万亿']

function numberToChinese(amount: number): string {
  if (isNaN(amount) || amount < 0) return ''
  if (amount >= 1e16) return '金额过大'

  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  let result = integerToChinese(integerPart)
  if (result === '') result = '零元'
  else result += '元'

  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10)
    const fen = decimalPart % 10
    if (jiao > 0) result += CN_NUMBERS[jiao] + '角'
    else if (integerPart > 0) result += '零'
    if (fen > 0) result += CN_NUMBERS[fen] + '分'
  }

  return result
}

function integerToChinese(num: number): string {
  if (num === 0) return ''
  let result = ''
  let bigUnitIndex = 0

  while (num > 0) {
    const segment = num % 10000
    if (segment !== 0) {
      const segmentStr = segmentToChinese(segment)
      result = segmentStr + CN_BIG_UNITS[bigUnitIndex] + result
    } else if (result !== '' && !result.startsWith('零')) {
      result = '零' + result
    }
    num = Math.floor(num / 10000)
    bigUnitIndex++
  }

  result = result.replace(/零+/g, '零').replace(/零$/, '')
  return result
}

function segmentToChinese(num: number): string {
  if (num === 0) return ''
  let result = ''
  let zeroFlag = false

  for (let i = 3; i >= 0; i--) {
    const divisor = Math.pow(10, i)
    const digit = Math.floor(num / divisor)
    if (digit > 0) {
      if (zeroFlag) {
        result += '零'
        zeroFlag = false
      }
      result += CN_NUMBERS[digit] + CN_UNITS[i]
    } else if (result !== '') {
      zeroFlag = true
    }
    num %= divisor
  }
  return result
}

// formatAmount 函数已移至 pdfExport.ts 中统一使用

function getPaymentTypeText(type: number): string {
  const map: { [key: number]: string } = { 0: '现金', 1: '微信', 2: '内收' }
  return map[type] || '未知'
}

function getEventDate(records: Record[]): Date {
  if (records.length === 0) {
    return new Date()
  }

  const earliestRecord = records.reduce((earliest, record) => {
    if (!record.createTime) return earliest
    if (!earliest.createTime) return record
    return new Date(record.createTime) < new Date(earliest.createTime) ? record : earliest
  })

  if (!earliestRecord.createTime) {
    return new Date()
  }

  return new Date(earliestRecord.createTime)
}

function generateExportFileName(eventName: string, eventDate?: Date): string {
  const date = eventDate || new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const cleanName = eventName.replace(/[\\/:*?"<>|]/g, '_')
  return `${cleanName}_${dateStr}`
}

export async function exportToExcel(records: Record[], eventName: string = '电子礼金簿'): Promise<void> {
  const eventDate = getEventDate(records)
  const filename = generateExportFileName(eventName, eventDate) + '.xlsx'

  const data = records.map((record, index) => ({
    '序号': index + 1,
    '姓名': record.guestName,
    '金额（元）': record.amount / 100,
    '金额（大写）': record.amountChinese || numberToChinese(record.amount / 100),
    '物品': record.itemDescription || '',
    '支付方式': getPaymentTypeText(record.paymentType),
    '备注': record.remark || '',
    '创建时间': record.createTime || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  const colWidths = [
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
  ]
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, '礼金记录')
  XLSX.writeFile(wb, filename)
}

export async function exportToPDF(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme: 'red' | 'gray' = 'red',
  onProgress?: (progress: number) => void
): Promise<void> {
  const result = await exportToPDFWithSave(records, eventName, theme, onProgress)
  
  if (!result.success) {
    if (result.error !== '用户取消保存') {
      throw new Error(result.error || '导出 PDF 失败')
    }
  }
}
