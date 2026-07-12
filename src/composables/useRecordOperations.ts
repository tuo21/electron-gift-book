import { computed, nextTick, ref, type Ref } from 'vue'
import type { Record } from '../types/database'
import { mapApiRecord, mapApiRecords } from '../utils/recordMapper'
import { AmountConverter } from '../utils/amountConverter'
import { voiceService } from '../services/voiceService'
import { logger } from '../utils/logger'
import { DEFAULT_PAGE_SIZE } from '../constants'

type GroupState = 'none' | 'active' | 'paused'

export function useRecordOperations(
  records: Ref<Record[]>,
  recordsStore: { totalRecords: number },
  currentPage: Ref<number>,
  statistics: Ref<{ totalCount: number; totalAmount: number; cashAmount: number; wechatAmount: number; internalAmount: number; groupTotalExpense: number; groupTotalBalance: number }>,
  currentPreview: Ref<{ field: string; value: string }>,
  showStatisticsModal: Ref<boolean>,
  _showActivateModal: Ref<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
  recordListRef: Ref<{ markNewRecord: (id: number) => void } | undefined | null>,
  recordFormRef: Ref<{ enterEditMode: (record: Record) => void } | undefined | null>,
  _checkActivation: () => Promise<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
) {
  const groupState = ref<GroupState>('none')
  const currentGroupId = ref<number>(0)
  const nextGroupId = ref<number>(1)
  const insertAfterRecordId = ref<number | null>(null)
  const insertAfterCreateTime = ref<string | null>(null)
  const pendingInsertRecord = ref<Record | null>(null)
  async function loadRecords(keepCurrentPage: boolean = false, newRecordId?: number) {
    try {
      const response = await (window as any).db.getAllRecords()
      if (response.success && response.data) {
        let newRecords = mapApiRecords(response.data)
        const currentRecords = records.value

        if (pendingInsertRecord.value && insertAfterRecordId.value) {
          const insertIndex = newRecords.findIndex(r => r.id === insertAfterRecordId.value)
          if (insertIndex !== -1) {
            newRecords.splice(insertIndex + 1, 0, pendingInsertRecord.value)
          }
        }

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
      const isGroupMember = groupState.value === 'active'
      const currentGroup = currentGroupId.value
      const isPendingInsert = pendingInsertRecord.value !== null
      const dbRecord = {
        guestName: record.guestName.trim(),
        amount: record.amount,
        amountChinese: record.amountChinese || null,
        itemDescription: record.itemDescription?.trim() || null,
        paymentType: record.paymentType,
        remark: record.remark?.trim() || null,
        isDeleted: 0,
        groupId: isGroupMember ? currentGroup : null,
        groupRole: isGroupMember ? 'member' : null,
        createTime: insertAfterCreateTime.value || null,
      }
      const response = await (window as any).db.insertRecord(dbRecord as any)
      if (response.success && response.data) {
        const newRecordId = response.data.id
        if (!isPendingInsert) {
          await addRecordIncrementally(newRecordId)
        }
        clearPreview()
        if (voiceService.isSupported()) {
          const amountChinese = record.amountChinese || AmountConverter.toChinese(record.amount)
          voiceService.speakGiftInfo(record.guestName, record.amount, amountChinese)
        }
        if (isGroupMember && currentGroup) {
          pendingInsertRecord.value = null
          insertAfterRecordId.value = null
          insertAfterCreateTime.value = null
          await loadRecords()
          await updateGroupSummary(currentGroup)
        }
      } else {
        alert('保存失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Records', '保存记录失败:', error)
      alert('保存失败，请重试')
    }
  }

  function startGroup() {
    currentGroupId.value = nextGroupId.value
    nextGroupId.value++
    groupState.value = 'active'
  }

  function pauseGroup() {
    groupState.value = 'paused'
  }

  function resumeGroup() {
    groupState.value = 'active'
  }

  function setInsertPosition(recordId: number, createTime: string) {
    insertAfterRecordId.value = recordId
    insertAfterCreateTime.value = createTime
    pendingInsertRecord.value = {
      id: -Date.now(),
      guestName: '',
      amount: 0,
      amountChinese: '',
      itemDescription: '',
      paymentType: 0,
      remark: '',
      isDeleted: 0,
      groupId: currentGroupId.value,
      groupRole: 'member',
      createTime: createTime,
      isPendingInsert: true,
    }
  }

  async function cancelInsert() {
    pendingInsertRecord.value = null
    insertAfterRecordId.value = null
    insertAfterCreateTime.value = null
    groupState.value = 'none'
    currentGroupId.value = 0
    await loadRecords()
  }

  async function updateGroupSummary(groupId: number) {
    try {
      const groupRecords = records.value.filter(r => r.groupId === groupId && r.groupRole === 'member')
      const groupTotal = groupRecords.reduce((sum, r) => sum + (r.amount || 0), 0)

      const summaryRecord = records.value.find(r => r.groupId === groupId && r.groupRole === 'summary')
      if (summaryRecord && summaryRecord.id) {
        const expense = summaryRecord.groupExpense || 0
        const balance = groupTotal - expense

        const updateData: Record = {
          id: summaryRecord.id,
          guestName: '',
          amount: 0,
          amountChinese: '',
          itemDescription: '',
          paymentType: 0,
          remark: '',
          isDeleted: 0,
          groupId: groupId,
          groupRole: 'summary',
          groupTotal,
          groupExpense: expense,
          groupBalance: balance,
          groupExpenseDetail: summaryRecord.groupExpenseDetail,
        }

        const response = await (window as any).db.updateRecord(updateData as any)
        if (response.success) {
          await loadRecords()
        }
      }
    } catch (error) {
      logger.error('Records', '更新小组小计失败:', error)
    }
  }

  async function endGroup(data: { expense: number; detail: string; summaryId?: number | null }) {
    const { expense, detail, summaryId } = data
    try {
      const groupRecords = records.value.filter(r => r.groupId === currentGroupId.value && r.groupRole === 'member')
      const groupTotal = groupRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
      const groupBalance = groupTotal - expense

      if (summaryId) {
        const summaryRecord: Record = {
          id: summaryId,
          guestName: '',
          amount: 0,
          amountChinese: '',
          itemDescription: '',
          paymentType: 0,
          remark: '',
          isDeleted: 0,
          groupId: currentGroupId.value,
          groupRole: 'summary',
          groupTotal,
          groupExpense: expense,
          groupBalance,
          groupExpenseDetail: detail,
        }

        const response = await (window as any).db.updateRecord(summaryRecord as any)
        if (response.success) {
          await loadRecords()
        } else {
          alert('更新分组统计失败: ' + (response.error || '未知错误'))
        }
      } else {
        const summaryRecord: Omit<Record, 'id' | 'createTime' | 'updateTime'> = {
          guestName: '',
          amount: 0,
          amountChinese: '',
          itemDescription: '',
          paymentType: 0,
          remark: '',
          isDeleted: 0,
          groupId: currentGroupId.value,
          groupRole: 'summary',
          groupTotal,
          groupExpense: expense,
          groupBalance,
          groupExpenseDetail: detail,
        }

        const response = await (window as any).db.insertRecord(summaryRecord as any)
        if (response.success && response.data) {
          const newRecordId = response.data.id
          await addRecordIncrementally(newRecordId)
        } else {
          alert('保存分组统计失败: ' + (response.error || '未知错误'))
        }
      }
    } catch (error) {
      logger.error('Records', '结束分组失败:', error)
      alert('结束分组失败，请重试')
    } finally {
      await loadStatistics()
      groupState.value = 'none'
      currentGroupId.value = 0
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
        groupId: record.groupId || null,
        groupRole: record.groupRole || null,
      }
      const response = await (window as any).db.updateRecord(dbRecord as any)
      if (response.success) {
        if (record.id !== null && record.id !== undefined) {
          await updateRecordIncrementally(record.id)
        } else {
          await loadRecords(true)
        }
        if (record.groupId && record.groupRole === 'member') {
          await updateGroupSummary(record.groupId)
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
      const record = records.value.find(r => r.id === id)
      const groupId = record?.groupId
      const groupRole = record?.groupRole

      const response = await (window as any).db.softDeleteRecord(id)
      if (response.success) {
        await deleteRecordIncrementally(id)
        if (groupId && groupRole === 'member') {
          await updateGroupSummary(groupId)
        }
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
    const total = pageRecords.reduce((sum, record) => {
      if (record.groupRole === 'member' || record.isPendingInsert) {
        return sum
      }
      return sum + (record.amount || 0)
    }, 0)
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
    groupState, currentGroupId, startGroup, pauseGroup, resumeGroup, endGroup,
    setInsertPosition, cancelInsert,
  }
}
