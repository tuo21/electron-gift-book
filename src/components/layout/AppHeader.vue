<template>
  <!-- 
    ========================================
    顶部导航栏 (app-header)
    ========================================
    布局：左中右三栏布局
    - header-left: Logo + 应用名称
    - header-center: 功能按钮组
    - header-right: 农历日期显示
  -->
  <header class="app-header">
    <!-- 左侧：Logo和名称 -->
    <div class="header-left">
      <img src="/images/logo.png" alt="Logo" class="app-logo" />
      <div class="app-name-wrapper">
        <input v-if="isEditingName" v-model="localAppName" @blur="handleNameBlur" 
               @keyup.enter="handleNameEnter" class="app-name-input" type="text" />
        <h1 v-else class="app-name" @click="handleNameClick" title="点击修改">
          {{ localAppName }}
        </h1>
      </div>
    </div>

    <!-- 中间：功能按钮 -->
    <div class="header-center">
      <button class="func-btn" @click="emit('save')">
        <span class="btn-icon">💾</span><span class="btn-text">保存</span>
      </button>
      <button class="func-btn" @click="emit('export')">
        <span class="btn-icon">📤</span><span class="btn-text">导出</span>
      </button>
      <button class="func-btn" @click="emit('edit-click')">
        <span class="btn-icon">✏️</span><span class="btn-text">修改记录</span>
      </button>
      <button class="func-btn" @click="emit('open-statistics')">
        <span class="btn-icon">📊</span><span class="btn-text">统计</span>
      </button>
      <button class="func-btn" @click="emit('search')">
        <span class="btn-icon">🔍</span><span class="btn-text">搜索</span>
      </button>
      <button class="func-btn" @click="emit('back-to-splash')">
        <span class="btn-icon">🏠</span><span class="btn-text">返回首页</span>
      </button>
    </div>

    <!-- 右侧：农历日期 -->
    <div class="header-right">
      <div class="lunar-date">
        <div class="lunar-primary">{{ lunarDate.primary }}</div>
        <div class="lunar-secondary">{{ lunarDate.secondary }}</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  appName: string
  isEditingName: boolean
  lunarDate: {
    primary: string
    secondary: string
  }
}

interface Emits {
  (e: 'update:appName', name: string): void
  (e: 'update:isEditingName', editing: boolean): void
  (e: 'save'): void
  (e: 'export'): void
  (e: 'edit-click'): void
  (e: 'open-statistics'): void
  (e: 'search'): void
  (e: 'back-to-splash'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地应用名称副本，用于编辑
const localAppName = ref(props.appName)

// 监听props变化更新本地状态
watch(() => props.appName, (newName) => {
  localAppName.value = newName
})

// 处理名称点击
const handleNameClick = () => {
  emit('update:isEditingName', true)
}

// 处理名称输入框失去焦点
const handleNameBlur = () => {
  emit('update:isEditingName', false)
  emit('update:appName', localAppName.value)
}

// 处理名称输入框回车
const handleNameEnter = () => {
  emit('update:isEditingName', false)
  emit('update:appName', localAppName.value)
}
</script>

<style scoped>
/* 复用App.vue中的样式，稍后可以提取到共享样式文件 */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-md) var(--theme-spacing-xl);  /* 上下 16px, 左右 32px */
  background: var(--theme-paper);
  box-shadow: var(--theme-shadow);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--theme-spacing-md);  /* 元素间距 16px */
}

.app-logo {
  width: 40px;    /* Logo宽度 */
  height: 40px;   /* Logo高度 */
  object-fit: contain;
}

.app-name {
  color: var(--theme-text-primary);
  font-size: var(--theme-font-size-xxl);  /* 28px */
  font-weight: bold;
  font-family: var(--theme-font-family);
  cursor: pointer;
}

.app-name-input {
  font-size: var(--theme-font-size-xxl);
  padding: var(--theme-spacing-xs) var(--theme-spacing-sm);
  border: 1px solid var(--theme-accent);
  border-radius: var(--theme-border-radius);
  background: var(--theme-paper);
  color: var(--theme-text-primary);
  width: 200px;   /* 输入框宽度 */
}

.header-center {
  display: flex;
  gap: var(--theme-spacing-sm);  /* 按钮间距 8px */
}

.func-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--theme-spacing-sm) var(--theme-spacing-md);  /* 按钮内边距 */
  border: none;
  border-radius: var(--theme-border-radius);
  background: transparent;
  color: var(--theme-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.func-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);  /* 悬停上浮效果 */
}

.btn-icon { font-size: 20px; }
.btn-text { font-size: var(--theme-font-size-xs); }  /* 12px */

.header-right { text-align: right; }

.lunar-date {
  color: var(--theme-text-primary);
  font-family: var(--theme-font-family);
}

.lunar-primary {
  font-size: var(--theme-font-size-lg);  /* 20px */
  font-weight: bold;
}

.lunar-secondary {
  font-size: var(--theme-font-size-xs);  /* 12px */
  opacity: 0.8;
  margin-top: 2px;
}
</style>