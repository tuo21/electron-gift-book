import { jsPDF } from 'jspdf'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import type { Record } from '../types/database'

const SCALE = 4.167
const PAGE_WIDTH_PT = Math.round(842 * SCALE)
const PAGE_HEIGHT_PT = Math.round(595 * SCALE)

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

function formatAmount(amount: number): string {
  if (isNaN(amount)) return '0.00'
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

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

async function loadFontAsBase64(fontPath: string): Promise<string | null> {
  try {
    const response = await fetch(fontPath)
    if (!response.ok) {
      console.warn(`无法加载字体: ${fontPath}`)
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  } catch (error) {
    console.error('加载字体失败:', error)
    return null
  }
}

interface LoadedFonts {
  xuandongKaiti: string | null
  chunfengKaiti: string | null
  zhiSong: string | null
  kaiTi: string | null
}

async function loadAllFonts(): Promise<LoadedFonts> {
  const [xuandongBase64, chunfengBase64, zhiSongBase64, kaiTiBase64] = await Promise.all([
    loadFontAsBase64('/fonts/XuandongKaishu.ttf'),
    loadFontAsBase64('/fonts/演示春风楷.ttf'),
    loadFontAsBase64('/fonts/LXGWNeoZhiSongPlus.ttf'),
    loadFontAsBase64('/fonts/gkai00mp.ttf')
  ])
  
  return {
    xuandongKaiti: xuandongBase64,
    chunfengKaiti: chunfengBase64,
    zhiSong: zhiSongBase64,
    kaiTi: kaiTiBase64
  }
}

async function loadTemplateImage(theme: 'red' | 'gray', pageType: string): Promise<string | null> {
  try {
    const response = await fetch(`/templates/${theme}/${pageType}.jpg`)
    if (!response.ok) {
      console.warn(`无法加载模板图片: ${theme}/${pageType}`)
      return null
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('加载模板图片失败:', error)
    return null
  }
}

function getAdaptiveFontSize(text: string, isName: boolean = false, hasItem: boolean = false): number {
  const maxSize = 110
  const minSize = 55
  const maxLength = isName ? 3 : (hasItem ? 2 : 3)

  if (!text || text.length <= maxLength) {
    return maxSize
  }

  const reduceSize = (text.length - maxLength) * 25
  return Math.max(minSize, maxSize - reduceSize)
}

async function createChinesePDF(): Promise<{ pdf: jsPDF; fonts: LoadedFonts }> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT],
    compress: true
  })

  const fonts = await loadAllFonts()
  
  if (fonts.xuandongKaiti) {
    pdf.addFileToVFS('XuandongKaishu.ttf', fonts.xuandongKaiti)
    pdf.addFont('XuandongKaishu.ttf', 'XuandongKaishu', 'normal')
  } else {
    console.warn('XuandongKaishu 字体加载失败')
  }
  
  if (fonts.chunfengKaiti) {
    pdf.addFileToVFS('ChunfengKai.ttf', fonts.chunfengKaiti)
    pdf.addFont('ChunfengKai.ttf', 'ChunfengKai', 'normal')
  } else {
    console.warn('演示春风楷字体加载失败')
  }

  if (fonts.zhiSong) {
    pdf.addFileToVFS('ZhiSong.ttf', fonts.zhiSong)
    pdf.addFont('ZhiSong.ttf', 'ZhiSong', 'normal')
  } else {
    console.warn('LXGWNeoZhiSongPlus 字体加载失败')
  }

  if (fonts.kaiTi) {
    pdf.addFileToVFS('KaiTi.ttf', fonts.kaiTi)
    pdf.addFont('KaiTi.ttf', 'KaiTi', 'normal')
  } else {
    console.warn('gkai00mp 楷体字体加载失败')
  }

  if (fonts.xuandongKaiti) {
    pdf.setFont('XuandongKaishu')
  } else if (fonts.chunfengKaiti) {
    pdf.setFont('ChunfengKai')
  }

  return { pdf, fonts }
}

function setFont(pdf: jsPDF, fonts: LoadedFonts, fontName: 'XuandongKaishu' | 'ChunfengKai' | 'ZhiSong' | 'KaiTi'): void {
  if (fontName === 'XuandongKaishu' && fonts.xuandongKaiti) {
    pdf.setFont('XuandongKaishu')
  } else if (fontName === 'ChunfengKai' && fonts.chunfengKaiti) {
    pdf.setFont('ChunfengKai')
  } else if (fontName === 'ZhiSong' && fonts.zhiSong) {
    pdf.setFont('ZhiSong')
  } else if (fontName === 'KaiTi' && fonts.kaiTi) {
    pdf.setFont('KaiTi')
  } else if (fonts.xuandongKaiti) {
    pdf.setFont('XuandongKaishu')
  } else if (fonts.chunfengKaiti) {
    pdf.setFont('ChunfengKai')
  }
}

