<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// ==================== 类型定义 ====================
type ThemeType = 'wedding' | 'funeral';

interface SplashScreenProps {
  defaultEventName?: string;
  defaultTheme?: ThemeType;
}

interface SplashScreenEmits {
  (e: 'start', data: { eventName: string; theme: ThemeType; action: 'new' | 'open'; filePath?: string }): void;
}

// ==================== Props & Emits ====================
const props = withDefaults(defineProps<SplashScreenProps>(), {
  defaultEventName: '电子礼金簿',
  defaultTheme: 'wedding'
});

const emit = defineEmits<SplashScreenEmits>();

// ==================== 响应式数据 ====================
const eventName = ref(props.defaultEventName);
const selectedTheme = ref<ThemeType>(props.defaultTheme);
const isAnimating = ref(false);
const showContent = ref(false);

// ==================== 计算属性 ====================
const isWeddingTheme = computed(() => selectedTheme.value === 'wedding');
const isFuneralTheme = computed(() => selectedTheme.value === 'funeral');

// 主题样式配置
const themeStyles = computed(() => {
  if (isWeddingTheme.value) {
    return {
      background: 'linear-gradient(135deg, #EB564A 0%, #D6453D 100%)',
      cardBg: '#FFFFFF',
      primaryColor: '#EB564A',
      accentColor: '#E6BA37',
      textColor: '#333333',
      subtitleColor: '#666666'
    };
  } else {
    return {
      background: 'linear-gradient(135deg, #4A4A4A 0%, #333333 100%)',
      cardBg: '#F5F5F5',
      primaryColor: '#4A4A4A',
      accentColor: '#888888',
      textColor: '#333333',
      subtitleColor: '#666666'
    };
  }
});

// ==================== 方法函数 ====================

// 选择主题
const selectTheme = (theme: ThemeType) => {
  selectedTheme.value = theme;
};

// 新建礼金簿
const handleCreateNew = async () => {
  if (isAnimating.value) return;
  
  isAnimating.value = true;
  
  // 触发开始事件
  emit('start', {
    eventName: eventName.value.trim() || '电子礼金簿',
    theme: selectedTheme.value,
    action: 'new'
  });
};

// 选择原有数据
const handleOpenExisting = async () => {
  if (isAnimating.value) return;
  
  try {
    const response = await window.electronAPI.openDatabaseFile();
    if (response.success && response.filePath) {
      isAnimating.value = true;
      emit('start', {
        eventName: eventName.value.trim() || '电子礼金簿',
        theme: selectedTheme.value,
        action: 'open',
        filePath: response.filePath
      });
    }
  } catch (error) {
    console.error('打开文件失败:', error);
    alert('打开文件失败，请重试');
  }
};

// ==================== 生命周期 ====================
onMounted(() => {
  // 延迟显示内容，实现淡入动画
  setTimeout(() => {
    showContent.value = true;
  }, 100);
});
</script>

