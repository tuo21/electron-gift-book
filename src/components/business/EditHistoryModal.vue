<template>
  <Teleport to="body">
    <div class="history-overlay" @click.self="handleClose">
      <div class="history-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">修改记录</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
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
import '../../types/database'
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

const handleClose = () => {
  emit('close')
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
const handleRevert = async () => {
  if (!selectedHistory.value || selectedHistory.value.operationType === 'DELETE') {
    closeContextMenu()
    return
  }

  // 先保存选中的历史记录，再关闭菜单
  const historyToRevert = selectedHistory.value

  closeContextMenu()

  if (!await window.confirmDialog('确定要还原此修改吗？')) return

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
    const confirmed = await window.confirmDialog(`确定要还原 ${historyToRestore.guestName} 的数据吗？`)
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
/* 遮罩层 */
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗主体 */
.history-dialog {
  width: 580px;
  max-height: 85vh;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  box-shadow: var(--theme-shadow-lg), 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 标题栏 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--theme-border);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-text-muted);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

/* 内容区 */
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

/* 滚动条 */
.dialog-body::-webkit-scrollbar {
  width: 5px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: var(--theme-border-color);
  border-radius: 3px;
  opacity: 0.4;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: var(--theme-text-secondary);
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.02) 0%, rgba(var(--theme-primary-rgb), 0.05) 100%);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.12);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  cursor: context-menu;
  transition: all 0.25s ease;
}

.history-item:hover {
  border-color: rgba(var(--theme-primary-rgb), 0.25);
  box-shadow: 0 2px 8px rgba(var(--theme-primary-rgb), 0.08);
  transform: translateY(-1px);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(var(--theme-primary-rgb), 0.15);
  flex-wrap: wrap;
  gap: 8px;
}

.history-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--theme-text-primary);
  flex: 1;
  min-width: 120px;
}

.history-time {
  font-size: 12px;
  color: var(--theme-text-secondary);
  flex-shrink: 0;
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-changes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
  flex-wrap: wrap;
}

.field-label {
  color: var(--theme-text-secondary);
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.field-old {
  color: var(--theme-text-secondary);
  text-decoration: line-through;
  opacity: 0.7;
  flex: 1;
  min-width: 100px;
}

.field-arrow {
  color: var(--theme-text-secondary);
  opacity: 0.5;
  margin: 0 4px;
  flex-shrink: 0;
}

.field-new {
  color: var(--theme-accent);
  font-weight: 600;
  flex: 1;
  min-width: 100px;
}

.change-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.change-label {
  color: var(--theme-text-secondary);
  flex-shrink: 0;
}

.change-value {
  color: var(--theme-text-primary);
  word-break: break-all;
  flex: 1;
  min-width: 200px;
}

.change-value.new-value {
  color: var(--theme-accent);
  font-weight: 600;
}

/* 删除记录样式 */
.deleted-item {
  background: rgba(239, 68, 68, 0.03);
  border-color: rgba(239, 68, 68, 0.15);
}

.deleted-item .history-header {
  border-bottom-color: rgba(239, 68, 68, 0.1);
}

/* 还原记录样式 */
.restore-item {
  background: rgba(16, 185, 129, 0.03);
  border-color: rgba(16, 185, 129, 0.2);
}

.restore-item .history-header {
  border-bottom-color: rgba(16, 185, 129, 0.15);
}

.delete-badge {
  background: #ef4444;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--theme-border-radius);
  margin-left: 8px;
  flex-shrink: 0;
}

.restore-badge {
  background: #10B981;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--theme-border-radius);
  margin-left: 8px;
  flex-shrink: 0;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #FFFFFF;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow-lg), 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 10000;
  min-width: 140px;
  padding: 4px 0;
  animation: menuFadeIn 0.15s ease;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: var(--theme-text-primary);
}

.context-menu-item:hover {
  background: rgba(var(--theme-primary-rgb), 0.05);
  color: var(--theme-accent);
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
  background: rgba(16, 185, 129, 0.06);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 底部操作栏 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 28px 20px;
  border-top: 1px solid var(--theme-border);
}

.footer-btn {
  padding: 10px 28px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.footer-btn.cancel {
  background: transparent;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.footer-btn.cancel:hover {
  background: rgba(var(--theme-primary-rgb), 0.04);
  color: var(--theme-text-primary);
}
</style>
