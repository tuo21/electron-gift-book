import * as XLSX from 'xlsx'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
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

function generateExportFileName(eventName: string, eventDate?: string | Date): string {
  let date: Date
  if (eventDate) {
    date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate
  } else {
    date = new Date()
  }
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const cleanName = eventName.replace(/[\\/:*?"<>|]/g, '_')
  return `${cleanName}_${dateStr}`
}

function getGroupRoleText(role?: string): string {
  const map: { [key: string]: string } = {
    'start': '分组开始',
    'end': '分组结束',
    'member': '组员',
    'summary': '小组小计',
  }
  return map[role || ''] || ''
}

export async function exportToExcel(records: Record[], eventName: string = '电子礼金簿', eventDate?: string): Promise<void> {
  const exportDate = eventDate || getEventDate(records)
  const defaultFileName = generateExportFileName(eventName, exportDate) + '.xlsx'

  const data = records.map((record, index) => {
    const role = record.groupRole
    if (role === 'start') {
      return {
        '序号': '',
        '姓名': '【分组开始】',
        '金额（元）': '',
        '金额（大写）': '',
        '物品': '',
        '支付方式': '',
        '备注': '',
        '创建时间': '',
        '分组ID': record.groupId || '',
        '分组角色': getGroupRoleText(role),
        '小组总账': '',
        '小组开支': '',
        '小组结余': '',
        '开支明细': '',
      }
    } else if (role === 'end') {
      return {
        '序号': '',
        '姓名': '【分组结束】',
        '金额（元）': '',
        '金额（大写）': '',
        '物品': '',
        '支付方式': '',
        '备注': '',
        '创建时间': '',
        '分组ID': record.groupId || '',
        '分组角色': getGroupRoleText(role),
        '小组总账': '',
        '小组开支': '',
        '小组结余': '',
        '开支明细': '',
      }
    } else if (role === 'summary') {
      return {
        '序号': '',
        '姓名': '【小组小计】',
        '金额（元）': '',
        '金额（大写）': '',
        '物品': '',
        '支付方式': '',
        '备注': '',
        '创建时间': '',
        '分组ID': record.groupId || '',
        '分组角色': getGroupRoleText(role),
        '小组总账': record.groupTotal || '',
        '小组开支': record.groupExpense || '',
        '小组结余': record.groupBalance || '',
        '开支明细': record.groupExpenseDetail || '',
      }
    } else {
      return {
        '序号': index + 1,
        '姓名': record.guestName,
        '金额（元）': record.amount,
        '金额（大写）': record.amountChinese || numberToChinese(record.amount),
        '物品': record.itemDescription || '',
        '支付方式': getPaymentTypeText(record.paymentType),
        '备注': record.remark || '',
        '创建时间': record.createTime || '',
        '分组ID': record.groupId || '',
        '分组角色': getGroupRoleText(role),
        '小组总账': '',
        '小组开支': '',
        '小组结余': '',
        '开支明细': '',
      }
    }
  })

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
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
  ]
  ws['!cols'] = colWidths

  const headerRow = ws['A1']
  if (headerRow) {
    headerRow.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '8B5A2B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    }
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })]
      if (cell && row > 0) {
        cell.s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
        }
      }
    }
  }

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r: row, c: 1 })]
    if (nameCell && nameCell.v && typeof nameCell.v === 'string') {
      if (nameCell.v.includes('【分组开始】') || nameCell.v.includes('【分组结束】') || nameCell.v.includes('【小组小计】')) {
        nameCell.s = {
          ...nameCell.s,
          font: { bold: true, color: { rgb: '8B5A2B' } },
          fill: { fgColor: { rgb: 'FFF8E7' } },
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '礼金记录')
  
  const excelData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  
  const filePath = await save({
    defaultPath: defaultFileName,
    filters: [
      { name: 'Excel 文件', extensions: ['xlsx'] }
    ]
  })

  if (!filePath) {
    return
  }
  
  await writeFile(filePath, excelData)
}

export async function exportToPDF(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme: 'red' | 'gray' | 'golden' = 'red',
  eventDate?: string,
  onProgress?: (progress: number) => void,
  layout: 'h' | 'v' = 'h'
): Promise<void> {
  const result = await exportToPDFWithSave(records, eventName, theme, eventDate, onProgress, layout)
  
  if (!result.success) {
    if (result.error !== '用户取消保存') {
      throw new Error(result.error || '导出 PDF 失败')
    }
  }
}
