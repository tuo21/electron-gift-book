import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from '../useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have initial state', () => {
    const store = useUIStore()
    
    expect(store.showSplashScreen).toBe(true)
    expect(store.isAppReady).toBe(false)
    expect(store.appName).toBe('电子礼金簿')
    expect(store.isEditingName).toBe(false)
    expect(store.hideAmount).toBe(true)
    expect(store.showStatisticsModal).toBe(false)
    expect(store.showEditHistoryModal).toBe(false)
    expect(store.showSearchModal).toBe(false)
    expect(store.showExportModal).toBe(false)
    expect(store.isExporting).toBe(false)
  })

  it('should set app name', () => {
    const store = useUIStore()
    store.setAppName('新名称')
    expect(store.appName).toBe('新名称')
  })

  it('should set editing name', () => {
    const store = useUIStore()
    store.setIsEditingName(true)
    expect(store.isEditingName).toBe(true)
    
    store.setIsEditingName(false)
    expect(store.isEditingName).toBe(false)
  })

  it('should save app name', () => {
    const store = useUIStore()
    store.setIsEditingName(true)
    store.saveAppName('保存的名称')
    
    expect(store.appName).toBe('保存的名称')
    expect(store.isEditingName).toBe(false)
  })

  it('should save app name without parameter', () => {
    const store = useUIStore()
    store.appName = '当前名称'
    store.setIsEditingName(true)
    store.saveAppName()
    
    expect(store.isEditingName).toBe(false)
  })

  it('should toggle amount display', () => {
    const store = useUIStore()
    expect(store.hideAmount).toBe(true)
    
    store.toggleAmountDisplay()
    expect(store.hideAmount).toBe(false)
    
    store.toggleAmountDisplay()
    expect(store.hideAmount).toBe(true)
  })

  it('should toggle hide amount', () => {
    const store = useUIStore()
    expect(store.hideAmount).toBe(true)
    
    store.toggleHideAmount()
    expect(store.hideAmount).toBe(false)
    
    store.toggleHideAmount()
    expect(store.hideAmount).toBe(true)
  })

  it('should open and close statistics modal', () => {
    const store = useUIStore()
    expect(store.showStatisticsModal).toBe(false)
    
    store.openStatisticsModal()
    expect(store.showStatisticsModal).toBe(true)
    
    store.closeStatisticsModal()
    expect(store.showStatisticsModal).toBe(false)
  })

  it('should open and close edit history modal', () => {
    const store = useUIStore()
    expect(store.showEditHistoryModal).toBe(false)
    
    store.openEditHistoryModal()
    expect(store.showEditHistoryModal).toBe(true)
    
    store.closeEditHistoryModal()
    expect(store.showEditHistoryModal).toBe(false)
  })

  it('should open and close search modal', () => {
    const store = useUIStore()
    expect(store.showSearchModal).toBe(false)
    
    store.openSearchModal()
    expect(store.showSearchModal).toBe(true)
    
    store.closeSearchModal()
    expect(store.showSearchModal).toBe(false)
  })

  it('should open and close export modal', () => {
    const store = useUIStore()
    expect(store.showExportModal).toBe(false)
    
    store.openExportModal()
    expect(store.showExportModal).toBe(true)
    
    store.closeExportModal()
    expect(store.showExportModal).toBe(false)
  })

  it('should set exporting state', () => {
    const store = useUIStore()
    expect(store.isExporting).toBe(false)
    
    store.setIsExporting(true)
    expect(store.isExporting).toBe(true)
    
    store.setIsExporting(false)
    expect(store.isExporting).toBe(false)
  })

  it('should show and hide splash screen', () => {
    const store = useUIStore()
    expect(store.showSplashScreen).toBe(true)
    
    store.hideSplash()
    expect(store.showSplashScreen).toBe(false)
    
    store.showSplash()
    expect(store.showSplashScreen).toBe(true)
  })

  it('should set app ready state', () => {
    const store = useUIStore()
    expect(store.isAppReady).toBe(false)
    
    store.setAppReady(true)
    expect(store.isAppReady).toBe(true)
    
    store.setAppReady(false)
    expect(store.isAppReady).toBe(false)
  })

  it('should set lunar date', () => {
    const store = useUIStore()
    const newDate = { primary: '正月初一', secondary: '春节' }
    
    store.setLunarDate(newDate)
    expect(store.lunarDate).toEqual(newDate)
  })
})
