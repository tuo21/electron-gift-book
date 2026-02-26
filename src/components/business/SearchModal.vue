<template>
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal-container" @click.stop>
      <div class="modal-content search-modal">
        <div class="modal-header">
          <h3 class="modal-title">搜索记录</h3>
          <button class="modal-close" @click="emit('close')">×</button>
        </div>
        <div class="modal-body">
          <div class="search-input-area">
            <input
              v-model="localKeyword"
              type="text"
              class="search-input"
              placeholder="请输入姓名、备注或物品进行搜索..."
              @keyup.enter="handleSearch"
            />
            <button class="search-btn" @click="handleSearch" :disabled="isSearching">
              {{ isSearching ? '搜索中...' : '搜索' }}
            </button>
          </div>

          <div class="search-results">
            <div v-if="searchResults.length === 0 && localKeyword && !isSearching" class="empty-results">
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
              输入关键词后点击搜索，支持模糊匹配姓名、备注和物品
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Record } from '../../types/database'

interface Props {
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

watch(() => props.searchKeyword, (newKeyword) => {
  localKeyword.value = newKeyword
})

const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const handleSearch = () => {
  if (localKeyword.value.trim()) {
    emit('search', localKeyword.value.trim())
  }
}
</script>

<style scoped>
.search-modal {
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

.search-input-area {
  display: flex;
  gap: var(--theme-spacing-sm);
  margin-bottom: var(--theme-spacing-lg);
}

.search-input {
  flex: 1;
  padding: var(--theme-spacing-sm) var(--theme-spacing-md);
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  font-size: var(--theme-font-size-md);
  font-family: var(--theme-font-family);
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
}

.search-btn {
  padding: var(--theme-spacing-sm) var(--theme-spacing-lg);
  border: none;
  border-radius: var(--theme-border-radius);
  background: var(--theme-primary);
  color: var(--theme-text-light);
  font-size: var(--theme-font-size-md);
  font-family: var(--theme-font-family);
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  background: var(--theme-primary-dark);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-results {
  min-height: 200px;
}

.empty-results,
.search-hint {
  text-align: center;
  padding: var(--theme-spacing-xl);
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-md);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-sm);
}

.result-item {
  background: rgba(235, 86, 74, 0.05);
  border: 1px solid rgba(235, 86, 74, 0.2);
  border-radius: var(--theme-border-radius);
  padding: var(--theme-spacing-md);
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  background: rgba(235, 86, 74, 0.1);
  border-color: var(--theme-accent);
  transform: translateX(4px);
}

.result-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--theme-spacing-xs);
}

.result-name {
  font-weight: bold;
  font-size: var(--theme-font-size-md);
  color: var(--theme-text-primary);
}

.result-amount {
  font-size: var(--theme-font-size-md);
  color: var(--theme-primary);
  font-weight: bold;
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
</style>