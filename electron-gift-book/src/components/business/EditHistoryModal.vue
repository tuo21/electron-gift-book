<template>
  <Teleport to="body">
    <div class="modal-overlay" @click="emit('close')">
      <div class="modal-container" @click.stop>
        <div class="modal-content edit-history-modal">
          <div class="modal-header">
            <h3 class="modal-title">修改记录</h3>
            <button class="modal-close" @click="emit('close')">×</button>
          </div>
          <div class="modal-body">
            <div v-if="editHistoryList.length === 0" class="empty-history">
              暂无修改记录
            </div>
            <div v-else class="history-list">
              <div
                v-for="(history, index) in editHistoryList"
                :key="index"
                class="history-item"
                :class="{ 
                  'deleted-item': history.operationType === 'DELETE',
                  'restore-item': history.operationType === 'RESTORE'
                }"
                @contextmenu.prevent="showContextMenu($event, history)"
              >
                <div class="history-header">
                  <span class="history-name">{{ history.guestName }}</span>
                  <span class="history-time">{{ history.updateTime }}</span>
                  <span v-if="history.operationType === 'DELETE'" class="delete-badge">已删除</span>
                  <span v-if="history.operationType === 'RESTORE'" class="restore-badge">已还原</span>
                </div>
                <div class="history-changes">
                  <template v-if="history.operationType === 'DELETE'">
                    <div class="change-row">
                      <span class="change-label">删除前：</span>
                      <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}{{ history.itemDescription ? ' - ' + history.itemDescription : '' }}</span>
                    </div>
                  </template>
                  <template v-else-if="history.operationType === 'RESTORE'">
                    <div class="change-row">
                      <span class="change-label">还原数据：</span>
                      <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}{{ history.itemDescription ? ' - ' + history.itemDescription : '' }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="hasFieldChanges(history)" class="field-changes">
                      <div v-for="(change, idx) in getFieldChanges(history)" :key="idx" class="field-change-item">
                        <span class="field-label">{{ change.label }}：</span>
                        <span class="field-old">{{ change.oldValue || '(空)' }}</span>
                        <span class="field-arrow">→</span>
                        <span class="field-new">{{ change.newValue || '(空)' }}</span>
                      </div>
                    </div>
                    <div v-else class="change-row">
                      <span class="change-label">修改前：</span>
                      <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}{{ history.itemDescription ? ' - ' + history.itemDescription : '' }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop
  >
    <!-- 非删除记录：显示定位到该项和还原修改 -->
    <template v-if="selectedHistory?.operationType !== 'DELETE'">
      <div class="context-menu-item" @click="handleLocate">
        <IconSvg name="map-pin" :size="14" />
        <span>定位到该项</span>
      </div>
      <div class="context-menu-item" @click="handleRevert">
        <IconSvg name="undo" :size="14" />
        <span>还原修改</span>
      </div>
    </template>
    <!-- 已删除记录：显示还原数据 -->
    <template v-else>
      <div class="context-menu-item restore" @click="handleRestoreDeleted">
        <IconSvg name="refresh-cw" :size="14" color="#10B981" />
        <span>还原数据</span>
      </div>
    </template>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import IconSvg from '../IconSvg.vue'
import type { RecordHistory } from '../../types/database'

interface Props {
  editHistoryList: RecordHistory[]
}

interface Emits {
  (e: 'close'): void
  (e: 'locate', recordId: number): void
  (e: 'revert', history: RecordHistory): void
  (e: 'restore-deleted', history: RecordHistory): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedHistory = ref<RecordHistory | null>(null)

const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const getPaymentTypeLabel = (type?: number) => {
  if (type === undefined) return ''
  const labels = ['现金', '微信', '内收']
  return labels[type] || ''
}

interface FieldChange {
  label: string
  oldValue: string
  newValue: string
}

const getFieldChanges = (history: RecordHistory): FieldChange[] => {
  const changes: FieldChange[] = []
  
  if (history.newGuestName && history.guestName !== history.newGuestName) {
    changes.push({
      label: '姓名',
      oldValue: history.guestName,
      newValue: history.newGuestName
    })
  }
  
  if (history.newAmount !== undefined && history.amount !== history.newAmount) {
    changes.push({
      label: '金额',
      oldValue: formatMoney(history.amount || 0),
      newValue: formatMoney(history.newAmount)
    })
  }
  
  if (history.newRemark !== undefined && history.remark !== history.newRemark) {
    changes.push({
      label: '备注',
      oldValue: history.remark || '',
      newValue: history.newRemark || ''
    })
  }
  
  if (history.newItemDescription !== undefined && history.itemDescription !== history.newItemDescription) {
    changes.push({
      label: '物品',
      oldValue: history.itemDescription || '',
      newValue: history.newItemDescription || ''
    })
  }
  
  if (history.newPaymentType !== undefined && history.paymentType !== history.newPaymentType) {
    changes.push({
      label: '支付方式',
      oldValue: getPaymentTypeLabel(history.paymentType),
      newValue: getPaymentTypeLabel(history.newPaymentType)
    })
  }
  
  return changes
}

const hasFieldChanges = (history: RecordHistory): boolean => {
  return getFieldChanges(history).length > 0
}

// 显示右键菜单
const showContextMenu = (event: MouseEvent, history: RecordHistory) => {
  event.preventDefault()
  selectedHistory.value = history
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false
  selectedHistory.value = null
}

// 点击其他地方关闭菜单
onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

// 定位到该项
const handleLocate = () => {
  if (!selectedHistory.value) {
    closeContextMenu()
    return
  }
  // 先保存记录ID，再关闭菜单
  const recordId = selectedHistory.value.recordId
  closeContextMenu()
  emit('locate', recordId)
}

// 还原修改
const handleRevert = () => {
  if (!selectedHistory.value || selectedHistory.value.operationType === 'DELETE') {
    closeContextMenu()
    return
  }

  // 先保存选中的历史记录，再关闭菜单
  const historyToRevert = selectedHistory.value

  closeContextMenu()

  if (!confirm('确定要还原此修改吗？')) return

  emit('revert', historyToRevert)
}

// 还原已删除的数据
const handleRestoreDeleted = () => {
  console.log('[EditHistoryModal] handleRestoreDeleted 被调用')
  
  if (!selectedHistory.value || selectedHistory.value.operationType !== 'DELETE') {
    console.log('[EditHistoryModal] 不是删除记录或没有选中记录，直接关闭菜单')
    closeContextMenu()
    return
  }

  // 先保存选中的历史记录
  const historyToRestore = selectedHistory.value
  console.log('[EditHistoryModal] 准备还原的记录:', historyToRestore)

  // 使用 setTimeout 确保菜单先关闭，然后弹出确认对话框
  setTimeout(async () => {
    console.log('[EditHistoryModal] setTimeout 回调执行，准备弹出确认对话框')
    
    // 弹出确认对话框（注意：confirm 可能是异步的，需要使用 await）
    const confirmed = await confirm(`确定要还原 ${historyToRestore.guestName} 的数据吗？`)
    console.log('[EditHistoryModal] 用户确认结果:', confirmed)
    
    // 用户取消，不执行操作
    if (!confirmed) {
      console.log('[EditHistoryModal] 用户取消还原操作')
      return
    }

    // 用户确认后执行还原
    console.log('[EditHistoryModal] 用户确认，发送 restore-deleted 事件')
    emit('restore-deleted', historyToRestore)
  }, 10)
  
  // 立即关闭菜单
  console.log('[EditHistoryModal] 立即关闭菜单')
  closeContextMenu()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: #f5f0e8;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 500px;
  max-width: 90vw;
  max-height: 80vh;
}

.modal-content {
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #d4c8b8;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.modal-body {
  padding: 20px;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
  flex: 1;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: 8px;
  padding: 12px;
  cursor: context-menu;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(235, 86, 74, 0.1);
}

.history-name {
  font-weight: bold;
  font-size: 14px;
  color: #333;
}

.history-time {
  font-size: 12px;
  color: #666;
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-changes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}

.field-label {
  color: #666;
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.field-old {
  color: #666;
  text-decoration: line-through;
  opacity: 0.7;
}

.field-arrow {
  color: #666;
  opacity: 0.5;
  margin: 0 4px;
}

.field-new {
  color: #EB564A;
  font-weight: bold;
}

.change-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.change-label {
  color: #666;
  flex-shrink: 0;
}

.change-value {
  color: #333;
  word-break: break-all;
}

.change-value.new-value {
  color: #EB564A;
  font-weight: bold;
}

/* 删除记录样式 */
.deleted-item {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.3);
}

.deleted-item .history-header {
  border-bottom-color: rgba(239, 68, 68, 0.2);
}

/* 还原记录样式 */
.restore-item {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.3);
}

.restore-item .history-header {
  border-bottom-color: rgba(16, 185, 129, 0.2);
}

.delete-badge {
  background: #ef4444;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
}

.restore-badge {
  background: #10B981;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #d4c8b8;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 140px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  color: #333;
}

.context-menu-item:hover {
  background: rgba(235, 86, 74, 0.1);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.context-menu-item.restore {
  color: #10B981;
}

.context-menu-item.restore:hover {
  background: rgba(16, 185, 129, 0.1);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
