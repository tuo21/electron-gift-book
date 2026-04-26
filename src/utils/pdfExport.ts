import { jsPDF } from 'jspdf'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import type { Record } from '../types/database'

const SCALE = 4.167
const PAGE_WIDTH_PT = Math.round(842 * SCALE)
const PAGE_HEIGHT_PT = Math.round(595 * SCALE)
const VERTICAL_PAGE_WIDTH_PT = Math.round(595 * SCALE)
const VERTICAL_PAGE_HEIGHT_PT = Math.round(842 * SCALE)

type ThemeType = 'red' | 'gray' | 'golden'
type LayoutType = 'h' | 'v'

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

async function loadTemplateImage(theme: ThemeType, pageType: string, layout: LayoutType = 'h'): Promise<string | null> {
  try {
    const fileName = pageType === 'backcover' ? 'backcover' : pageType
    // 处理 gray 主题统计页文件名拼写错误的特殊情况
    let imagePath = `/templates/original/${theme}/${theme}-${layout}/${theme}-${layout}-${fileName}.jpg`
    if (theme === 'gray' && pageType === 'statistics' && layout === 'v') {
      imagePath = `/templates/original/${theme}/${theme}-${layout}/${theme}-${layout}-statisticst.jpg`
    }
    const response = await fetch(imagePath)
    if (!response.ok) {
      console.warn(`无法加载模板图片: ${imagePath}`)
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
  const maxSize = 34
  const minSize = 10
  const maxLength = isName ? 3 : (hasItem ? 2 : 3)

  if (!text || text.length <= maxLength) {
    return maxSize
  }

  const reduceSize = (text.length - maxLength) * 25
  return Math.max(minSize, maxSize - reduceSize)
}

async function createChinesePDF(layout: LayoutType = 'h'): Promise<{ pdf: jsPDF; fonts: LoadedFonts }> {
  const isVertical = layout === 'v'
  const pdf = new jsPDF({
    orientation: isVertical ? 'portrait' : 'landscape',
    unit: 'pt',
    format: isVertical 
      ? [VERTICAL_PAGE_WIDTH_PT, VERTICAL_PAGE_HEIGHT_PT]
      : [PAGE_WIDTH_PT, PAGE_HEIGHT_PT],
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
  theme: ThemeType,
  layout: LayoutType = 'h'
) {
  const bgImage = await loadTemplateImage(theme, 'cover', layout)
  const pageWidth = layout === 'v' ? VERTICAL_PAGE_WIDTH_PT : PAGE_WIDTH_PT
  const pageHeight = layout === 'v' ? VERTICAL_PAGE_HEIGHT_PT : PAGE_HEIGHT_PT
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  const isGrayTheme = theme === 'gray'
  const isGoldenTheme = theme === 'golden'

  if (layout === 'h') {
    const textX = Math.round((251 + 341 / 2) * SCALE)
    const titleY = Math.round((461 + 30) * SCALE)
    const dateY = Math.round((501 + 20) * SCALE)

    if (isGrayTheme) {
      pdf.setTextColor(255, 255, 255)
    } else if (isGoldenTheme) {
      pdf.setTextColor(153, 96, 9)
    } else {
      pdf.setTextColor(245, 200, 147)
    }

    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text(appName || '礼金簿', textX, titleY, { align: 'center' })

    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(Math.round(14 * SCALE))
    pdf.text(exportDate, textX, dateY, { align: 'center' })
  } else {
    const textX = Math.round((125 + 341 / 2) * SCALE)
    const titleY = Math.round((668 + 35 / 2) * SCALE)
    const dateY = Math.round((703 + 42 / 2) * SCALE)

    if (isGrayTheme) {
      pdf.setTextColor(255, 255, 255)
    } else if (isGoldenTheme) {
      pdf.setTextColor(153, 96, 9)
    } else {
      pdf.setTextColor(245, 200, 147)
    }

    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text(appName || '礼金簿', textX, titleY, { align: 'center' })

    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text(exportDate, textX, dateY, { align: 'center' })
  }
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
  theme: ThemeType,
  layout: LayoutType = 'h'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'content', layout)
  const pageWidth = layout === 'v' ? VERTICAL_PAGE_WIDTH_PT : PAGE_WIDTH_PT
  const pageHeight = layout === 'v' ? VERTICAL_PAGE_HEIGHT_PT : PAGE_HEIGHT_PT
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  const isGrayTheme = theme === 'gray'
  const isGoldenTheme = theme === 'golden'
  const positionOffset = Math.round(13 * SCALE)

  if (layout === 'h') {
    const headerNameX = Math.round(41 * SCALE)
    const headerY = Math.round((21 + 24) * SCALE)
    
    if (isGrayTheme) {
      pdf.setTextColor(0, 0, 0, 0.6 * 255)
    } else if (isGoldenTheme) {
      pdf.setTextColor(212, 165, 116)
    } else {
      pdf.setTextColor(255, 102, 102)
    }
    
    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text(appName || '礼金簿', headerNameX, headerY)

    const headerDateX = Math.round((633 + 127 / 2) * SCALE)
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
      const nameFontSize = getAdaptiveFontSize(record.guestName, true) * SCALE
      const amountFontSize = getAdaptiveFontSize(amountChinese, false, !!record.itemDescription) * SCALE

      setFont(pdf, fonts, 'XuandongKaishu')
      pdf.setFontSize(nameFontSize)
      pdf.setTextColor(0, 0, 0)
      const nameStartY = listStartY + Math.round(40 * SCALE)
      const nameEndY = listStartY + Math.round(130 * SCALE)
      const nameChars = record.guestName.split('')
      const nameAvailableHeight = nameEndY - nameStartY
      
      nameChars.forEach((char, charIndex) => {
        const topRatio = nameChars.length === 1 ? 0.5 : (5 + (70 / (nameChars.length - 1)) * charIndex) / 100
        const charY = nameStartY + nameAvailableHeight * topRatio
        pdf.text(char, x, charY, { align: 'center' })
      })

      if (record.remark) {
        const remarkY = listStartY + Math.round(139 * SCALE) + positionOffset
        setFont(pdf, fonts, 'KaiTi')
        pdf.setFontSize(32)
        pdf.setTextColor(102, 102, 102)
        pdf.text(record.remark, x, remarkY, { align: 'center' })
      }

      const amountBaseY = listStartY + Math.round(218 * SCALE) + positionOffset
      
      if (record.itemDescription) {
        const colWidth = columnWidth / 2 - Math.round(5 * SCALE)
        const amountY = amountBaseY + amountFontSize
        setFont(pdf, fonts, 'XuandongKaishu')
        pdf.setFontSize(amountFontSize)
        pdf.setTextColor(0, 0, 0)
        const amountCharHeight = amountFontSize * 1
        const amountChars = amountChinese.split('')
        const amountX = x - colWidth / 2
        amountChars.forEach((char, charIndex) => {
          pdf.text(char, amountX, amountY + charIndex * amountCharHeight, { align: 'center' })
        })
        
        setFont(pdf, fonts, 'KaiTi')
        pdf.setFontSize(40)
        pdf.setTextColor(102, 102, 102)
        const itemCharHeight = 40 * 1
        const itemChars = record.itemDescription.split('')
        const itemX = x + colWidth / 2
        itemChars.forEach((char, charIndex) => {
          pdf.text(char, itemX, amountY + charIndex * itemCharHeight, { align: 'center' })
        })
      } else {
        const amountY = amountBaseY + amountFontSize
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
  } else {
    const listStartX = Math.round(66 * SCALE)
    const listStartY = Math.round(49 * SCALE)
    const columnWidth = Math.round(46 * SCALE)
    const columnGap = 0

    records.forEach((record, index) => {
      const x = listStartX + index * (columnWidth + columnGap) + columnWidth / 2
      const amountChinese = numberToChinese(record.amount)

      const nameStartY = listStartY + Math.round(42 * SCALE)
      const nameEndY = listStartY + Math.round(197 * SCALE)
      const nameChars = record.guestName.split('')
      const nameAvailableHeight = nameEndY - nameStartY
      let nameFontSize = Math.round(32 * SCALE)
      
      // 参考 RecordList.vue 的自适应字号逻辑
      const nameMaxLength = 3
      if (nameChars.length > nameMaxLength) {
        const reduceSize = (nameChars.length - nameMaxLength) * 12
        nameFontSize = Math.max(Math.round(12 * SCALE), nameFontSize - reduceSize)
      }
      
      setFont(pdf, fonts, 'XuandongKaishu')
      pdf.setFontSize(nameFontSize)
      pdf.setTextColor(0, 0, 0)
      
      // 处理超过7个字的换行显示
      if (nameChars.length > 7) {
        const firstLineChars = nameChars.slice(0, 7)
        const secondLineChars = nameChars.slice(7)
        
        // 计算字符宽度，偏移量为字符宽度 + 2px
        const charWidth = nameFontSize * 0.6 // 估算字符宽度
        const offset = charWidth + 2 * SCALE
        
        // 计算行高
        const lineHeight = nameFontSize * 1.2
        
        // 第一行 - 顶对齐
        firstLineChars.forEach((char, charIndex) => {
          const charY = nameStartY + charIndex * lineHeight
          pdf.text(char, x - offset, charY, { align: 'center' })
        })
        
        // 第二行 - 顶对齐
        secondLineChars.forEach((char, charIndex) => {
          const charY = nameStartY + charIndex * lineHeight
          pdf.text(char, x + offset, charY, { align: 'center' })
        })
      } else {
        // 正常显示
        nameChars.forEach((char, charIndex) => {
          const topRatio = nameChars.length === 1 ? 0.5 : (5 + (70 / (nameChars.length - 1)) * charIndex) / 100
          const charY = nameStartY + nameAvailableHeight * topRatio
          pdf.text(char, x, charY, { align: 'center' })
        })
      }

      const giftStartY = listStartY + Math.round(222 * SCALE)
      const giftEndY = listStartY + Math.round(377 * SCALE)
      const giftChars = amountChinese.split('')
      const giftAvailableHeight = giftEndY - giftStartY
      let giftFontSize = Math.round(32 * SCALE)
      
      // 参考 RecordList.vue 的自适应字号逻辑
      const giftMaxLength = 4
      if (giftChars.length > giftMaxLength) {
        const reduceSize = (giftChars.length - giftMaxLength) * 12
        giftFontSize = Math.max(Math.round(12 * SCALE), giftFontSize - reduceSize)
      }
      
      setFont(pdf, fonts, 'XuandongKaishu')
      pdf.setFontSize(giftFontSize)
      pdf.setTextColor(0, 0, 0)
      
      // 处理超过7个字的换行显示
      if (giftChars.length > 7) {
        const firstLineChars = giftChars.slice(0, 7)
        const secondLineChars = giftChars.slice(7)
        
        // 计算字符宽度，偏移量为字符宽度 + 2px
        const charWidth = giftFontSize * 0.6 // 估算字符宽度
        const offset = charWidth + 2 * SCALE
        
        // 计算行高
        const lineHeight = giftFontSize * 1.2
        
        // 第一行 - 顶对齐
        firstLineChars.forEach((char, charIndex) => {
          const charY = giftStartY + charIndex * lineHeight
          pdf.text(char, x - offset, charY, { align: 'center' })
        })
        
        // 第二行 - 顶对齐
        secondLineChars.forEach((char, charIndex) => {
          const charY = giftStartY + charIndex * lineHeight
          pdf.text(char, x + offset, charY, { align: 'center' })
        })
      } else {
        // 正常显示
        giftChars.forEach((char, charIndex) => {
          const topRatio = giftChars.length === 1 ? 0.5 : (5 + (70 / (giftChars.length - 1)) * charIndex) / 100
          const charY = giftStartY + giftAvailableHeight * topRatio
          pdf.text(char, x, charY, { align: 'center' })
        })
      }

      const amountLowerY = listStartY + Math.round(356 * SCALE)
      setFont(pdf, fonts, 'ZhiSong')
      pdf.setFontSize(Math.round(9 * SCALE))
      pdf.setTextColor(0, 0, 0, 0.5 * 255)
      pdf.text(formatAmount(record.amount), x, amountLowerY, { align: 'center' })

      const paymentY = listStartY + Math.round(366 * SCALE)
      setFont(pdf, fonts, 'ZhiSong')
      pdf.setFontSize(Math.round(9 * SCALE))
      pdf.setTextColor(0, 0, 0, 0.5 * 255)
      pdf.text(getPaymentTypeText(record.paymentType), x, paymentY, { align: 'center' })

      if (record.itemDescription) {
        const itemStartY = listStartY + Math.round(412 * SCALE)
        const itemEndY = listStartY + Math.round(545 * SCALE)
        const itemChars = record.itemDescription.split('')
        const itemAvailableHeight = itemEndY - itemStartY
        let itemFontSize = Math.round(26 * SCALE)
        
        // 参考 RecordList.vue 的自适应字号逻辑
        const itemMaxLength = 4
        if (itemChars.length > itemMaxLength) {
          const reduceSize = (itemChars.length - itemMaxLength) * 12
          itemFontSize = Math.max(Math.round(12 * SCALE), itemFontSize - reduceSize)
        }
        
        setFont(pdf, fonts, 'XuandongKaishu')
        pdf.setFontSize(itemFontSize)
        pdf.setTextColor(0, 0, 0)
        
        // 处理超过7个字的换行显示
        if (itemChars.length > 7) {
          const firstLineChars = itemChars.slice(0, 7)
          const secondLineChars = itemChars.slice(7)
          
          // 计算字符宽度，偏移量为字符宽度 + 2px
          const charWidth = itemFontSize * 0.6 // 估算字符宽度
          const offset = charWidth + 2 * SCALE
          
          // 计算行高
          const lineHeight = itemFontSize * 1.2
          
          // 第一行 - 顶对齐
          firstLineChars.forEach((char, charIndex) => {
            const charY = itemStartY + charIndex * lineHeight
            pdf.text(char, x - offset, charY, { align: 'center' })
          })
          
          // 第二行 - 顶对齐
          secondLineChars.forEach((char, charIndex) => {
            const charY = itemStartY + charIndex * lineHeight
            pdf.text(char, x + offset, charY, { align: 'center' })
          })
        } else {
          // 正常显示
          itemChars.forEach((char, charIndex) => {
            const topRatio = itemChars.length === 1 ? 0.5 : (5 + (70 / (itemChars.length - 1)) * charIndex) / 100
            const charY = itemStartY + itemAvailableHeight * topRatio
            pdf.text(char, x, charY, { align: 'center' })
          })
        }
      }

      if (record.remark) {
        const remarkStartY = listStartY + Math.round(588 * SCALE)
        const remarkEndY = listStartY + Math.round(721 * SCALE)
        const remarkChars = record.remark.split('')
        const remarkAvailableHeight = remarkEndY - remarkStartY
        let remarkFontSize = Math.round(26 * SCALE)
        
        // 参考 RecordList.vue 的自适应字号逻辑
        const remarkMaxLength = 4
        if (remarkChars.length > remarkMaxLength) {
          const reduceSize = (remarkChars.length - remarkMaxLength) * 12
          remarkFontSize = Math.max(Math.round(12 * SCALE), remarkFontSize - reduceSize)
        }
        
        setFont(pdf, fonts, 'XuandongKaishu')
        pdf.setFontSize(remarkFontSize)
        pdf.setTextColor(0, 0, 0)
        
        // 处理超过7个字的换行显示
        if (remarkChars.length > 7) {
          const firstLineChars = remarkChars.slice(0, 7)
          const secondLineChars = remarkChars.slice(7)
          
          // 计算字符宽度，偏移量为字符宽度 + 2px
          const charWidth = remarkFontSize * 0.6 // 估算字符宽度
          const offset = charWidth + 2 * SCALE
          
          // 计算行高
          const lineHeight = remarkFontSize * 1.2
          
          // 第一行 - 顶对齐
          firstLineChars.forEach((char, charIndex) => {
            const charY = remarkStartY + charIndex * lineHeight
            pdf.text(char, x - offset, charY, { align: 'center' })
          })
          
          // 第二行 - 顶对齐
          secondLineChars.forEach((char, charIndex) => {
            const charY = remarkStartY + charIndex * lineHeight
            pdf.text(char, x + offset, charY, { align: 'center' })
          })
        } else {
          // 正常显示
          remarkChars.forEach((char, charIndex) => {
            const topRatio = remarkChars.length === 1 ? 0.5 : (5 + (70 / (remarkChars.length - 1)) * charIndex) / 100
            const charY = remarkStartY + remarkAvailableHeight * topRatio
            pdf.text(char, x, charY, { align: 'center' })
          })
        }
      }
    })

    const footerY = Math.round(797 * SCALE)
    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(Math.round(13 * SCALE))
    pdf.setTextColor(0, 0, 0, 0.4 * 255)

    pdf.text('共 ' + totalRecords + ' 条记录', Math.round(37 * SCALE), footerY)
    pdf.text('第 ' + pageNum + ' 页 / 共 ' + totalPages + ' 页', Math.round(297 * SCALE), footerY, { align: 'center' })
    pdf.text('本页小计：¥' + formatAmount(pageAmount), Math.round(558 * SCALE), footerY, { align: 'right' })
  }
}

async function addStatisticsPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  records: Record[],
  totalAmount: number,
  theme: ThemeType,
  layout: LayoutType = 'h'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'statistics', layout)
  const pageWidth = layout === 'v' ? VERTICAL_PAGE_WIDTH_PT : PAGE_WIDTH_PT
  const pageHeight = layout === 'v' ? VERTICAL_PAGE_HEIGHT_PT : PAGE_HEIGHT_PT
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  const isGrayTheme = theme === 'gray'
  const isGoldenTheme = theme === 'golden'

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

  const lines = [
    { label: '总人数：', value: `${records.length}人` },
    ...paymentStats.map(stat => ({
      label: `${stat.name}：`,
      value: `${formatAmount(stat.amount)}元（${stat.count}人）`
    })),
    { label: '总金额：', value: `${formatAmount(totalAmount)}元` },
    { label: '', value: numberToChinese(totalAmount) }
  ]

  if (layout === 'h') {
    const titleX = Math.round((361 + 120 / 2) * SCALE)
    const titleY = Math.round((137 + 18) * SCALE)

    if (isGrayTheme) {
      pdf.setTextColor(0, 0, 0)
    } else if (isGoldenTheme) {
      pdf.setTextColor(212, 165, 116)
    } else {
      pdf.setTextColor(255, 102, 102)
    }

    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(Math.round(18 * SCALE))
    pdf.text('礼金簿统计', titleX, titleY, { align: 'center' })

    const labelFontSize = 48
    const valueFontSize = 48
    const lineSpacing = Math.round(15 * SCALE)
    const labelValueSpacing = Math.round(20 * SCALE)

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

    const totalWidth = maxLabelWidth + labelValueSpacing + maxValueWidth
    const startX = (PAGE_WIDTH_PT - totalWidth) / 2
    const labelX = startX
    const valueX = startX + maxLabelWidth + labelValueSpacing

    pdf.setTextColor(isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51, isGrayTheme ? 0 : 51)

    const totalHeight = lines.length * (labelFontSize + lineSpacing) - lineSpacing
    let currentY = (PAGE_HEIGHT_PT - totalHeight) / 2 + labelFontSize

    lines.forEach((line) => {
      if (line.label) {
        setFont(pdf, fonts, 'ZhiSong')
        pdf.setFontSize(labelFontSize)
        pdf.text(line.label, labelX, currentY)
      }

      setFont(pdf, fonts, 'KaiTi')
      pdf.setFontSize(valueFontSize)
      pdf.text(line.value, valueX, currentY)

      currentY += labelFontSize + lineSpacing
    })
  } else {
    const titleX = Math.round((233 + 120 / 2) * SCALE)
    const titleY = Math.round((220 + 35 / 2) * SCALE)

    pdf.setTextColor(122, 122, 122)

    setFont(pdf, fonts, 'ZhiSong')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text('礼金簿统计', titleX, titleY, { align: 'center' })

    const contentTopY = Math.round(277 * SCALE)
    const lineSpacing = Math.round(25 * SCALE)
    const labelFontSize = Math.round(12 * SCALE)
    const valueFontSize = Math.round(12 * SCALE)
    const labelValueGap = Math.round(5 * SCALE)

    pdf.setTextColor(120, 120, 120)

    const pageWidth = VERTICAL_PAGE_WIDTH_PT
    let maxLineWidth = 0

    lines.forEach((line) => {
      setFont(pdf, fonts, 'ZhiSong')
      pdf.setFontSize(labelFontSize)
      const labelWidth = line.label ? pdf.getTextWidth(line.label) : 0
      setFont(pdf, fonts, 'KaiTi')
      pdf.setFontSize(valueFontSize)
      const valueWidth = pdf.getTextWidth(line.value)
      const lineWidth = labelWidth + labelValueGap + valueWidth
      maxLineWidth = Math.max(maxLineWidth, lineWidth)
    })

    const contentLeftX = (pageWidth - maxLineWidth) / 2

    let currentY = contentTopY

    lines.forEach((line) => {
      if (line.label) {
        setFont(pdf, fonts, 'ZhiSong')
        pdf.setFontSize(labelFontSize)
        pdf.text(line.label, contentLeftX, currentY)
      }

      setFont(pdf, fonts, 'KaiTi')
      pdf.setFontSize(valueFontSize)
      pdf.text(line.value, contentLeftX + maxLineWidth - pdf.getTextWidth(line.value), currentY)

      currentY += labelFontSize + lineSpacing
    })
  }
}

async function addBackCoverPage(
  pdf: jsPDF,
  fonts: LoadedFonts,
  theme: ThemeType,
  layout: LayoutType = 'h'
) {
  pdf.addPage()

  const bgImage = await loadTemplateImage(theme, 'backcover', layout)
  const pageWidth = layout === 'v' ? VERTICAL_PAGE_WIDTH_PT : PAGE_WIDTH_PT
  const pageHeight = layout === 'v' ? VERTICAL_PAGE_HEIGHT_PT : PAGE_HEIGHT_PT
  if (bgImage) {
    pdf.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight)
  }

  const isGrayTheme = theme === 'gray'
  const isGoldenTheme = theme === 'golden'

  if (isGrayTheme) {
    pdf.setTextColor(255, 255, 255)
  } else if (isGoldenTheme) {
    pdf.setTextColor(255, 215, 0)
  } else {
    pdf.setTextColor(255, 211, 145)
  }

  if (layout === 'h') {
    const centerX = PAGE_WIDTH_PT / 2
    const text1Y = Math.round((263 + 24) * SCALE)
    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text('做一款好用的电子礼金簿', centerX, text1Y, { align: 'center' })

    const text2Y = Math.round((310 + 20) * SCALE)
    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(20 * SCALE))
    pdf.text('微信公众号：说自', centerX, text2Y, { align: 'center' })
  } else {
    const centerX = VERTICAL_PAGE_WIDTH_PT / 2
    const text1Y = Math.round((1500 + 28) * SCALE)
    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(28 * SCALE))
    pdf.text('做一款好用的电子礼金簿', centerX, text1Y, { align: 'center' })

    const text2Y = Math.round((1580 + 24) * SCALE)
    setFont(pdf, fonts, 'XuandongKaishu')
    pdf.setFontSize(Math.round(24 * SCALE))
    pdf.text('微信公众号：说自', centerX, text2Y, { align: 'center' })
  }
}