<template>
  <div 
    class="splash-screen"
    :style="{ background: themeStyles.background }"
  >
    <div 
      class="splash-content"
      :class="{ 'show': showContent, 'hide': isAnimating }"
    >
      <!-- Logo 和标题区域 -->
      <div class="header-section">
        <div class="logo-container">
          <img src="/images/logo.png" alt="Logo" class="app-logo" />
        </div>
        <h1 class="app-title">电子礼金簿</h1>
        <p class="app-subtitle">记录人情往来，传承中华礼仪</p>
      </div>

      <!-- 事务名称输入 -->
      <div class="input-section">
        <label class="input-label">事务名称</label>
        <input
          v-model="eventName"
          type="text"
          class="event-name-input"
          placeholder="请输入事务名称"
          :style="{ 
            borderColor: themeStyles.primaryColor,
            '--focus-color': themeStyles.primaryColor 
          }"
        />
      </div>

      <!-- 主题选择 -->
      <div class="theme-section">
        <label class="input-label">选择主题</label>
        <div class="theme-options">
          <!-- 红事主题 -->
          <div
            class="theme-card"
            :class="{ 'selected': isWeddingTheme }"
            :style="{ 
              borderColor: isWeddingTheme ? '#EB564A' : 'transparent',
              backgroundColor: '#FFF5F5'
            }"
            @click="selectTheme('wedding')"
          >
            <div class="theme-icon wedding-icon">🎊</div>
            <div class="theme-name">红事</div>
            <div class="theme-desc">喜庆婚礼、满月酒等</div>
            <div v-if="isWeddingTheme" class="selected-indicator" style="background: #EB564A;">
              <span>✓</span>
            </div>
          </div>

          <!-- 白事主题 -->
          <div
            class="theme-card"
            :class="{ 'selected': isFuneralTheme }"
            :style="{ 
              borderColor: isFuneralTheme ? '#4A4A4A' : 'transparent',
              backgroundColor: '#F8F8F8'
            }"
            @click="selectTheme('funeral')"
          >
            <div class="theme-icon funeral-icon">🕯️</div>
            <div class="theme-name">白事</div>
            <div class="theme-desc">肃穆庄重</div>
            <div v-if="isFuneralTheme" class="selected-indicator" style="background: #4A4A4A;">
              <span>✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button
          class="action-btn primary-btn"
          :style="{ 
            backgroundColor: themeStyles.primaryColor,
            '--hover-color': isWeddingTheme ? '#D6453D' : '#333333'
          }"
          @click="handleCreateNew"
          :disabled="isAnimating"
        >
          <span class="btn-icon">📖</span>
          <span class="btn-text">新建礼金簿</span>
        </button>

        <button
          class="action-btn secondary-btn"
          :style="{ 
            borderColor: themeStyles.primaryColor,
            color: themeStyles.primaryColor,
            '--hover-bg': isWeddingTheme ? '#FFF5F5' : '#F0F0F0'
          }"
          @click="handleOpenExisting"
          :disabled="isAnimating"
        >
          <span class="btn-icon">📂</span>
          <span class="btn-text">选择原有数据</span>
        </button>
      </div>

      <!-- 底部提示 -->
      <div class="footer-section">
        <p class="footer-text">数据自动保存，安全可靠</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 整体布局 ==================== */
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s ease;
}

.splash-content {
  width: 100%;
  max-width: 480px;
  padding: 48px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-content.show {
  opacity: 1;
  transform: translateY(0);
}

.splash-content.hide {
  opacity: 0;
  transform: scale(0.95);
}

/* ==================== 头部区域 ==================== */
.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-container {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-logo {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.app-title {
  font-size: 28px;
  font-weight: bold;
  color: #333333;
  margin: 0 0 8px 0;
  font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
}

.app-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* ==================== 输入区域 ==================== */
.input-section {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  margin-bottom: 8px;
}

.event-name-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  color: #333333;
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
}

.event-name-input:focus {
  border-color: var(--focus-color);
  box-shadow: 0 0 0 3px rgba(235, 86, 74, 0.1);
}

.event-name-input::placeholder {
  color: #999999;
}

/* ==================== 主题选择区域 ==================== */
.theme-section {
  margin-bottom: 32px;
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.theme-card {
  position: relative;
  padding: 20px 16px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.theme-card.selected {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.theme-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.wedding-icon {
  filter: drop-shadow(0 2px 4px rgba(235, 86, 74, 0.3));
}

.funeral-icon {
  filter: drop-shadow(0 2px 4px rgba(74, 74, 74, 0.3));
}

.theme-name {
  font-size: 16px;
  font-weight: bold;
  color: #333333;
  margin-bottom: 4px;
}

.theme-desc {
  font-size: 12px;
  color: #666666;
}

.selected-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* ==================== 操作按钮区域 ==================== */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-family: inherit;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--hover-color) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.secondary-btn {
  background: transparent;
  border: 2px solid;
}

.secondary-btn:hover:not(:disabled) {
  background-color: var(--hover-bg);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  font-size: 16px;
}

/* ==================== 底部区域 ==================== */
.footer-section {
  text-align: center;
}

.footer-text {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 520px) {
  .splash-content {
    margin: 20px;
    padding: 32px 24px;
  }

  .theme-options {
    grid-template-columns: 1fr;
  }

  .app-title {
    font-size: 24px;
  }
}
</style>
