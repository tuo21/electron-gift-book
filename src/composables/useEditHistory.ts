import type { Ref } from 'vue'
import type { RecordHistory } from '../types/database'
import { logger } from '../utils/logger'

export function useEditHistory(
  editHistoryList: Ref<RecordHistory[]>,
  showEditHistoryModal: Ref<boolean>,
  currentPage: Ref<number>,
  recordListRef: Ref<{ highlightRecord: (id: number) => void } | undefined | null>,
  toastRef: Ref<{ success: (msg: string, duration?: number) => void; error: (msg: string) => void } | null>,
  loadRecords: () => Promise<void>,
  loadStatistics: () => Promise<void>,
) {
  async function openEditHistoryModal() {
    try {
      const response = await (window as any).db.getAllRecordHistory()
      if (response.success && response.data) {
        editHistoryList.value = response.data
        showEditHistoryModal.value = true
      } else {
        alert('加载修改记录失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('EditHistory', '加载修改记录失败:', error)
      alert('加载修改记录失败')
    }
  }

  function closeEditHistoryModal() {
    showEditHistoryModal.value = false
  }

  async function handleLocateRecord(recordId: number) {
    closeEditHistoryModal()
    try {
      const response = await (window as any).db.getRecordPage(recordId, 15)
      if (response.success && response.data) {
        currentPage.value = response.data
        setTimeout(() => { recordListRef.value?.highlightRecord(recordId) }, 300)
      } else {
        toastRef.value?.error('无法定位到该记录，可能已被删除')
      }
    } catch (error) {
      logger.error('EditHistory', '定位记录失败:', error)
      toastRef.value?.error('定位记录失败')
    }
  }

  async function handleRevertRecord(history: RecordHistory) {
    closeEditHistoryModal()
    try {
      const currentRecordResponse = await (window as any).db.getRecordById(history.recordId)
      if (!currentRecordResponse.success) throw new Error('无法获取当前记录')

      const revertedRecord = {
        id: history.recordId,
        guestName: history.guestName || '',
        amount: history.amount || 0,
        amountChinese: currentRecordResponse.data?.amountChinese || null,
        itemDescription: history.itemDescription || null,
        paymentType: history.paymentType || 1,
        remark: history.remark || null,
        isDeleted: 0,
      }

      const response = await (window as any).db.updateRecord(revertedRecord as any)
      if (response.success) {
        await loadRecords()
        await loadStatistics()
        toastRef.value?.success('还原成功！', 3000)

        const pageResponse = await (window as any).db.getRecordPage(history.recordId, 15)
        if (pageResponse.success && pageResponse.data) {
          currentPage.value = pageResponse.data
          setTimeout(() => { recordListRef.value?.highlightRecord(history.recordId) }, 300)
        }
      } else {
        throw new Error(response.error || '还原失败')
      }
    } catch (error) {
      logger.error('EditHistory', '还原修改失败:', error)
      toastRef.value?.error('还原修改失败，请重试')
    }
  }

  async function handleRestoreDeletedRecord(history: RecordHistory) {
    closeEditHistoryModal()
    try {
      const response = await (window as any).db.restoreDeletedRecord(history)
      if (response.success && response.data) {
        const newRecordId = response.data.id
        await loadRecords()
        await loadStatistics()
        toastRef.value?.success('数据还原成功！', 3000)

        const pageResponse = await (window as any).db.getRecordPage(newRecordId, 15)
        if (pageResponse.success && pageResponse.data) {
          currentPage.value = pageResponse.data
          setTimeout(() => { recordListRef.value?.highlightRecord(newRecordId) }, 300)
        }
      } else {
        throw new Error(response.error || '还原失败')
      }
    } catch (error) {
      logger.error('EditHistory', '还原数据失败:', error)
      toastRef.value?.error('还原数据失败，请重试')
    }
  }

  return { openEditHistoryModal, closeEditHistoryModal, handleLocateRecord, handleRevertRecord, handleRestoreDeletedRecord }
}
