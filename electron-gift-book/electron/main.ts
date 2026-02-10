import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  initDatabase,
  closeDatabase,
  insertRecord,
  updateRecord,
  softDeleteRecord,
  getAllRecords,
  getRecordById,
  searchRecords,
  insertHistory,
  getRecordHistory,
  getStatistics,
  type Record,
  type RecordHistory
} from './database'

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
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
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

  // 更新记录
  ipcMain.handle('db:updateRecord', (_, record: Record) => {
    try {
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
          ChangeDesc: '更新记录'
        })
      }
      updateRecord(record)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // 软删除记录
  ipcMain.handle('db:softDeleteRecord', (_, id: number) => {
    try {
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
          ChangeDesc: '删除记录'
        })
      }
      softDeleteRecord(id)
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

  // 获取统计数据
  ipcMain.handle('db:getStatistics', () => {
    try {
      return { success: true, data: getStatistics() }
    } catch (error) {
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
