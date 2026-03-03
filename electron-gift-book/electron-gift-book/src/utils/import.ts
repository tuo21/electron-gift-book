/**
 * 导入功能工具函数
 * 支持 Excel 文件解析和字段匹配
 */

import * as XLSX from 'xlsx'

// 标准字段定义及其别名
export const standardFieldMappings = {
  'guestName': {
    label: '姓名',
    aliases: ['姓名', '名字', '宾客姓名', 'guestName', 'name', 'Name', '宾客', '送礼人'],
    required: true
  },
  'amount': {
    label: '金额',
    aliases: ['金额', '礼金', '金额（元）', 'amount', 'money', 'Money', '礼金金额', '数额'],
    required: true
  },
  'amountChinese': {
    label: '金额大写',
    aliases: ['金额大写', '金额（大写）', 'amountChinese', '大写金额', '大写'],
    required: false
  },
  'itemDescription': {
    label: '物品',
    aliases: ['物品', '礼品', 'itemDescription', 'gift', 'Gift', '礼品描述', '赠送物品'],
    required: false
  },
  'paymentType': {
    label: '支付方式',
    aliases: ['支付方式', '支付', 'paymentType', 'payment', 'Payment', '付款方式', '支付类型'],
    required: false
  },
  'remark': {
    label: '备注',
    aliases: ['备注', '说明', 'remark', 'note', 'Note', '备注说明', '附注'],
    required: false
  },
  'createTime': {
    label: '创建时间',
    aliases: ['创建时间', '时间', 'createTime', 'date', 'Date', '日期', '录入时间'],
    required: false
  }
}

// 字段匹配结果类型
export interface FieldMapping {
  standardField: string
  standardLabel: string
  excelHeader: string
  excelIndex: number
  confidence: 'high' | 'medium' | 'low' | 'none'
}

export interface ImportPreview {
  headers: string[]
  mappings: FieldMapping[]
  previewData: Record<string, any>[]
  totalRows: number
  unmatchedHeaders: string[]
}

export interface ParsedRecord {
  guestName: string
  amount: number
  amountChinese?: string
  itemDescription?: string
  paymentType: number
  remark?: string
  createTime?: string
}

/**
 * 解析 Excel 文件
 * @param filePath 文件路径
 * @returns 解析结果
 */
export function parseExcelFile(filePath: string): { headers: string[], data: any[][] } {
  const workbook = XLSX.readFile(filePath)
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
  
  if (jsonData.length === 0) {
    throw new Error('Excel 文件为空')
  }
  
  const headers = jsonData[0].map(h => String(h).trim())
  const data = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))
  
  return { headers, data }
}

/**
 * 智能匹配字段
 * @param excelHeaders Excel 表头
 * @returns 字段匹配结果
 */
export function matchFields(excelHeaders: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = []
  const matchedExcelIndices = new Set<number>()
  
  // 遍历所有标准字段
  for (const [standardField, config] of Object.entries(standardFieldMappings)) {
    let bestMatch: FieldMapping | null = null
    
    // 遍历 Excel 表头寻找最佳匹配
    for (let i = 0; i < excelHeaders.length; i++) {
      if (matchedExcelIndices.has(i)) continue
      
      const header = excelHeaders[i]
      const confidence = calculateMatchConfidence(header, config.aliases)
      
      if (confidence !== 'none') {
        if (!bestMatch || confidencePriority(confidence) > confidencePriority(bestMatch.confidence)) {
          bestMatch = {
            standardField,
            standardLabel: config.label,
            excelHeader: header,
            excelIndex: i,
            confidence
          }
        }
      }
    }
    
    if (bestMatch) {
      mappings.push(bestMatch)
      matchedExcelIndices.add(bestMatch.excelIndex)
    }
  }
  
  return mappings
}

/**
 * 计算匹配置信度
 * @param header Excel 表头
 * @param aliases 标准字段别名列表
 * @returns 置信度
 */
