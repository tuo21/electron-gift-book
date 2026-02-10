import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
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
      nodeIntegration: false
    },
  })

  // 隐藏菜单栏
  win.removeMenu()

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
    theme?: {
      primary?: string
      paper?: string
      textPrimary?: string
      accent?: string
    }
  }) => {
    try {
      // 处理 records 数组，确保其中的每个对象只包含可序列化的属性
      const serializableData = {
        ...data,
        records: data.records.map((record: any) => ({
          guestName: record.guestName,
          amount: record.amount,
          amountChinese: record.amountChinese,
          itemDescription: record.itemDescription,
          paymentType: record.paymentType,
          remark: record.remark
        }))
      }

      // 创建隐藏的打印窗口
      const printWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      })

      // 等待页面加载完成并渲染
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('打印页面加载超时'))
        }, 10000)

        ipcMain.once('print-window-loaded', () => {
          try {
            // 发送数据到打印窗口
            printWindow.webContents.send('render-giftbook', serializableData)
          } catch (error) {
            console.error('发送数据到打印窗口失败:', error)
            reject(new Error('发送数据到打印窗口失败: ' + (error as Error).message))
          }
        })

        ipcMain.once('print-ready', () => {
          clearTimeout(timeout)
          resolve()
        })

        // 加载打印页面
        const printPagePath = path.join(process.env.VITE_PUBLIC as string, 'print.html')
        printWindow.loadFile(printPagePath).catch(reject)
      })

      // 等待字体渲染
      await new Promise(resolve => setTimeout(resolve, 500))

      // 生成 PDF
      const pdfBuffer = await printWindow.webContents.printToPDF({
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
        printBackground: true,
        landscape: true,
        pageSize: 'A4'
      })

      // 关闭打印窗口
      printWindow.close()

      // 显示保存对话框
      const { filePath } = await dialog.showSaveDialog({
        title: '保存 PDF',
        defaultPath: `礼金簿_${serializableData.exportDate.replace(/[年月日]/g, '')}.pdf`,
        filters: [
          { name: 'PDF 文件', extensions: ['pdf'] }
        ]
      })

      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer)
        return { success: true, filePath }
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
        return { success: true, filePath: filePaths[0] }
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

      return { success: true, filePath: finalPath }
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

        return { success: true, filePath: finalPath }
      }

      return { success: true, filePath: dbPath }
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

      return { success: true, recentDatabases: dbFiles }
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
        return { success: true, filePath: filePaths[0] }
      } else {
        return { success: false, error: '用户取消选择' }
      }
    } catch (error) {
      console.error('打开导入文件对话框失败:', error)
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
