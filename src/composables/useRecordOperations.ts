import { computed, nextTick, type Ref } from 'vue'
import type { Record } from '../types/database'
import { mapApiRecord, mapApiRecords } from '../utils/recordMapper'
import { AmountConverter } from '../utils/amountConverter'
import { voiceService } from '../services/voiceService'
import { logger } from '../utils/logger'
import { DEFAULT_PAGE_SIZE } from '../constants'

export function useRecordOperations(
  records: Ref<Record[]>,
  recordsStore: { totalRecords: number },
  currentPage: Ref<number>,
  statistics: Ref<{ totalCount: number; totalAmount: number; cashAmount: number; wechatAmount: number; internalAmount: number }>,
  currentPreview: Ref<{ field: string; value: string }>,
  showStatisticsModal: Ref<boolean>,
  _showActivateModal: Ref<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
  recordListRef: Ref<{ markNewRecord: (id: number) => void } | undefined | null>,
  recordFormRef: Ref<{ enterEditMode: (record: Record) => void } | undefined | null>,
  _checkActivation: () => Promise<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
) {
  async function loadRecords(keepCurrentPage: boolean = false, newRecordId?: number) {
    try {
      const response = await (window as any).db.getAllRecords()
      if (response.success && response.data) {
        const newRecords = mapApiRecords(response.data)
        const currentRecords = records.value

        if (newRecordId && currentRecords.length > 0) {
          const existingIds = new Set(currentRecords.map(r => r.id))
          const addedRecords = newRecords.filter((r: Record) => !existingIds.has(r.id))
          if (addedRecords.length > 0) {
            records.value = [...currentRecords, ...addedRecords]
          } else if (newRecords.length !== currentRecords.length) {
            records.value = newRecords
          } else {
            records.value = newRecords
          }
        } else {
          records.value = newRecords
        }

        recordsStore.totalRecords = records.value.length

        if (!keepCurrentPage) {
          currentPage.value = Math.max(1, Math.ceil(records.value.length / DEFAULT_PAGE_SIZE))
        } else {
          const totalPages = Math.max(1, Math.ceil(records.value.length / DEFAULT_PAGE_SIZE))
          if (currentPage.value > totalPages) currentPage.value = totalPages
        }
      } else if (!response.success) {
        alert('加载记录失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Records', '加载记录失败:', error)
      alert('加载记录失败，请检查数据库连接')
    } finally {
      recordsStore.totalRecords = records.value.length
    }
  }

  async function loadStatistics() {
    try {
      const response = await (window as any).db.getStatistics()
      if (response.success && response.data) {
        statistics.value = response.data
      } else if (!response.success) {
        logger.error('Records', '加载统计失败:', response.error)
      }
    } catch (error) {
      logger.error('Records', '加载统计失败:', error)
    }
  }

  async function addRecordIncrementally(newRecordId: number) {
    try {
      const response = await (window as any).db.getRecordById(newRecordId)
      if (response.success && response.data) {
        const newRecord = mapApiRecord(response.data as any)
        records.value = [...records.value, newRecord]
        await loadStatistics()
        currentPage.value = Math.max(1, Math.ceil(records.value.length / DEFAULT_PAGE_SIZE))
        await nextTick()
        recordListRef.value?.markNewRecord(newRecordId)
      }
    } catch (error) {
      logger.error('Records', '增量添加记录失败:', error)
      await loadRecords(true)
    }
  }

  async function updateRecordIncrementally(updatedRecordId: number) {
    try {
      const response = await (window as any).db.getRecordById(updatedRecordId)
      if (response.success && response.data) {
        const updatedRecord = mapApiRecord(response.data as any)
        const index = records.value.findIndex(r => r.id === updatedRecordId)
        if (index !== -1) {
          const newRecords = [...records.value]
          newRecords[index] = updatedRecord
          records.value = newRecords
        } else {
          await loadRecords(true)
        }
        await loadStatistics()
      } else {
        await loadRecords(true)
      }
    } catch (error) {
      logger.error('Records', '增量更新记录失败:', error)
      await loadRecords(true)
    }
  }

  async function deleteRecordIncrementally(deletedRecordId: number) {
    try {
      const oldLength = records.value.length
      records.value = records.value.filter(r => r.id !== deletedRecordId)
      if (records.value.length < oldLength) {
        const totalPages = Math.max(1, Math.ceil(records.value.length / DEFAULT_PAGE_SIZE))
        if (currentPage.value > totalPages) currentPage.value = totalPages
      }
      await loadStatistics()
    } catch (error) {
      logger.error('Records', '增量删除记录失败:', error)
      await loadRecords(true)
    }
  }

  function handleInputPreview(field: string, value: string) {
    currentPreview.value = { field, value }
  }

  function clearPreview() {
    currentPreview.value = { field: '', value: '' }
  }

  async function handleSubmit(record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) {
    try {
      const dbRecord = {
        guestName: record.guestName.trim(),
        amount: record.amount,
        amountChinese: record.amountChinese || null,
        itemDescription: record.itemDescription?.trim() || null,
        paymentType: record.paymentType,
        remark: record.remark?.trim() || null,
        isDeleted: 0,
      }
      const response = await (window as any).db.insertRecord(dbRecord as any)
      if (response.success && response.data) {
        const newRecordId = response.data.id
        await addRecordIncrementally(newRecordId)
        clearPreview()
        if (voiceService.isSupported()) {
          const amountChinese = record.amountChinese || AmountConverter.toChinese(record.amount)
          voiceService.speakGiftInfo(record.guestName, record.amount, amountChinese)
        }
      } else {
        alert('保存失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Records', '保存记录失败:', error)
      alert('保存失败，请重试')
    }
  }

  function handleEdit(record: Record) {
    recordFormRef.value?.enterEditMode(record)
  }

  async function handleUpdate(record: Record) {
    try {
      const dbRecord = {
        id: record.id,
        guestName: record.guestName.trim(),
        amount: record.amount,
        amountChinese: record.amountChinese || null,
        itemDescription: record.itemDescription?.trim() || null,
        paymentType: record.paymentType,
        remark: record.remark?.trim() || null,
        isDeleted: record.isDeleted,
      }
      const response = await (window as any).db.updateRecord(dbRecord as any)
      if (response.success) {
        if (record.id !== null && record.id !== undefined) {
          await updateRecordIncrementally(record.id)
        } else {
          await loadRecords(true)
        }
      } else {
        alert('更新失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Records', '更新记录失败:', error)
      alert('更新失败，请重试')
    }
  }

  async function handleDelete(id: number) {
    try {
      const response = await (window as any).db.softDeleteRecord(id)
      if (response.success) {
        await deleteRecordIncrementally(id)
      } else {
        alert('删除失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Records', '删除记录失败:', error)
      alert('删除失败，请重试')
    }
  }

  function formatMoney(amount: number | undefined) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const currentPageAmount = computed(() => {
    const start = (currentPage.value - 1) * DEFAULT_PAGE_SIZE
    const end = start + DEFAULT_PAGE_SIZE
    const pageRecords = records.value.slice(start, end)
    const total = pageRecords.reduce((sum, record) => sum + (record.amount || 0), 0)
    return formatMoney(total)
  })

  async function openStatisticsModal() {
    // [ACTIVATION_FEATURE] 激活功能已被临时隐藏，所有用户均可使用统计功能
    // 如需重新启用激活检查，请恢复以下代码
    /*
    const isActivated = await checkActivation()
    if (!isActivated) { showActivateModal.value = true; return }
    */
    showStatisticsModal.value = true
  }

  function closeStatisticsModal() {
    showStatisticsModal.value = false
  }

  return {
    loadRecords, loadStatistics,
    handleSubmit, handleEdit, handleUpdate, handleDelete,
    handleInputPreview, clearPreview,
    currentPageAmount, openStatisticsModal, closeStatisticsModal,
  }
}
