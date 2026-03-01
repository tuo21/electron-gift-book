import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, readFile } from '@tauri-apps/plugin-fs'
import type { Record } from '../types/database'

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

async function loadFileAsBase64(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`无法加载文件: ${filePath}`)
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('加载文件失败:', error)
    return ''
  }
}

interface PDFExportOptions {
  records: Record[]
  eventName: string
  theme: 'red' | 'gray'
}

export class PDFExportService {
  private async generateHTML(options: PDFExportOptions): Promise<string> {
    const { records, eventName, theme } = options
    const eventDate = getEventDate(records)
    const exportDate = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)

    const coverImage = await loadFileAsBase64(`/templates/${theme}/cover.jpg`)
    const contentImage = await loadFileAsBase64(`/templates/${theme}/content.jpg`)
    const statisticsImage = await loadFileAsBase64(`/templates/${theme}/statistics.jpg`)
    const backcoverImage = await loadFileAsBase64(`/templates/${theme}/backcover.jpg`)
    const fontBase64 = await loadFileAsBase64('/fonts/演示春风楷.ttf')

    const pages: string[] = []

    pages.push(this.generateCoverPage(eventName, exportDate, theme, coverImage))

    const columnsPerPage = 15
    const totalContentPages = Math.ceil(records.length / columnsPerPage)

    for (let i = 0; i < totalContentPages; i++) {
      const startIdx = i * columnsPerPage
      const endIdx = Math.min(startIdx + columnsPerPage, records.length)
      const pageRecords = records.slice(startIdx, endIdx)
      const pageAmount = pageRecords.reduce((sum, r) => sum + r.amount, 0)

      pages.push(this.generateContentPage(
        pageRecords,
        eventName,
        exportDate,
        i + 1,
        totalContentPages,
        records.length,
        pageAmount,
        theme,
        contentImage
      ))
    }

    pages.push(this.generateStatisticsPage(records.length, totalAmount, theme, statisticsImage))

    pages.push(this.generateBackCoverPage(theme, backcoverImage))

