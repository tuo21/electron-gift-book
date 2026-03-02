<template>
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
              :class="{ 'deleted-item': history.operationType === 'DELETE' }"
              @contextmenu.prevent="showContextMenu($event, history)"
            >
              <div class="history-header">
                <span class="history-name">{{ history.guestName }}</span>
                <span class="history-time">{{ history.updateTime }}</span>
                <span v-if="history.operationType === 'DELETE'" class="delete-badge">已删除</span>
              </div>
              <div class="history-changes">
                <template v-if="history.operationType === 'DELETE'">
                  <div class="change-row">
                    <span class="change-label">删除前：</span>
                    <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}{{ history.itemDescription ? ' - ' + history.itemDescription : '' }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="change-row">
                    <span class="change-label">修改前：</span>
                    <span class="change-value">{{ history.guestName }} - {{ formatMoney(history.amount || 0) }}{{ history.itemDescription ? ' - ' + history.itemDescription : '' }}</span>
                  </div>
                  <div class="change-row">
                    <span class="change-label">修改后：</span>
                    <span class="change-value new-value">{{ history.newGuestName }} - {{ formatMoney(history.newAmount || 0) }}{{ history.newItemDescription ? ' - ' + history.newItemDescription : '' }}</span>
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
    <div class="context-menu-item" @click="handleLocate">
      <IconSvg name="map-pin" :size="14" />
      <span>定位到该项</span>
    </div>
    <div
      class="context-menu-item"
      :class="{ 'disabled': selectedHistory?.operationType === 'DELETE' }"
      @click="handleRevert"
    >
      <IconSvg name="undo" :size="14" />
      <span>还原修改</span>
    </div>
  </div>
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
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
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
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);
  border-bottom: 1px solid var(--theme-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--theme-font-size-lg);
  color: var(--theme-text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--theme-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--theme-border-radius);
  transition: all 0.3s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--theme-text-primary);
}

.modal-body {
  padding: var(--theme-spacing-lg);
  max-height: calc(80vh - 60px);
  overflow-y: auto;
  flex: 1;
}

.empty-history {
  text-align: center;
  padding: var(--theme-spacing-xl);
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-md);
}

.history-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-md);
  cursor: context-menu;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--theme-spacing-sm);
  padding-bottom: var(--theme-spacing-sm);
  border-bottom: 1px solid rgba(235, 86, 74, 0.1);
}

.history-name {
  font-weight: bold;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.history-time {
  font-size: var(--theme-font-size-xs);
  color: var(--theme-text-secondary);
}

.history-changes {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-xs);
}

.change-row {
  display: flex;
  gap: var(--theme-spacing-sm);
  font-size: var(--theme-font-size-sm);
}

.change-label {
  color: var(--theme-text-secondary);
  flex-shrink: 0;
}

.change-value {
  color: var(--theme-text-primary);
  word-break: break-all;
}

.change-value.new-value {
  color: var(--theme-primary);
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

.delete-badge {
  background: #ef4444;
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
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
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
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-primary);
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

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