async function addCoverPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  appName: string,
  exportDate: string,
  theme: 'red' | 'gray'
) {
  const bgImage = await loadTemplateImage(theme, 'cover')
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)
  }

  const isGrayTheme = theme === 'gray'

  const textX = Math.round((251 + 341 / 2) * SCALE)
  const titleY = Math.round((461 + 30) * SCALE)
  const dateY = Math.round((501 + 20) * SCALE)

  if (isGrayTheme) {
    pdf.setTextColor(255, 255, 255)
  } else {
    pdf.setTextColor(255, 102, 102)
  }

  setFont(pdf, fonts, 'XuandongKaishu')
  pdf.setFontSize(Math.round(24 * SCALE))
  pdf.text(appName || '礼金簿', textX, titleY, { align: 'center' })

  setFont(pdf, fonts, 'ZhiSong')
  pdf.setFontSize(Math.round(14 * SCALE))
  pdf.text(exportDate, textX, dateY, { align: 'center' })
}

async function addContentPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  records: Record[],
  appName: string,
  exportDate: string,
  pageNum: number,
  totalPages: number,
  totalRecords: number,
  pageAmount: number,
  theme: 'red' | 'gray'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'content')
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)
  }

  const isGrayTheme = theme === 'gray'
  const positionOffset = Math.round(13 * SCALE)

  const headerNameX = Math.round(41 * SCALE)
  const headerY = Math.round((21 + 24) * SCALE)
  
  if (isGrayTheme) {
    pdf.setTextColor(0, 0, 0, 0.6 * 255)
  } else {
    pdf.setTextColor(255, 102, 102)
  }
  
  setFont(pdf, fonts, 'XuandongKaishu')
  pdf.setFontSize(Math.round(24 * SCALE))
  pdf.text(appName || '礼金簿', headerNameX, headerY)

  const headerDateX = Math.round((633 + 127 / 2) * SCALE)
  // 页眉日期底部与页眉标题底部对齐
  const headerDateY = headerY
  pdf.setTextColor(0, 0, 0)
  
  setFont(pdf, fonts, 'ZhiSong')
  pdf.setFontSize(Math.round(13 * SCALE))
  pdf.text(exportDate, headerDateX, headerDateY, { align: 'center', baseline: 'bottom' })

  const listStartX = Math.round(41 * SCALE)
  const listStartY = Math.round(98 * SCALE)
  const columnWidth = Math.round(46 * SCALE)
  const columnGap = Math.round(5 * SCALE)

  records.forEach((record, index) => {
    const x = listStartX + index * (columnWidth + columnGap) + columnWidth / 2
    const amountChinese = numberToChinese(record.amount)
    const nameFontSize = getAdaptiveFontSize(record.guestName, true)
    const amountFontSize = getAdaptiveFontSize(amountChinese, false, !!record.itemDescription)

    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(nameFontSize)
    pdf.setTextColor(0, 0, 0)
    const nameStartY = listStartY + Math.round(40 * SCALE)
    const nameCharHeight = nameFontSize * 1
    
    const nameChars = record.guestName.split('')
    nameChars.forEach((char, charIndex) => {
      pdf.text(char, x, nameStartY + charIndex * nameCharHeight, { align: 'center' })
    })

    if (record.remark) {
      const remarkY = listStartY + Math.round(139 * SCALE) + positionOffset
      setFont(pdf, fonts, 'KaiTi')
      pdf.setFontSize(32)
      pdf.setTextColor(102, 102, 102)
      pdf.text(record.remark, x, remarkY, { align: 'center' })
    }

    // 金额中文和物品描述并排显示
    const amountY = listStartY + Math.round(218 * SCALE) + positionOffset + amountFontSize
    const itemStartY = listStartY + Math.round(218 * SCALE) + positionOffset + Math.round(40 * SCALE)
    
    if (record.itemDescription) {
      // 如果有物品描述，金额和物品并排显示
      const colWidth = columnWidth / 2 - Math.round(5 * SCALE)
      
      // 左侧：金额中文（竖排）
      setFont(pdf, fonts, 'XuandongKaishu')
      pdf.setFontSize(amountFontSize)
      pdf.setTextColor(0, 0, 0)
      const amountCharHeight = amountFontSize * 1
      const amountChars = amountChinese.split('')
      const amountX = x - colWidth / 2
      amountChars.forEach((char, charIndex) => {
        pdf.text(char, amountX, amountY + charIndex * amountCharHeight, { align: 'center' })
      })
      
      // 右侧：物品描述（竖排）
      setFont(pdf, fonts, 'KaiTi')
      pdf.setFontSize(40)
      pdf.setTextColor(102, 102, 102)
      const itemCharHeight = 40 * 1
      const itemChars = record.itemDescription.split('')
      const itemX = x + colWidth / 2
      itemChars.forEach((char, charIndex) => {
        pdf.text(char, itemX, itemStartY + charIndex * itemCharHeight, { align: 'center' })
      })
    } else {
      // 如果没有物品描述，金额居中显示
      setFont(pdf, fonts, 'XuandongKaishu')
      pdf.setFontSize(amountFontSize)
      pdf.setTextColor(0, 0, 0)
      const amountCharHeight = amountFontSize * 1
      const amountChars = amountChinese.split('')
      amountChars.forEach((char, charIndex) => {
        pdf.text(char, x, amountY + charIndex * amountCharHeight, { align: 'center' })
      })
    }

    const paymentY = listStartY + Math.round(371 * SCALE) + positionOffset
    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(28)
    pdf.setTextColor(196, 74, 61)
    pdf.text(getPaymentTypeText(record.paymentType), x, paymentY, { align: 'center' })

    const amountNumY = paymentY + Math.round(15 * SCALE)
    pdf.setTextColor(102, 102, 102)
    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(28)
    pdf.text('¥' + formatAmount(record.amount), x, amountNumY, { align: 'center' })
  })

  const footerY = Math.round(518 * SCALE) + Math.round(20 * SCALE)
  setFont(pdf, fonts, 'ZhiSong')
  pdf.setFontSize(52)
  pdf.setTextColor(isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51)

  pdf.text('共 ' + totalRecords + ' 条记录', Math.round(41 * SCALE), footerY)
  pdf.text('第 ' + pageNum + ' 页 / 共 ' + totalPages + ' 页', PAGE_WIDTH_PT / 2, footerY, { align: 'center' })
  pdf.text('本页小计：¥' + formatAmount(pageAmount), Math.round((41 + 760) * SCALE), footerY, { align: 'right' })
}