export async function generatePDFWithJsPDF(
  records: Record[],
  eventName: string,
  theme: ThemeType = 'red',
  eventDate?: string,
  onProgress?: (progress: number) => void,
  layout: LayoutType = 'h'
): Promise<Uint8Array> {
  const { pdf, fonts } = await createChinesePDF(layout)

  const exportDateObj = eventDate ? new Date(eventDate) : getEventDate(records)
  const exportDate = `${exportDateObj.getFullYear()}年${exportDateObj.getMonth() + 1}月${exportDateObj.getDate()}日`
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)

  onProgress?.(10)
  await addCoverPage(pdf, fonts, eventName, exportDate, theme, layout)

  const columnsPerPage = layout === 'h' ? 15 : 10
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
      theme,
      layout
    )
  }

  onProgress?.(85)
  await addStatisticsPage(pdf, fonts, records, totalAmount, theme, layout)

  onProgress?.(95)
  await addBackCoverPage(pdf, fonts, theme, layout)

  const arrayBuffer = pdf.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

export async function exportToPDFWithSave(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme: ThemeType = 'red',
  eventDate?: string,
  onProgress?: (progress: number) => void,
  layout: LayoutType = 'h'
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    onProgress?.(0)
    const pdfData = await generatePDFWithJsPDF(records, eventName, theme, eventDate, onProgress, layout)

    const exportDate = eventDate || getEventDate(records)
    const defaultFileName = generateExportFileName(eventName, exportDate) + '.pdf'

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
