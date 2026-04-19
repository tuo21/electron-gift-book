<template>
  <Teleport to="body">
    <div v-if="visible" class="search-overlay" @click.self="handleClose">
      <div class="search-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">搜索记录</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
          <div class="search-input-area">
            <input
              v-model="localKeyword"
              type="text"
              class="search-input"
              placeholder="请输入姓名、备注或物品进行搜索..."
              @keyup.enter="handleSearch"
            />
          </div>

          <div class="search-results">
            <div v-if="isSearching" class="searching-hint">
              搜索中...
            </div>
            <div v-else-if="searchResults.length === 0 && localKeyword.trim()" class="empty-results">
              未找到匹配的记录
            </div>
            <div v-else-if="searchResults.length > 0" class="results-list">
              <div
                v-for="record in searchResults"
                :key="record.id"
                class="result-item"
                @click="emit('result-click', record)"
              >
                <div class="result-main">
                  <span class="result-name">{{ record.guestName }}</span>
                  <span class="result-amount">{{ formatMoney(record.amount) }}</span>
                </div>
                <div class="result-sub">
                  <span v-if="record.itemDescription" class="result-item-desc">物品：{{ record.itemDescription }}</span>
                  <span v-if="record.remark" class="result-remark">备注：{{ record.remark }}</span>
                </div>
              </div>
            </div>
            <div v-else class="search-hint">
              输入关键词自动搜索，支持模糊匹配姓名、备注和物品
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import IconSvg from '../IconSvg.vue'
import type { Record } from '../../types/database'

interface Props {
  visible: boolean
  searchKeyword: string
  searchResults: Record[]
  isSearching: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'search', keyword: string): void
  (e: 'result-click', record: Record): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localKeyword = ref(props.searchKeyword)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.searchKeyword, (newKeyword) => {
  localKeyword.value = newKeyword
})

watch(localKeyword, (newKeyword) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    if (newKeyword.trim()) {
      emit('search', newKeyword.trim())
    }
  }, 300)
})

const formatMoney = (amount: number | undefined) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00'
  }
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const handleSearch = () => {
  if (localKeyword.value.trim()) {
    emit('search', localKeyword.value.trim())
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
/* 遮罩层 */
.search-overlay {
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
.search-dialog {
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

.search-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  font-size: var(--theme-font-size-md);
  font-family: var(--theme-font-family);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.1);
}

.search-results {
  min-height: 200px;
}

.empty-results,
.search-hint,
.searching-hint {
  text-align: center;
  padding: 40px 24px;
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: var(--theme-border-radius);
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.result-item:hover {
  background: rgba(235, 86, 74, 0.1);
  border-color: var(--theme-accent);
  transform: translateX(4px);
  box-shadow: var(--theme-shadow-sm);
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-name {
  font-weight: 600;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.result-amount {
  font-size: var(--theme-font-size-md);
  color: var(--theme-primary);
  font-weight: 600;
}

.result-sub {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item-desc,
.result-remark {
  font-size: var(--theme-font-size-sm);
  color: var(--theme-text-secondary);
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