async function addStatisticsPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  records: Record[],
  totalAmount: number,
  theme: 'red' | 'gray'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'statistics')
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)
  }

  const isGrayTheme = theme === 'gray'

  const titleX = Math.round((361 + 120 / 2) * SCALE)
  const titleY = Math.round((137 + 18) * SCALE)

  if (isGrayTheme) {
    pdf.setTextColor(0, 0, 0)
  } else {
    pdf.setTextColor(255, 102, 102)
  }

  setFont(pdf, fonts, 'ZhiSong')
  pdf.setFontSize(Math.round(18 * SCALE))
  pdf.text('礼金簿统计', titleX, titleY, { align: 'center' })

  // 准备统计数据
  const paymentTypes = [
    { type: 0, name: '现金' },
    { type: 1, name: '微信' },
    { type: 2, name: '内收' }
  ]

  const paymentStats = paymentTypes.map(({ type, name }) => {
    const typeRecords = records.filter(r => r.paymentType === type)
    const typeAmount = typeRecords.reduce((sum, r) => sum + r.amount, 0)
    return {
      name,
      count: typeRecords.length,
      amount: typeAmount
    }
  })

  // 准备所有文本行
  const labelFontSize = 48
  const valueFontSize = 48
  const lineSpacing = Math.round(15 * SCALE)
  const labelValueSpacing = Math.round(20 * SCALE)

  const lines = [
    { label: '总人数：', value: `${records.length}人` },
    ...paymentStats.map(stat => ({
      label: `${stat.name}：`,
      value: `${formatAmount(stat.amount)}元（${stat.count}人）`
    })),
    { label: '总金额：', value: `${formatAmount(totalAmount)}元` },
    { label: '', value: numberToChinese(totalAmount) }
  ]

  // 计算最大标签宽度和最大数值宽度
  setFont(pdf, fonts, 'ZhiSong')
  pdf.setFontSize(labelFontSize)
  let maxLabelWidth = 0
  lines.forEach(line => {
    if (line.label) {
      const width = pdf.getTextWidth(line.label)
      maxLabelWidth = Math.max(maxLabelWidth, width)
    }
  })

  setFont(pdf, fonts, 'XuandongKaishu')
  pdf.setFontSize(valueFontSize)
  let maxValueWidth = 0
  lines.forEach(line => {
    const width = pdf.getTextWidth(line.value)
    maxValueWidth = Math.max(maxValueWidth, width)
  })

  // 计算居中起始位置
  const totalWidth = maxLabelWidth + labelValueSpacing + maxValueWidth
  const startX = (PAGE_WIDTH_PT - totalWidth) / 2
  const labelX = startX
  const valueX = startX + maxLabelWidth + labelValueSpacing

  // 绘制统计内容
  pdf.setTextColor(isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51)

  // 计算起始Y位置（垂直居中）
  const totalHeight = lines.length * (labelFontSize + lineSpacing) - lineSpacing
  let currentY = (PAGE_HEIGHT_PT - totalHeight) / 2 + labelFontSize

  lines.forEach((line) => {
    if (line.label) {
      // 绘制标签（智宋）
      setFont(pdf, fonts, 'ZhiSong')
      pdf.setFontSize(labelFontSize)
      pdf.text(line.label, labelX, currentY)
    }

    // 绘制数值（楷体）
    setFont(pdf, fonts, 'KaiTi')
    pdf.setFontSize(valueFontSize)
    pdf.text(line.value, valueX, currentY)

    currentY += labelFontSize + lineSpacing
  })
}

