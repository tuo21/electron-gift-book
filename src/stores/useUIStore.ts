/**
 * UI Store
 * Manages UI-related state and operations
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { UIState, UIActions } from '../types/stores'
import { getLunarDisplay } from '../utils/lunarCalendar'

export const useUIStore = defineStore('ui', (): UIState & UIActions => {
  // State
  const showSplashScreen = ref(true)
  const isAppReady = ref(false)
  const appName = ref('电子礼金簿')
  const isEditingName = ref(false)
  const lunarDate = ref(getLunarDisplay())
  const hideAmount = ref(true)
  const showStatisticsModal = ref(false)
  const showEditHistoryModal = ref(false)

  const showSearchModal = ref(false)
  const showExportModal = ref(false)
  const isExporting = ref(false)

  // Actions
  const setAppName = (name: string): void => {
    appName.value = name
  }

  const setIsEditingName = (editing: boolean): void => {
    isEditingName.value = editing
  }

  const saveAppName = (name?: string): void => {
    if (name) {
      appName.value = name
    }
    isEditingName.value = false
  }

  const setLunarDate = (date: { primary: string; secondary: string }): void => {
    lunarDate.value = date
  }

  const toggleAmountDisplay = (): void => {
    hideAmount.value = !hideAmount.value
  }

  const toggleHideAmount = (): void => {
    hideAmount.value = !hideAmount.value
  }

  const openStatisticsModal = (): void => {
    showStatisticsModal.value = true
  }

  const closeStatisticsModal = (): void => {
    showStatisticsModal.value = false
  }

  const openEditHistoryModal = (): void => {
    showEditHistoryModal.value = true
  }

  const closeEditHistoryModal = (): void => {
    showEditHistoryModal.value = false
  }

  const openSearchModal = (): void => {
    showSearchModal.value = true
  }

  const closeSearchModal = (): void => {
    showSearchModal.value = false
  }

  const openExportModal = (): void => {
    showExportModal.value = true
  }

  const closeExportModal = (): void => {
    showExportModal.value = false
  }

  const setIsExporting = (exporting: boolean): void => {
    isExporting.value = exporting
  }

  const showSplash = (): void => {
    showSplashScreen.value = true
  }

  const hideSplash = (): void => {
    showSplashScreen.value = false
  }

  const setAppReady = (ready: boolean): void => {
    isAppReady.value = ready
  }

  return {
    // State
    showSplashScreen,
    isAppReady,
    appName,
    isEditingName,
    lunarDate,
    hideAmount,
    showStatisticsModal,
    showEditHistoryModal,

    showSearchModal,
    showExportModal,
    isExporting,

    // Actions
    setAppName,
    setIsEditingName,
    saveAppName,
    setLunarDate,
    toggleAmountDisplay,
    toggleHideAmount,
    openStatisticsModal,
    closeStatisticsModal,
    openEditHistoryModal,
    closeEditHistoryModal,
    openSearchModal,
    closeSearchModal,
    openExportModal,
    closeExportModal,
    setIsExporting,
    showSplash,
    hideSplash,
    setAppReady,
  }
})