function calculateMatchConfidence(header: string, aliases: string[]): 'high' | 'medium' | 'low' | 'none' {
  const normalizedHeader = header.toLowerCase().trim()
  
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().trim()
    
    // 完全匹配
    if (normalizedHeader === normalizedAlias) {
      return 'high'
    }
    
    // 包含匹配
    if (normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)) {
      return 'medium'
    }
    
    // 相似匹配（编辑距离）
    if (calculateSimilarity(normalizedHeader, normalizedAlias) > 0.7) {
      return 'low'
    }
  }
  
  return 'none'
}

/**
 * 计算字符串相似度（简单实现）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度 0-1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

/**
 * 计算编辑距离
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * 置信度优先级
 * @param confidence 置信度
 * @returns 优先级数值
 */
function confidencePriority(confidence: string): number {
  switch (confidence) {
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    default: return 0
  }
}

/**
 * 获取导入预览
 * @param filePath 文件路径
 * @returns 预览数据
 */
export function getImportPreview(filePath: string): ImportPreview {
  const { headers, data } = parseExcelFile(filePath)
  const mappings = matchFields(headers)
  
  // 获取未匹配的表头
  const matchedIndices = new Set(mappings.map(m => m.excelIndex))
  const unmatchedHeaders = headers.filter((_, index) => !matchedIndices.has(index))
  
  // 获取预览数据（前5行）
  const previewData = data.slice(0, 5).map(row => {
    const obj: Record<string, any> = {}
    mappings.forEach(mapping => {
      obj[mapping.standardLabel] = row[mapping.excelIndex]
    })
    return obj
  })
  
  return {
    headers,
    mappings,
    previewData,
    totalRows: data.length,
    unmatchedHeaders
  }
}

/**
 * 解析支付方式
 * @param value 支付方式值
 * @returns 支付方式代码
 */
function parsePaymentType(value: any): number {
  if (typeof value === 'number') {
    return value >= 0 && value <= 2 ? value : 0
  }
  
  const str = String(value).toLowerCase()
  if (str.includes('现金') || str.includes('cash')) return 0
  if (str.includes('微信') || str.includes('wechat') || str.includes('微')) return 1
  if (str.includes('内收') || str.includes('内部') || str.includes('internal')) return 2
  
  return 0 // 默认现金
}

/**
 * 将数据解析为记录
 * @param data Excel 数据行
 * @param mappings 字段映射
 * @returns 解析后的记录
 */
export function parseRecords(data: any[][], mappings: FieldMapping[]): ParsedRecord[] {
  const records: ParsedRecord[] = []
  
  for (const row of data) {
    const record: any = {}
    
    for (const mapping of mappings) {
      const value = row[mapping.excelIndex]
      
      switch (mapping.standardField) {
        case 'guestName':
          record.guestName = String(value || '').trim()
          break
        case 'amount':
          record.amount = parseFloat(value) || 0
          break
        case 'amountChinese':
          record.amountChinese = value ? String(value).trim() : undefined
          break
        case 'itemDescription':
          record.itemDescription = value ? String(value).trim() : undefined
          break
        case 'paymentType':
          record.paymentType = parsePaymentType(value)
          break
        case 'remark':
          record.remark = value ? String(value).trim() : undefined
          break
        case 'createTime':
          record.createTime = value ? String(value).trim() : undefined
          break
      }
    }
    
    // 只添加有姓名的记录
    if (record.guestName) {
      records.push(record as ParsedRecord)
    }
  }
  
  return records
}

/**
 * 检查必需字段是否已映射
 * @param mappings 字段映射
 * @returns 是否满足导入条件
 */
export function checkRequiredFields(mappings: FieldMapping[]): { valid: boolean; missing: string[] } {
  const requiredFields = Object.entries(standardFieldMappings)
    .filter(([_, config]) => config.required)
    .map(([field, config]) => ({ field, label: config.label }))
  
  const mappedFields = new Set(mappings.map(m => m.standardField))
  const missing = requiredFields
    .filter(r => !mappedFields.has(r.field))
    .map(r => r.label)
  
  return {
    valid: missing.length === 0,
    missing
  }
}