async function addBackCoverPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  theme: 'red' | 'gray'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'backcover')
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)
  }

  const isGrayTheme = theme === 'gray'

  if (isGrayTheme) {
    pdf.setTextColor(255, 255, 255)
  } else {
    pdf.setTextColor(255, 211, 145)
  }

  // 封底文字使用页面中心对齐
  const centerX = PAGE_WIDTH_PT / 2
  const text1Y = Math.round((263 + 24) * SCALE)
  setFont(pdf, fonts, 'XuandongKaishu')
  pdf.setFontSize(Math.round(24 * SCALE))
  pdf.text('做一款好用的电子礼金簿', centerX, text1Y, { align: 'center' })

  const text2Y = Math.round((310 + 20) * SCALE)
  setFont(pdf, fonts, 'XuandongKaishu')
  pdf.setFontSize(Math.round(20 * SCALE))
  pdf.text('微信公众号：说自', centerX, text2Y, { align: 'center' })
}

export async function generatePDFWithJsPDF(
  records: Record[],
  eventName: string,
  theme: 'red' | 'gray',
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const { pdf, fonts } = await createChinesePDF()
  
  const eventDate = getEventDate(records)
  const exportDate = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)

  onProgress?.(10)
  await addCoverPage(pdf, fonts, eventName, exportDate, theme)

  const columnsPerPage = 15
  const totalContentPages = Math.ceil(records.length / columnsPerPage)

  for (let i = 0; i < totalContentPages; i++) {
    onProgress?.(10 + (i + 1) / (totalContentPages + 2) * 70)
    const startIdx = i * columnsPerPage
    const endIdx = Math.min(startIdx + columnsPerPage, records.length)
    const pageRecords = records.slice(startIdx, endIdx)
    const pageAmount = pageRecords.reduce((sum, r) => sum + r.amount, 0)

    await addContentPage(
      pdf,
      fonts,
      pageRecords,
      eventName,
      exportDate,
      i + 1,
      totalContentPages,
      records.length,
      pageAmount,
      theme
    )
  }

  onProgress?.(85)
  await addStatisticsPage(pdf, fonts, records, totalAmount, theme)

  onProgress?.(95)
  await addBackCoverPage(pdf, fonts, theme)

  const arrayBuffer = pdf.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

export async function exportToPDFWithSave(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme: 'red' | 'gray' = 'red',
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    onProgress?.(0)
    const pdfData = await generatePDFWithJsPDF(records, eventName, theme, onProgress)

    const eventDate = getEventDate(records)
    const defaultFileName = generateExportFileName(eventName, eventDate) + '.pdf'

    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [
        { name: 'PDF 文件', extensions: ['pdf'] }
      ]
    })

    if (!filePath) {
      return { success: false, error: '用户取消保存' }
    }

    onProgress?.(100)
    
    try {
      await writeFile(filePath, pdfData)
      return { success: true, filePath }
    } catch (writeError) {
      console.error('写入文件失败:', writeError)
      return {
        success: false,
        error: `保存文件失败: ${writeError instanceof Error ? writeError.message : String(writeError)}`
      }
    }
  } catch (error) {
    console.error('导出 PDF 失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出 PDF 失败'
    }
  }
}
