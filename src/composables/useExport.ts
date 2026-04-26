import { ref, type Ref } from 'vue'
import { exportToExcel, exportToPDF } from '../utils/export'
import { logger } from '../utils/logger'
import type { Record } from '../types/database'

export function useExport(
  records: Ref<Record[]>,
  bookName: Ref<string>,
  showExportModal: Ref<boolean>,
  isExporting: Ref<boolean>,
  showActivateModal: Ref<boolean>,
  config: Ref<{ eventDate?: string | null; eventName?: string }>,
  currentTheme: Ref<string>,
  checkActivation: () => Promise<boolean>,
  toastRef: Ref<{ success: (msg: string, duration?: number) => void; error: (msg: string) => void } | null>,
) {
  const exportProgress = ref(0)

  function handleSave() { logger.info('Export', '数据已自动保存') }

  async function handleExport() {
    const isActivated = await checkActivation()
    if (!isActivated) {
      showActivateModal.value = true
      return
    }
    showExportModal.value = true
  }

  function closeExportModal() {
    showExportModal.value = false
  }

  async function handleExportFormat(format: 'excel' | 'pdf', options?: { theme?: 'red' | 'gray' | 'golden'; layout?: 'h' | 'v' }) {
    if (format === 'excel') await handleExportExcel()
    else await handleExportPDF(options?.theme, options?.layout)
  }

  async function handleExportExcel() {
    if (records.value.length === 0) { alert('没有可导出的记录'); return }
    isExporting.value = true
    try {
      const eventDate = config.value.eventDate || undefined
      await exportToExcel(records.value, bookName.value, eventDate)
      closeExportModal()
      toastRef.value?.success('Excel 导出成功！', 3000)
    } catch (error) {
      logger.error('Export', '导出 Excel 失败:', error)
      if ((error as Error).message !== '用户取消保存') {
        toastRef.value?.error('导出 Excel 失败，请重试')
      }
    } finally {
      isExporting.value = false
    }
  }

  async function handleExportPDF(theme?: 'red' | 'gray' | 'golden', layout?: 'h' | 'v') {
    if (records.value.length === 0) { alert('没有可导出的记录'); return }
    isExporting.value = true
    exportProgress.value = 0
    try {
      exportProgress.value = 10
      await new Promise(resolve => setTimeout(resolve, 100))
      const themeType = theme || (currentTheme.value === 'gray' ? 'gray' : currentTheme.value === 'golden' ? 'golden' : 'red')
      const layoutType = layout || 'h'
      exportProgress.value = 30
      const eventDate = config.value.eventDate || undefined
      await exportToPDF(records.value, bookName.value, themeType, eventDate, undefined, layoutType)
      exportProgress.value = 100
      closeExportModal()
      toastRef.value?.success('PDF 导出成功！', 5000)
    } catch (error) {
      logger.error('Export', '导出 PDF 失败:', error)
      if ((error as Error).message !== '用户取消保存') {
        toastRef.value?.error('导出 PDF 失败，请重试')
      }
    } finally {
      isExporting.value = false
      setTimeout(() => { exportProgress.value = 0 }, 500)
    }
  }

  return { exportProgress, handleSave, handleExport, closeExportModal, handleExportFormat }
}
