import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import * as XLSX from 'xlsx'
import {
  initDatabase,
  closeDatabase,
  getDatabase,
  getCurrentDbPath,
  insertRecord,
  updateRecord,
  softDeleteRecord,
  getAllRecords,
  getRecordById,
  searchRecords,
  insertHistory,
  getRecordHistory,
  getAllRecordHistory,
  getStatistics,
  type Record
} from './database'

// 数据目录
const dataDir = path.join(process.cwd(), 'data')

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 获取当前文件目录（ES 模块兼容）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'images', 'logo.png'),
    width: 1445,
    height: 950,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    },
  })

  // 隐藏菜单栏
  win.removeMenu()

  // 应用启动后立即打开开发工具
  win.webContents.openDevTools()

  // 启用开发工具快捷键
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'I' && input.control && input.shift) {
      event.preventDefault()
      win?.webContents.toggleDevTools()
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL).catch(error => {
      console.error('Failed to load URL:', error)
    })
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html')).catch(error => {
      console.error('Failed to load file:', error)
    })
  }
}

// 设置 IPC 处理器
function setupIpcHandlers() {
  // 获取所有记录
  ipcMain.handle('db:getAllRecords', () => {
    try {
      return { success: true, data: getAllRecords() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 根据ID获取记录
  ipcMain.handle('db:getRecordById', (_, id: number) => {
    try {
      return { success: true, data: getRecordById(id) }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 搜索记录
  ipcMain.handle('db:searchRecords', (_, keyword: string) => {
    try {
      return { success: true, data: searchRecords(keyword) }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 插入记录
  ipcMain.handle('db:insertRecord', (_, record: Record) => {
    try {
      const id = insertRecord(record)
      return { success: true, data: { id } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 更新记录（使用事务确保数据一致性）
  ipcMain.handle('db:updateRecord', (_, record: Record) => {
    const db = getDatabase()
    try {
      // 使用事务确保操作原子性
      const transaction = db.transaction(() => {
        // 先获取旧记录用于历史记录
        const oldRecord = getRecordById(record.Id!)
        if (oldRecord) {
          insertHistory({
            RecordId: record.Id!,
            GuestName: oldRecord.GuestName,
            Amount: oldRecord.Amount,
            ItemDescription: oldRecord.ItemDescription,
            PaymentType: oldRecord.PaymentType,
            Remark: oldRecord.Remark,
            NewGuestName: record.GuestName,
            NewAmount: record.Amount,
            NewItemDescription: record.ItemDescription,
            NewPaymentType: record.PaymentType,
            NewRemark: record.Remark,
            OperationType: 'UPDATE',
            UpdateBy: 'System',
            ChangeDesc: '更新记录'
          })
        }
        updateRecord(record)
      })

      transaction()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 软删除记录（使用事务确保数据一致性）
  ipcMain.handle('db:softDeleteRecord', (_, id: number) => {
    const db = getDatabase()
    try {
      // 使用事务确保操作原子性
      const transaction = db.transaction(() => {
        // 先获取旧记录用于历史记录
        const oldRecord = getRecordById(id)
        if (oldRecord) {
          insertHistory({
            RecordId: id,
            GuestName: oldRecord.GuestName,
            Amount: oldRecord.Amount,
            ItemDescription: oldRecord.ItemDescription,
            PaymentType: oldRecord.PaymentType,
            Remark: oldRecord.Remark,
            NewGuestName: null,
            NewAmount: null,
            NewItemDescription: null,
            NewPaymentType: null,
            NewRemark: null,
            OperationType: 'DELETE',
            UpdateBy: 'System',
            ChangeDesc: '删除记录'
          } as any)
        }
        softDeleteRecord(id)
      })

      transaction()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取记录历史
  ipcMain.handle('db:getRecordHistory', (_, recordId: number) => {
    try {
      return { success: true, data: getRecordHistory(recordId) }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取所有历史记录
  ipcMain.handle('db:getAllRecordHistory', () => {
    try {
      return { success: true, data: getAllRecordHistory() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取统计数据
  ipcMain.handle('db:getStatistics', () => {
    try {
      return { success: true, data: getStatistics() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 生成 PDF
  ipcMain.handle('app:generatePDF', async (_, data: {
    records: any[],
    appName: string,
    exportDate: string,
    filename: string,
    theme?: {
      primary?: string
      paper?: string
      textPrimary?: string
      accent?: string
    }
  }) => {
    try {
      const { records, appName, exportDate, filename, theme } = data

      // 数字转大写函数
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
        const maxSize = 28
        const minSize = 16
        const maxLength = isName ? 3 : (hasItem ? 2 : 3)
        if (!text || text.length <= maxLength) return maxSize
        const reduceSize = (text.length - maxLength) * 6
        return Math.max(minSize, maxSize - reduceSize)
      }

      // 生成记录列 HTML
      const recordColumns = records.map((record: any) => {
        const amountChinese = record.amountChinese || numberToChinese(record.amount)
        return `
          <div class="record-column">
            <div class="cell label-cell"><span class="label-text">姓名</span></div>
            <div class="cell name-cell"><span class="name-text" style="font-size: ${getAdaptiveFontSize(record.guestName, true)}px">${record.guestName}</span></div>
            <div class="cell remark-cell"><span class="remark-text">${record.remark || '\u00A0'}</span></div>
            <div class="cell label-cell"><span class="label-text">礼金</span></div>
            <div class="cell amount-cell">
              <div class="amount-content">
                <span class="amount-chinese" style="font-size: ${getAdaptiveFontSize(amountChinese, false, !!record.itemDescription)}px">${amountChinese}</span>
                ${record.itemDescription ? `<span class="item-description">${record.itemDescription}</span>` : ''}
              </div>
            </div>
            <div class="cell payment-cell">
              <span class="payment-type">${getPaymentTypeText(record.paymentType)}</span>
              <span class="amount-number">¥${formatAmount(record.amount)}</span>
            </div>
          </div>
        `
      }).join('')

      // 添加空白列
      const emptyCount = 15 - (records.length % 15 || 15)
      let emptyColumns = ''
      if (emptyCount < 15) {
        for (let i = 0; i < emptyCount; i++) {
          emptyColumns += `
            <div class="record-column empty-column">
              <div class="cell label-cell"><span class="label-text">姓名</span></div>
              <div class="cell name-cell"><span class="name-text"></span></div>
              <div class="cell remark-cell"><span class="remark-text">\u00A0</span></div>
              <div class="cell label-cell"><span class="label-text">礼金</span></div>
              <div class="cell amount-cell"><span class="amount-chinese"></span></div>
              <div class="cell payment-cell">
                <span class="payment-type"></span>
                <span class="amount-number"></span>
              </div>
            </div>
          `
        }
      }

      // 读取 CSS 文件
      const cssPath = path.join(process.env.VITE_PUBLIC as string, 'print.css')
      const cssContent = fs.readFileSync(cssPath, 'utf-8')

      // 生成完整 HTML
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>礼金簿打印</title>
  <style>
    ${cssContent}
    :root {
      --theme-primary: ${theme?.primary || '#c44a3d'};
      --theme-paper: ${theme?.paper || '#f5f0e8'};
      --theme-text-primary: ${theme?.textPrimary || '#333'};
      --theme-accent: ${theme?.accent || '#eb564a'};
    }
  </style>
</head>
<body>
  <div class="print-container">
    <header class="print-header">
      <h1 class="print-title">${appName || '电子礼金簿'}</h1>
      <div class="print-meta">
        <span>导出日期：${exportDate}</span>
        <span>共 ${records.length} 条记录</span>
      </div>
    </header>
    <main class="print-content">
      ${recordColumns}
      ${emptyColumns}
    </main>
    <footer class="print-footer">
      <span>第 1 页</span>
    </footer>
  </div>
</body>
</html>
      `

      // 创建隐藏的打印窗口
      const printWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false
        }
      })

      // 加载 HTML 内容
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 500))

      // 生成 PDF - 使用CSS @page规则控制尺寸
      const pdfBuffer = await printWindow.webContents.printToPDF({
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
        preferCSSPageSize: true
      })

      // 关闭打印窗口
      printWindow.close()

      // 显示保存对话框
      const { filePath } = await dialog.showSaveDialog({
        title: '保存 PDF',
        defaultPath: `${filename}.pdf`,
        filters: [{ name: 'PDF 文件', extensions: ['pdf'] }]
      })

      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer)
        return { success: true, data: { filePath } }
      } else {
        return { success: false, error: '用户取消保存' }
      }
    } catch (error) {
      console.error('生成 PDF 失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // ==================== 启动页相关 IPC 处理器 ====================

  // 打开数据库文件对话框
  ipcMain.handle('electron:openDatabaseFile', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: '选择礼金簿数据文件',
        defaultPath: dataDir,
        filters: [
          { name: '数据库文件', extensions: ['db'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (filePaths && filePaths.length > 0) {
        return { success: true, data: { filePath: filePaths[0] } }
      } else {
        return { success: false, error: '用户取消选择' }
      }
    } catch (error) {
      console.error('打开文件对话框失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 创建新数据库
  ipcMain.handle('electron:createNewDatabase', async (_, fileName: string) => {
    try {
      // 生成新数据库路径
      const newDbPath = path.join(dataDir, fileName)
      
      // 如果文件已存在，添加序号
      let finalPath = newDbPath
      let counter = 1
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(fileName)
        const base = path.basename(fileName, ext)
        finalPath = path.join(dataDir, `${base}_${counter}${ext}`)
        counter++
      }

      // 重新初始化数据库（传入新路径，会创建新文件）
      initDatabase(finalPath)

      return { success: true, data: { filePath: finalPath } }
    } catch (error) {
      console.error('创建新数据库失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 切换数据库
  ipcMain.handle('electron:switchDatabase', async (_, filePath: string) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '数据库文件不存在' }
      }

      // 重新初始化数据库（传入指定路径）
      initDatabase(filePath)

      return { success: true }
    } catch (error) {
      console.error('切换数据库失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 保存当前数据库（重命名）
  ipcMain.handle('electron:saveCurrentDatabase', async (_, fileName: string) => {
    try {
      const dbPath = getCurrentDbPath()
      if (!dbPath || !fs.existsSync(dbPath)) {
        return { success: false, error: '当前没有可保存的数据' }
      }

      // 生成新路径
      const newPath = path.join(dataDir, fileName)

      // 如果新路径与当前路径不同，则重命名
      if (newPath !== dbPath) {
        // 如果目标文件已存在，添加序号
        let finalPath = newPath
        let counter = 1
        while (fs.existsSync(finalPath)) {
          const ext = path.extname(fileName)
          const base = path.basename(fileName, ext)
          finalPath = path.join(dataDir, `${base}_${counter}${ext}`)
          counter++
        }

        // 关闭数据库连接
        closeDatabase()

        // 重命名文件
        fs.renameSync(dbPath, finalPath)

        // 重新初始化数据库（使用新路径）
        initDatabase(finalPath)

        return { success: true, data: { filePath: finalPath } }
      }

      return { success: true, data: { filePath: dbPath } }
    } catch (error) {
      console.error('保存数据库失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 获取最近打开的数据库列表
  ipcMain.handle('electron:getRecentDatabases', async () => {
    try {
      // 扫描数据目录中的所有 .db 文件
      const files = fs.readdirSync(dataDir)
      const dbFiles = files
        .filter(file => file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(dataDir, file)
          const stats = fs.statSync(filePath)
          return {
            name: path.basename(file, '.db'),
            path: filePath,
            lastOpened: stats.mtime.toISOString()
          }
        })
        .sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime())

      return { success: true, data: { recentDatabases: dbFiles } }
    } catch (error) {
      console.error('获取最近数据库列表失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除数据库文件
  ipcMain.handle('electron:deleteDatabase', async (_, filePath: string) => {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '数据库文件不存在' }
      }

      // 如果删除的是当前打开的数据库，先关闭连接
      const currentDbPath = getCurrentDbPath()
      if (currentDbPath === filePath) {
        closeDatabase()
      }

      // 删除文件
      fs.unlinkSync(filePath)

      return { success: true }
    } catch (error) {
      console.error('删除数据库失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 打开导入文件对话框（Excel）
  ipcMain.handle('electron:openImportFile', async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: '选择要导入的 Excel 文件',
        defaultPath: dataDir,
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx', 'xls'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (filePaths && filePaths.length > 0) {
        return { success: true, data: { filePath: filePaths[0] } }
      } else {
        return { success: false, error: '用户取消选择' }
      }
    } catch (error) {
      console.error('打开导入文件对话框失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 解析导入文件（Excel）
  ipcMain.handle('electron:parseImportFile', async (_, filePath: string) => {
    try {
      console.log('尝试解析文件:', filePath)

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.error('文件不存在:', filePath)
        return { success: false, error: '文件不存在: ' + filePath }
      }

      // 检查文件状态
      const stats = fs.statSync(filePath)
      console.log('文件大小:', stats.size, '字节')

      // 读取文件内容为二进制字符串
      let binaryString: string
      try {
        const buffer = fs.readFileSync(filePath)
        // 将 Buffer 转换为二进制字符串
        const bytes = new Uint8Array(buffer)
        const len = bytes.length
        const arr = new Array(len)
        for (let i = 0; i < len; i++) {
          arr[i] = String.fromCharCode(bytes[i])
        }
        binaryString = arr.join('')
        console.log('文件读取成功，二进制字符串长度:', binaryString.length)
      } catch (readError) {
        console.error('读取文件失败:', readError)
        return { success: false, error: '读取文件失败: ' + (readError as Error).message }
      }

      // 解析 Excel 文件 - 使用 binary 类型
      let workbook: XLSX.WorkBook
      try {
        workbook = XLSX.read(binaryString, { type: 'binary' })
        console.log('Excel 解析成功，工作表:', workbook.SheetNames)
      } catch (xlsxError) {
        console.error('解析 Excel 失败:', xlsxError)
        return { success: false, error: '解析 Excel 失败: ' + (xlsxError as Error).message }
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

      if (jsonData.length === 0) {
        return { success: false, error: 'Excel 文件为空' }
      }

      const headers = jsonData[0].map(h => String(h).trim())
      const data = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))

      console.log('解析完成，表头:', headers)
      console.log('数据行数:', data.length)

      return {
        success: true,
        data: {
          headers,
          data,
          totalRows: data.length
        }
      }
    } catch (error) {
      console.error('解析导入文件失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 批量插入记录（用于导入）
  ipcMain.handle('db:batchInsertRecords', async (_, records: Record[]) => {
    const db = getDatabase()
    try {
      const insertedIds: number[] = []

      const transaction = db.transaction(() => {
        for (const record of records) {
          const stmt = db.prepare(`
            INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime)
            VALUES (@GuestName, @Amount, @AmountChinese, @ItemDescription, @PaymentType, @Remark, @CreateTime)
          `)
          const result = stmt.run(record)
          insertedIds.push(result.lastInsertRowid as number)
        }
      })

      transaction()
      return { success: true, data: { count: insertedIds.length } }
    } catch (error) {
      console.error('批量插入记录失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  try {
    // 初始化数据库
    initDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
  // 设置 IPC 处理器
  setupIpcHandlers()
  // 创建窗口
  createWindow()
})
