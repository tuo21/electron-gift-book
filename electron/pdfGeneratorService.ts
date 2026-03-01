/**
 * PDF生成服务
 * 基于模板图片生成PDF
 * 使用 Electron printToPDF 方式，支持中文
 */

import { BrowserWindow, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { PDF_TEMPLATE_CONFIG } from './pdfTemplateConfig'

interface Record {
  guestName: string
  amount: number
  amountChinese?: string
  itemDescription?: string
  paymentType: number
  remark?: string
}

interface PDFGenerateOptions {
  records: Record[]
  appName: string
  exportDate: string
  theme: 'red' | 'gray'
  filename: string
}

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

export class PDFGeneratorService {
  private config = PDF_TEMPLATE_CONFIG
  private assetsPath: string

  constructor(assetsPath: string) {
    this.assetsPath = assetsPath
  }

  async generatePDF(
    options: PDFGenerateOptions,
    dataDir: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const { records, appName, exportDate, theme, filename } = options

    try {
      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0)
      const columnsPerPage = this.config.content.list.columnsPerPage

      const pages: string[] = []

      pages.push(this.generateCoverPage(appName, exportDate, theme))

      const totalContentPages = Math.ceil(records.length / columnsPerPage)
      for (let i = 0; i < totalContentPages; i++) {
        const startIdx = i * columnsPerPage
        const endIdx = Math.min(startIdx + columnsPerPage, records.length)
        const pageRecords = records.slice(startIdx, endIdx)
        const pageAmount = pageRecords.reduce((sum, r) => sum + r.amount, 0)

        pages.push(this.generateContentPage(
          pageRecords,
          appName,
          exportDate,
          i + 1,
          totalContentPages,
          records.length,
          pageAmount,
          theme
        ))
      }

      pages.push(this.generateStatisticsPage(records.length, totalAmount, theme))

      pages.push(this.generateBackCoverPage(theme))

      const htmlContent = this.generateFullHTML(pages, theme)

      const tempHtmlPath = path.join(dataDir, `temp_print_${Date.now()}.html`)
      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8')

      const printWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: false
        }
      })

      let pdfBuffer: Buffer | null = null

      try {
        await printWindow.loadFile(tempHtmlPath)
        await new Promise(resolve => setTimeout(resolve, 500))

        pdfBuffer = await printWindow.webContents.printToPDF({
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          printBackground: true,
          preferCSSPageSize: true
        })

        printWindow.close()

        const { filePath } = await dialog.showSaveDialog({
          title: '保存 PDF',
          defaultPath: `${filename}.pdf`,
          filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
        })

        if (filePath && pdfBuffer) {
          fs.writeFileSync(filePath, pdfBuffer)
          return { success: true, filePath }
        } else if (!filePath) {
          return { success: false, error: '用户取消保存' }
        } else {
          return { success: false, error: 'PDF生成失败' }
        }
      } finally {
        try {
          if (fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath)
          }
        } catch (e) {
          console.error('删除临时文件失败:', e)
        }
      }
    } catch (error) {
      console.error('PDF生成失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  private getTemplateImagePath(type: string, theme: string): string {
    const fileName = type === 'backCover' ? 'backcover' : type
    const jpgPath = path.join(this.assetsPath, 'templates', theme, `${fileName}.jpg`)
    const pngPath = path.join(this.assetsPath, 'templates', theme, `${fileName}.png`)

    if (fs.existsSync(jpgPath)) {
      return jpgPath.replace(/\\/g, '/')
    } else if (fs.existsSync(pngPath)) {
      return pngPath.replace(/\\/g, '/')
    }
    return ''
  }

  private generateCoverPage(appName: string, exportDate: string, theme: string): string {
    const config = this.config.cover
    const bgImage = this.getTemplateImagePath('cover', theme)
    const isGrayTheme = theme === 'gray'
    const titleColor = isGrayTheme ? '#FFFFFF' : config.titleStyle.color
    const dateColor = isGrayTheme ? '#FFFFFF' : config.dateStyle.color

    return `
      <div class="page cover-page" ${bgImage ? `style="background-image: url('file:///${bgImage}');"` : ''}>
        <div class="cover-content" style="left: ${config.textArea.left}px; top: ${config.textArea.top}px; width: ${config.textArea.width}px; height: ${config.textArea.height}px;">
          <div class="cover-title" style="font-size: ${config.titleStyle.fontSize}px; color: ${titleColor};">${appName || '礼金簿'}</div>
          <div class="cover-date" style="font-size: ${config.dateStyle.fontSize}px; color: ${dateColor};">${exportDate}</div>
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
    theme: string
  ): string {
    const config = this.config.content
    const bgImage = this.getTemplateImagePath('content', theme)
    const listConfig = config.list
    const positionOffset = 13
    const isGrayTheme = theme === 'gray'
    const headerColor = isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : config.header.nameStyle.color
    const dateColor = isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : config.header.dateStyle.color

    let columnsHtml = ''
    records.forEach((record, index) => {
      const columnX = listConfig.left + index * (listConfig.columnWidth + listConfig.columnGap)
      const amountChinese = record.amountChinese || numberToChinese(record.amount)
      const nameFontSize = getAdaptiveFontSize(record.guestName, true)
      const amountFontSize = getAdaptiveFontSize(amountChinese, false, !!record.itemDescription)

      columnsHtml += `
        <div class="record-column" style="left: ${columnX}px; top: ${listConfig.top}px; width: ${listConfig.columnWidth}px; height: ${listConfig.height}px;">
          <div class="column-name" style="height: ${listConfig.column.name.height}px;">
            <span class="vertical-text name-text" style="font-size: ${nameFontSize}px;">${record.guestName}</span>
          </div>
          <div class="column-remark" style="top: ${listConfig.column.remark.top + positionOffset}px;">
            <span>${record.remark || ''}</span>
          </div>
          <div class="column-amount" style="top: ${listConfig.column.amount.top + positionOffset}px; height: ${listConfig.column.amount.height}px;">
            <div class="amount-content">
              <span class="vertical-text amount-text" style="font-size: ${amountFontSize}px;">${amountChinese}</span>
              ${record.itemDescription ? `<span class="item-description">${record.itemDescription}</span>` : ''}
            </div>
          </div>
          <div class="column-payment" style="top: ${listConfig.column.payment.top + positionOffset}px;">
            <span class="payment-type">${getPaymentTypeText(record.paymentType)}</span>
            <span class="amount-number">¥${formatAmount(record.amount)}</span>
          </div>
        </div>
      `
    })

    return `
      <div class="page content-page" ${bgImage ? `style="background-image: url('file:///${bgImage}');"` : ''}>
        <div class="page-header" style="left: ${config.header.left}px; top: ${config.header.top}px; width: ${config.header.width}px; height: ${config.header.height}px;">
          <span class="header-name" style="font-size: ${config.header.nameStyle.fontSize}px; color: ${headerColor};">${appName || '礼金簿'}</span>
          <span class="header-date" style="left: ${config.header.dateOffset.left}px; font-size: ${config.header.dateStyle.fontSize}px; color: ${dateColor};">${exportDate}</span>
        </div>
        <div class="page-list">
          ${columnsHtml}
        </div>
        <div class="page-footer" style="left: ${config.footer.left}px; top: ${config.footer.top}px; width: ${config.footer.width}px; height: ${config.footer.height}px; color: ${isGrayTheme ? 'rgba(0, 0, 0, 0.6)' : '#333'};">
          <span class="footer-records" style="left: ${config.footer.recordCount.left}px;">共 ${totalRecords} 条记录</span>
          <span class="footer-page" style="left: ${config.footer.pageInfo.left}px;">第 ${pageNum} 页 / 共 ${totalPages} 页</span>
          <span class="footer-subtotal" style="left: ${config.footer.pageSubtotal.left}px;">本页小计：¥${formatAmount(pageAmount)}</span>
        </div>
      </div>
    `
  }

  private generateStatisticsPage(totalRecords: number, totalAmount: number, theme: string): string {
    const config = this.config.statistics
    const bgImage = this.getTemplateImagePath('statistics', theme)
    const isGrayTheme = theme === 'gray'
    const titleColor = isGrayTheme ? '#000000' : config.title.textStyle.color
    const textColor = isGrayTheme ? '#000000' : '#333'

    return `
      <div class="page statistics-page" ${bgImage ? `style="background-image: url('file:///${bgImage}');"` : ''}>
        <div class="stats-title" style="left: ${config.title.left}px; top: ${config.title.top}px; font-size: ${config.title.textStyle.fontSize}px; color: ${titleColor};">
          礼金簿统计
        </div>
        <div class="stats-content" style="left: ${config.content.left}px; top: ${config.content.top}px; width: ${config.content.width}px; height: ${config.content.height}px; color: ${textColor};">
          <div class="stat-item" style="color: ${textColor};">总人数：${totalRecords} 人</div>
          <div class="stat-item" style="color: ${textColor};">总金额：¥${formatAmount(totalAmount)}</div>
          <div class="stat-item" style="color: ${textColor};">大写金额：${numberToChinese(totalAmount)}</div>
        </div>
      </div>
    `
  }

  private generateBackCoverPage(theme: string): string {
    const config = this.config.backCover
    const bgImage = this.getTemplateImagePath('backCover', theme)
    const isGrayTheme = theme === 'gray'
    const textColor = isGrayTheme ? '#FFFFFF' : config.text1.textStyle.color

    return `
      <div class="page backcover-page" ${bgImage ? `style="background-image: url('file:///${bgImage}');"` : ''}>
        <div class="backcover-text1" style="left: ${config.text1.left}px; top: ${config.text1.top}px; font-size: ${config.text1.textStyle.fontSize}px; color: ${textColor};">
          ${config.text1.content}
        </div>
        <div class="backcover-text2" style="left: ${config.text2.left}px; top: ${config.text2.top}px; font-size: ${config.text2.textStyle.fontSize}px; color: ${textColor};">
          ${config.text2.content}
        </div>
      </div>
    `
  }

  private generateFullHTML(pages: string[], _theme: string): string {
    const { width, height } = this.config.pageSize

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
      src: url('file:///${this.assetsPath.replace(/\\/g, '/')}/fonts/XuandongKaishu.ttf') format('truetype');
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
      size: ${width}px ${height}px;
      margin: 0;
    }

    body {
      font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: ${width}px;
      height: ${height}px;
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
      margin-bottom: 40px;
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
      padding: 20px 8px;
    }

    .column-name {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
      margin-top: 40px;
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
      margin-top: 40px;
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
      font-size: 110px;
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
      letter-spacing: 10px;
    }

    .amount-text {
      font-size: 110px;
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

    .stat-amount {
      font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
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
}

export function createPDFGeneratorService(assetsPath: string): PDFGeneratorService {
  return new PDFGeneratorService(assetsPath)
}
