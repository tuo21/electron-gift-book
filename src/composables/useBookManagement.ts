import { type Ref } from 'vue'
import type { Record } from '../types/database'
import type { ThemeType } from '../types/theme'
import { logger } from '../utils/logger'

export function useBookManagement(
  setTheme: (theme: ThemeType, skipSave?: boolean) => void,
  config: Ref<{
    theme: ThemeType
    currentDbPath: string | null
    eventName: string
    customFontCssName: string | null
    recentBooks: { name: string; path: string }[]
  }>,
  showSplashScreen: Ref<boolean>,
  isAppReady: Ref<boolean>,
  syncDialogVisible: Ref<boolean>,
  bookName: Ref<string>,
  records: Ref<Record[]>,
  statistics: Ref<{
    totalCount: number
    totalAmount: number
    cashAmount: number
    wechatAmount: number
    internalAmount: number
  }>,
  setEventName: (name: string) => void,
  setEventDate: (date: string) => void,
  setCurrentDbPath: (path: string) => void,
  generateFileName: (name: string) => Promise<string>,
  addToRecentBooks: (name: string, path: string) => void,
  removeFromRecentBooks: (path: string) => void,
  loadRecords: () => Promise<void>,
  loadStatistics: () => Promise<void>,
) {
  function handleSyncToMiniApp() {
    syncDialogVisible.value = true
  }

  async function handleCreateBookFromHome(data: { eventName: string; eventDate: string; theme: ThemeType }) {
    try {
      setTheme(data.theme, true)
      config.value.theme = data.theme
      bookName.value = data.eventName
      setEventName(data.eventName)
      setEventDate(data.eventDate)
      await handleCreateNewBook(data.eventName, data.theme, data.eventDate)
      showSplashScreen.value = false
      isAppReady.value = true
      await loadRecords()
      await loadStatistics()
    } catch (error) {
      logger.error('BookMgmt', '创建礼薄失败:', error)
      alert('创建礼薄失败，请重试')
    }
  }

  async function handleOpenBookFromHome(path: string) {
    try {
      logger.debug('Theme', '开始打开礼薄:', path)
      let themeToApply: ThemeType | undefined
      logger.debug('Theme', '调用 getDatabaseTheme...')
      const themeResponse = await (window as any).electronAPI.getDatabaseTheme(path)
      logger.debug('Theme', 'getDatabaseTheme 响应:', themeResponse)
      if (themeResponse.success && themeResponse.data) {
        themeToApply = themeResponse.data as ThemeType
        logger.debug('Theme', '读取到主题:', themeToApply)
      } else {
        logger.debug('Theme', '未读取到主题或读取失败')
      }
      logger.debug('Theme', '调用 handleOpenExistingBook, theme:', themeToApply)
      await handleOpenExistingBook(path, '', themeToApply)
      logger.debug('Theme', 'handleOpenExistingBook 完成')
      showSplashScreen.value = false
      isAppReady.value = true
      await loadRecords()
      await loadStatistics()
    } catch (error) {
      logger.error('BookMgmt', '打开礼薄失败:', error)
      alert('打开礼薄失败，请重试')
    }
  }

  async function handleEditBookFromHome(data: { path: string; name: string; eventDate: string; theme: ThemeType }) {
    try {
      await (window as any).electronAPI.updateDatabaseTheme(data.path, data.theme)
      setTheme(data.theme, true)
      config.value.theme = data.theme
      await (window as any).electronAPI.updateDatabaseEventDate(data.path, data.eventDate)
      if (data.name) {
        const newFileName = await generateFileName(data.name)
        const response = await (window as any).electronAPI.renameDatabase(data.path, newFileName)
        if (response.success && response.data?.newPath) {
          await removeFromRecentBooks(data.path)
          await addToRecentBooks(data.name, response.data.newPath)
        }
      }
      await scanDataDirectory()
      alert('编辑成功！')
    } catch (error) {
      logger.error('BookMgmt', '编辑礼薄失败:', error)
      alert('编辑礼薄失败，请重试')
    }
  }

  function handleImportFromHome() {
    logger.info('BookMgmt', '导入功能开发中')
  }

  function handleOpenFileFromHome() {
    logger.info('BookMgmt', '打开文件功能开发中')
  }

  function handleMinimizeWindow() {
    logger.debug('BookMgmt', '最小化窗口')
  }

  function handleCloseWindow() {
    logger.debug('BookMgmt', '关闭窗口')
  }

  async function handleCreateNewBook(eventName: string, theme?: ThemeType, eventDate?: string) {
    try {
      if (records.value.length > 0 && config.value.currentDbPath) {
        const currentFileName = await generateFileName(config.value.eventName)
        await (window as any).electronAPI.saveCurrentDatabase(currentFileName)
        await addToRecentBooks(config.value.eventName, config.value.currentDbPath)
      }
      const newFileName = await generateFileName(eventName)
      const response = await (window as any).electronAPI.createNewDatabase(newFileName, theme, eventName, eventDate)
      if (response.success && response.data?.filePath) {
        await setCurrentDbPath(response.data.filePath)
        await addToRecentBooks(eventName, response.data.filePath)
        records.value = []
        statistics.value = { totalCount: 0, totalAmount: 0, cashAmount: 0, wechatAmount: 0, internalAmount: 0 }
      } else {
        const errorMsg = '创建新数据库失败: ' + (response.error || '未知错误')
        alert(errorMsg)
        throw new Error(errorMsg)
      }
    } catch (error) {
      logger.error('BookMgmt', '新建礼金簿失败:', error)
      const errorMsg = '新建礼金簿失败，请重试'
      alert(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async function handleOpenExistingBook(filePath: string, eventName: string, theme?: ThemeType) {
    try {
      logger.debug('Theme', 'handleOpenExistingBook 被调用, theme:', theme)
      if (records.value.length > 0 && config.value.currentDbPath) {
        const currentFileName = await generateFileName(config.value.eventName)
        await (window as any).electronAPI.saveCurrentDatabase(currentFileName)
      }
      const response = await (window as any).electronAPI.switchDatabase(filePath)
      logger.debug('Theme', 'switchDatabase 响应:', response.success)
      if (response.success) {
        const fileName = filePath.split(/[\\/]/).pop() || ''
        const extractedEventName = fileName.replace(/\.db$/i, '')
        const finalEventName = eventName || extractedEventName || '电子礼金簿'
        bookName.value = finalEventName
        await setEventName(finalEventName)
        await setCurrentDbPath(filePath)
        await addToRecentBooks(finalEventName, filePath)
        if (theme) {
          logger.debug('Theme', '开始应用主题:', theme)
          setTheme(theme, true)
          config.value.theme = theme
          logger.debug('Theme', 'setTheme 调用完成')
        } else {
          logger.debug('Theme', '没有传入主题参数，跳过应用')
        }
      } else {
        const errorMsg = '打开数据库失败：' + (response.error || '未知错误')
        alert(errorMsg)
        throw new Error(errorMsg)
      }
    } catch (error) {
      logger.error('BookMgmt', '打开已有数据失败:', error)
      const errorMsg = '打开已有数据失败，请重试'
      alert(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async function handleBackToSplash() {
    try {
      if (records.value.length > 0 && config.value.currentDbPath) {
        const currentFileName = await generateFileName(config.value.eventName)
        await (window as any).electronAPI.saveCurrentDatabase(currentFileName)
      }
      isAppReady.value = false
      showSplashScreen.value = true
      records.value = []
      statistics.value = { totalCount: 0, totalAmount: 0, cashAmount: 0, wechatAmount: 0, internalAmount: 0 }
    } catch (error) {
      logger.error('BookMgmt', '返回启动页失败:', error)
      alert('返回启动页失败，请重试')
    }
  }

  async function scanDataDirectory() {
    try {
      const response = await (window as any).electronAPI.getRecentDatabases()
      if (response.success && response.data?.recentDatabases) {
        config.value.recentBooks = response.data.recentDatabases
      }
    } catch (error) {
      logger.error('BookMgmt', '扫描数据目录失败:', error)
    }
  }

  return {
    handleSyncToMiniApp,
    handleCreateBookFromHome, handleOpenBookFromHome, handleEditBookFromHome,
    handleImportFromHome, handleOpenFileFromHome,
    handleMinimizeWindow, handleCloseWindow,
    handleCreateNewBook, handleOpenExistingBook,
    handleBackToSplash, scanDataDirectory,
  }
}
