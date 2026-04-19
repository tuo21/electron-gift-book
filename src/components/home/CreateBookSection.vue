<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ThemeType } from '../../types/theme';
import { THEME_CONFIG, getDefaultTheme } from '../../types/theme';

// ==================== Props & Emits ====================
const props = defineProps<{
  defaultTheme?: ThemeType;
  editingBook?: {
    path: string;
    name: string;
    eventDate: string;
    theme: ThemeType;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'create', data: { eventName: string; eventDate: string; theme: ThemeType }): void;
  (e: 'save-edit', data: { path: string; name: string; eventDate: string; theme: ThemeType }): void;
  (e: 'cancel-edit'): void;
}>();

// ==================== 响应式状态 ====================
const eventName = ref('');
const eventDate = ref(new Date().toISOString().split('T')[0]);
const selectedTheme = ref<ThemeType>(props.defaultTheme || getDefaultTheme().id);
const isCreating = ref(false);

// ==================== 常量 ====================
const themes = THEME_CONFIG;

// ==================== 监听编辑状态 ====================
watch(() => props.editingBook, (book) => {
  if (book) {
    eventName.value = book.name;
    eventDate.value = book.eventDate;
    selectedTheme.value = book.theme;
  } else {
    // 取消编辑时重置
    eventName.value = '';
    eventDate.value = new Date().toISOString().split('T')[0];
    selectedTheme.value = props.defaultTheme || getDefaultTheme().id;
    isCreating.value = false;
  }
}, { immediate: true });

// ==================== 计算属性 ====================
const isEditing = computed(() => !!props.editingBook);

const isValid = computed(() => {
  return eventName.value.trim().length > 0;
});

// ==================== 方法函数 ====================

// 选择主题
const selectTheme = (theme: ThemeType) => {
  selectedTheme.value = theme;
};

// 处理创建
const handleCreate = async () => {
  if (isEditing.value || !isValid.value || isCreating.value) return;

  isCreating.value = true;
  
  emit('create', {
    eventName: eventName.value.trim(),
    eventDate: eventDate.value,
    theme: selectedTheme.value
  });

  // 重置表单
  eventName.value = '';
  eventDate.value = new Date().toISOString().split('T')[0];
  selectedTheme.value = props.defaultTheme || getDefaultTheme().id;
  isCreating.value = false;
};

// 处理保存编辑
const handleSaveEdit = async () => {
  if (!isEditing.value || !props.editingBook || !isValid.value || isCreating.value) return;

  isCreating.value = true;
  
  emit('save-edit', {
    path: props.editingBook.path,
    name: eventName.value.trim(),
    eventDate: eventDate.value,
    theme: selectedTheme.value
  });
};

// 取消编辑
const handleCancelEdit = () => {
  emit('cancel-edit');
};
</script>

<template>
  <div class="create-section">
    <div class="section-header">
      <h2 class="section-title">{{ isEditing ? '编辑礼薄' : '创建礼薄' }}</h2>
      <p class="section-desc">{{ isEditing ? '修改礼薄信息并保存' : '新建一个礼金簿来记录人情往来' }}</p>
    </div>

    <div class="form-card">
      <!-- 事务名称 -->
      <div class="form-item">
        <label class="form-label">事务名称</label>
        <input
          v-model="eventName"
          type="text"
          class="form-input"
          placeholder="请输入事务名称，如：张三婚礼"
          @keyup.enter="handleCreate"
        />
      </div>

      <!-- 事务日期 -->
      <div class="form-item">
        <label class="form-label">事务日期</label>
        <div class="date-input-wrapper">
          <input
            v-model="eventDate"
            type="date"
            class="form-input form-input-date"
            @click="($event.target as HTMLInputElement).showPicker?.()"
          />
        </div>
      </div>

      <!-- 主题选择 -->
      <div class="form-item">
        <label class="form-label">主题选择</label>
        <div class="theme-selector">
          <button
            v-for="theme in themes"
            :key="theme.id"
            type="button"
            class="theme-option"
            :class="[
              `theme-${theme.id}`,
              { active: selectedTheme === theme.id }
            ]"
            @click="selectTheme(theme.id)"
            :title="theme.description"
          >
            <span class="theme-name">{{ theme.displayName }}</span>
          </button>
        </div>
      </div>

      <!-- 创建按钮 -->
      <button
        type="button"
        class="create-btn"
        :disabled="!isValid || isCreating"
        @click="isEditing ? handleSaveEdit() : handleCreate()"
        v-if="!isEditing"
      >
        <span v-if="isCreating" class="loading-spinner"></span>
        <span v-else>创建礼薄</span>
      </button>

      <!-- 编辑按钮组 -->
      <div class="edit-buttons" v-if="isEditing">
        <button
          type="button"
          class="cancel-btn"
          @click="handleCancelEdit"
        >
          取消
        </button>
        <button
          type="button"
          class="save-btn"
          :disabled="!isValid || isCreating"
          @click="handleSaveEdit"
        >
          <span v-if="isCreating" class="loading-spinner"></span>
          <span v-else>保存修改</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-section {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.form-input {
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  color: #333;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: #c75b39;
  background: white;
  box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.1);
}

.form-input::placeholder {
  color: #bbb;
}

.form-input-date {
  cursor: pointer;
}

/* 日期输入框包装器 */
.date-input-wrapper {
  position: relative;
  width: 100%;
}

.date-input-wrapper input {
  width: 100%;
  cursor: pointer;
}

.date-input-wrapper input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 1;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

/* 主题选择器 */
.theme-selector {
  display: flex;
  gap: 8px;
}

.theme-option {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #666;
}

.theme-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-name {
  font-size: 13px;
  font-weight: 500;
}

/* 喜庆红主题 */
.theme-red {
  background: linear-gradient(135deg, #ff6b6b 0%, #c75b39 100%);
  border-color: #c75b39;
  color: white;
}

.theme-red .theme-name {
  color: white;
}

.theme-red:hover {
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.3);
}

.theme-red.active {
  box-shadow: 0 0 0 2px rgba(199, 91, 57, 0.3), 0 4px 12px rgba(199, 91, 57, 0.3);
}

/* 肃穆灰主题 */
.theme-gray {
  background: linear-gradient(135deg, #f5f5f5 0%, #d0d0d0 100%);
  border-color: #b0b0b0;
}

.theme-gray .theme-name {
  color: #4a4a4a;
}

.theme-gray:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.theme-gray.active {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 寿宴金主题 */
.theme-golden {
  background: linear-gradient(135deg, #D4A017 0%, #B8860B 100%);
  border-color: #B8860B;
  color: white;
}

.theme-golden .theme-name {
  color: white;
}

.theme-golden:hover {
  box-shadow: 0 4px 12px rgba(184, 134, 11, 0.3);
}

.theme-golden.active {
  box-shadow: 0 0 0 2px rgba(184, 134, 11, 0.3), 0 4px 12px rgba(184, 134, 11, 0.3);
}

/* 创建按钮 */
.create-btn {
  height: 44px;
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #c75b39 0%, #a04530 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.3);
}

.create-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 编辑按钮组 */
.edit-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.cancel-btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #ebebeb;
  border-color: #ccc;
}

.save-btn {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #c75b39 0%, #a04530 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.3);
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