    return this.generateFullHTML(pages, theme, fontBase64)
  }

  private generateCoverPage(appName: string, exportDate: string, theme: string, bgImage: string): string {
    const isGrayTheme = theme === 'gray'
    const titleColor = isGrayTheme ? '#FFFFFF' : 'rgba(255, 102, 102, 1)'
    const dateColor = isGrayTheme ? '#FFFFFF' : 'rgba(255, 102, 102, 1)'

    return `
      <div class="page cover-page" ${bgImage ? `style="background-image: url('${bgImage}');"` : ''}>
        <div class="cover-content" style="left: 251px; top: 461px; width: 341px; height: 77px;">
          <div class="cover-title" style="font-size: 24px; color: ${titleColor};">${appName || '礼金簿'}</div>
          <div class="cover-date" style="font-size: 14px; color: ${dateColor};">${exportDate}</div>
        </div>
      </div>
    `
  }

  private generateContentPage(
    records: Record[],
    appName: string,
    exportDate: string,
    pageNum: number,
    totalPages: number,
    totalRecords: number,
    pageAmount: number,
    theme: string,
    bgImage: string
  ): string {
    const isGrayTheme = theme === 'gray'
    const headerColor = isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 102, 102, 1)'
    const dateColor = isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 1)'
    const footerColor = isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : '#333'

    let columnsHtml = ''
    records.forEach((record, index) => {
      const columnX = 41 + index * (46 + 5)
      const amountChinese = numberToChinese(record.amount / 100)
      const nameFontSize = getAdaptiveFontSize(record.guestName, true)
      const amountFontSize = getAdaptiveFontSize(amountChinese, false, !!record.itemDescription)

      columnsHtml += `
        <div class="record-column" style="left: ${columnX}px; top: 98px; width: 46px; height: 401px;">
          <div class="column-name" style="height: 139px;">
            <span class="vertical-text name-text" style="font-size: ${nameFontSize}px;">${record.guestName}</span>
          </div>
          <div class="column-remark" style="top: 152px;">
            <span>${record.remark || ''}</span>
          </div>
          <div class="column-amount" style="top: 218px; height: 153px;">
            <div class="amount-content">
              <span class="vertical-text amount-text" style="font-size: ${amountFontSize}px;">${amountChinese}</span>
              ${record.itemDescription ? `<span class="item-description">${record.itemDescription}</span>` : ''}
            </div>
          </div>
          <div class="column-payment" style="top: 371px;">
            <span class="payment-type">${getPaymentTypeText(record.paymentType)}</span>
            <span class="amount-number">¥${formatAmount(record.amount / 100)}</span>
          </div>
        </div>
      `
    })

    return `
      <div class="page content-page" ${bgImage ? `style="background-image: url('${bgImage}');"` : ''}>
        <div class="page-header" style="left: 41px; top: 21px; width: 760px; height: 35px;">
          <span class="header-name" style="font-size: 24px; color: ${headerColor};">${appName || '礼金簿'}</span>
          <span class="header-date" style="left: 633px; top: 2.5px; font-size: 13px; color: ${dateColor};">${exportDate}</span>
        </div>
        <div class="page-list">
          ${columnsHtml}
        </div>
        <div class="page-footer" style="left: 41px; top: 518px; width: 760px; height: 30px; color: ${footerColor};">
          <span class="footer-records" style="left: 0px;">共 ${totalRecords} 条记录</span>
          <span class="footer-page" style="left: 306.5px;">第 ${pageNum} 页 / 共 ${totalPages} 页</span>
          <span class="footer-subtotal" style="left: 630px;">本页小计：¥${formatAmount(pageAmount / 100)}</span>
        </div>
      </div>
    `
  }

  private generateStatisticsPage(totalRecords: number, totalAmount: number, theme: string, bgImage: string): string {
    const isGrayTheme = theme === 'gray'
    const titleColor = isGrayTheme ? '#000000' : 'rgba(255, 102, 102, 1)'
    const textColor = isGrayTheme ? '#000000' : '#333'

    return `
      <div class="page statistics-page" ${bgImage ? `style="background-image: url('${bgImage}');"` : ''}>
        <div class="stats-title" style="left: 361px; top: 137px; width: 120px; height: 35px; font-size: 18px; color: ${titleColor};">
          礼金簿统计
        </div>
        <div class="stats-content" style="left: 270px; top: 193px; width: 302px; height: 230px; color: ${textColor};">
          <div class="stat-item" style="color: ${textColor};">总人数：${totalRecords} 人</div>
          <div class="stat-item" style="color: ${textColor};">总金额：¥${formatAmount(totalAmount / 100)}</div>
          <div class="stat-item" style="color: ${textColor};">大写金额：${numberToChinese(totalAmount / 100)}</div>
        </div>
        <div class="stats-footer" style="left: 37px; top: 518px; width: 760px; height: 30px;">
          <span class="footer-page" style="left: 306.5px; top: 0px; text-align: center;"></span>
        </div>
      </div>
    `
  }

  private generateBackCoverPage(theme: string, bgImage: string): string {
    const isGrayTheme = theme === 'gray'
    const textColor = isGrayTheme ? '#FFFFFF' : 'rgba(255, 211, 145, 1)'

    return `
      <div class="page backcover-page" ${bgImage ? `style="background-image: url('${bgImage}');"` : ''}>
        <div class="backcover-text1" style="left: 307px; top: 263px; font-size: 24px; color: ${textColor};">
          做一款好用的电子礼金簿
        </div>
        <div class="backcover-text2" style="left: 364px; top: 310px; font-size: 20px; color: ${textColor};">
          微信公众号：说自
        </div>
      </div>
    `
  }

  private generateFullHTML(pages: string[], _theme: string, fontBase64: string): string {
    const pageWidth = 842
    const pageHeight = 595

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>礼金簿打印</title>
  <style>
    @font-face {
      font-family: '演示春风楷';
      src: url('${fontBase64}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${pageWidth}px ${pageHeight}px;
      margin: 0;
    }

    body {
      font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: ${pageWidth}px;
      height: ${pageHeight}px;
      position: relative;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .cover-content {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .cover-title {
      margin-bottom: 10px;
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
    }

    .cover-date {
      font-weight: normal;
      font-family: 'SimSun', 'STSong', serif;
    }

    .page-header {
      position: absolute;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-name {
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
    }

    .header-date {
      position: absolute;
      font-family: 'SimSun', 'STSong', serif;
    }

    .record-column {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .column-name {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
    }

    .column-remark {
      position: absolute;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #666;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-family: 'KaiTi', 'STKaiti', serif;
    }

    .column-amount {
      position: absolute;
      width: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }

    .amount-content {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: flex-start;
      gap: 2px;
      height: 100%;
    }

    .item-description {
      font-size: 40px;
      color: #666;
      writing-mode: vertical-rl;
      text-orientation: upright;
      letter-spacing: 2px;
      max-height: 100%;
      overflow: hidden;
      font-family: 'KaiTi', 'STKaiti', serif;
    }

    .column-payment {
      position: absolute;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }

    .payment-type {
      color: #c44a3d;
      font-weight: bold;
      font-family: 'SimSun', 'STSong', serif;
    }

    .amount-number {
      color: #666;
      font-family: 'SimSun', 'STSong', serif;
    }

    .vertical-text {
      writing-mode: vertical-rl;
      text-orientation: upright;
      letter-spacing: 14px;
    }

    .name-text {
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
      letter-spacing: 10px;
    }

    .amount-text {
      letter-spacing: 8px;
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
    }

    .page-footer {
      position: absolute;
      display: flex;
      align-items: center;
      font-size: 52px;
      font-family: 'SimSun', 'STSong', serif;
    }

    .footer-records {
      position: absolute;
      left: 0;
    }

    .footer-page {
      position: absolute;
      text-align: center;
    }

    .footer-subtotal {
      position: absolute;
      right: 0;
      text-align: right;
    }

    .stats-title {
      position: absolute;
      font-weight: bold;
      text-align: center;
      font-family: 'SimSun', 'STSong', serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stats-content {
      position: absolute;
      display: flex;
      flex-direction: column;
      gap: 80px;
    }

    .stat-item {
      font-size: 56px;
      font-family: 'KaiTi', 'STKaiti', serif;
    }

    .stats-footer {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .backcover-text1,
    .backcover-text2 {
      position: absolute;
      text-align: center;
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
    }
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>
    `
  }

  public async exportPDF(options: PDFExportOptions, onProgress?: (progress: number) => void): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      onProgress?.(10)
      const htmlContent = await this.generateHTML(options)

      onProgress?.(50)

      const eventDate = getEventDate(options.records)
      const defaultFileName = generateExportFileName(options.eventName, eventDate) + '.pdf'

      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
      })

      if (!filePath) {
        return { success: false, error: '用户取消保存' }
      }

      onProgress?.(80)

      const tempHtmlPath = filePath.replace('.pdf', '.html')
      const encoder = new TextEncoder()
      await writeFile(tempHtmlPath, encoder.encode(htmlContent))

      onProgress?.(90)

      const result = await this.convertHTMLToPDF(tempHtmlPath, filePath)

      try {
        const { remove } = await import('@tauri-apps/plugin-fs')
        await remove(tempHtmlPath)
      } catch (e) {
        console.warn('删除临时文件失败:', e)
      }

      onProgress?.(100)

      return result
    } catch (error) {
      console.error('导出 PDF 失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出 PDF 失败'
      }
    }
  }

  private async convertHTMLToPDF(htmlPath: string, pdfPath: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      return await this.printViaWindow(htmlPath, pdfPath)
    } catch (error) {
      console.error('转换失败，尝试备选方案:', error)
      return { success: false, error: '需要使用浏览器打印功能' }
    }
  }

  private async printViaWindow(htmlPath: string, pdfPath: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const htmlContent = await readFile(htmlPath)
      const decoder = new TextDecoder('utf-8')
      const html = decoder.decode(htmlContent)

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

      const printWindow = window.open(url, '_blank')
      if (!printWindow) {
        return { success: false, error: '无法打开打印窗口' }
      }

      return new Promise((resolve) => {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            setTimeout(() => {
              URL.revokeObjectURL(url)
              resolve({ success: true, filePath: pdfPath })
            }, 500)
          }, 1000)
        }
      })
    } catch (error) {
      return { success: false, error: `打印失败: ${error}` }
    }
  }
}

export const pdfExportService = new PDFExportService()
