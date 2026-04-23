<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ThemeType } from '../../types/theme';
import { THEME_CONFIG, getDefaultTheme } from '../../types/theme';
import { useActivation } from '../../composables/useActivation';

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
  (e: 'show-activate'): void;
}>();

const { checkActivation } = useActivation();

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

  // 激活检查
  const isActivated = await checkActivation();
  if (!isActivated) {
    emit('show-activate');
    return;
  }

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
      <div class="form-item theme-select-item">
        <label class="form-label">主题选择</label>
        <div class="theme-cards">
          <div
            v-for="theme in themes"
            :key="theme.id"
            class="theme-card"
            :class="[
              `theme-card-${theme.id}`,
              { active: selectedTheme === theme.id }
            ]"
            @click="selectTheme(theme.id)"
            :title="theme.description"
          >
            <div class="card-content">
              <div class="radio-row">
                <div class="radio-circle">
                  <div v-if="selectedTheme === theme.id" class="radio-dot"></div>
                </div>
                <span class="theme-title">{{ theme.displayName }}</span>
              </div>
              <p class="theme-short-desc">{{ theme.shortDesc }}</p>
            </div>
            <div class="card-decoration" :class="`decoration-${theme.id}`"></div>
          </div>
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

/* 主题选择卡片 */
.theme-select-item {
  grid-column: 1 / -1;
}

.theme-cards {
  display: flex;
  gap: 12px;
}

.theme-card {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  min-height: 80px;
}

.theme-card:hover {
  border-color: #d0d0d0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 2;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.radio-circle {
  width: 18px;
  height: 18px;
  border: 2px solid #d0d0d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.theme-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.theme-short-desc {
  font-size: 12px;
  color: #999;
  margin: 0;
  padding-left: 28px;
}

/* 装饰图案区域 - 固定在右侧 */
.card-decoration {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 80%;
  background-repeat: no-repeat;
  background-position: right center;
  background-size: cover;
  pointer-events: none;
  z-index: 0;
}

/* 喜庆红主题卡片 */
.theme-card-red {
  background: linear-gradient(90deg, #ffffff 0%, #ffffff 50%, #FFF5F5 100%);
}

.theme-card-red:hover {
  border-color: rgba(196, 30, 58, 0.4);
}

.theme-card-red.active {
  border-color: #C41E3A;
  background: linear-gradient(90deg, rgba(196, 30, 58, 0.05) 0%, rgba(196, 30, 58, 0.02) 50%, #FFF0F0 100%);
}

.theme-card-red.active .radio-circle {
  border-color: #C41E3A;
  color: #C41E3A;
}

.theme-card-red.active .theme-title {
  color: #C41E3A;
}

.theme-card-red .card-decoration {
  background-image: var(--theme-card-bg-red, url('/Img/主题卡片-喜庆红.png'));
}

/* 肃穆灰主题卡片 */
.theme-card-gray {
  background: linear-gradient(90deg, #ffffff 0%, #ffffff 50%, #F8F8F8 100%);
}

.theme-card-gray:hover {
  border-color: rgba(74, 74, 74, 0.4);
}

.theme-card-gray.active {
  border-color: #4A4A4A;
  background: linear-gradient(90deg, rgba(74, 74, 74, 0.05) 0%, rgba(74, 74, 74, 0.02) 50%, #F5F5F5 100%);
}

.theme-card-gray.active .radio-circle {
  border-color: #4A4A4A;
  color: #4A4A4A;
}

.theme-card-gray.active .theme-title {
  color: #4A4A4A;
}

.theme-card-gray .card-decoration {
  background-image: var(--theme-card-bg-gray, url('/Img/主题卡片-肃穆灰.png'));
}

.theme-card-gray.active .theme-title {
  color: #4A4A4A;
}

/* 寿宴金主题卡片 */
.theme-card-golden {
  background: linear-gradient(90deg, #ffffff 0%, #ffffff 50%, #FDF8F0 100%);
}

.theme-card-golden:hover {
  border-color: rgba(184, 134, 11, 0.4);
}

.theme-card-golden.active {
  border-color: #B8860B;
  background: linear-gradient(90deg, rgba(184, 134, 11, 0.05) 0%, rgba(184, 134, 11, 0.02) 50%, #FDF5E6 100%);
}

.theme-card-golden.active .radio-circle {
  border-color: #B8860B;
  color: #B8860B;
}

.theme-card-golden.active .theme-title {
  color: #B8860B;
}

.theme-card-golden .card-decoration {
  background-image: var(--theme-card-bg-golden, url('/Img/主题卡片-寿宴金.png'));
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
