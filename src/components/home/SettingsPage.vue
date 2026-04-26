<script setup lang="ts">
import { ref, onMounted } from 'vue';
import IconSvg from '../IconSvg.vue';

interface SettingsState {
  minimizeToTray: boolean;
  startupWithSystem: boolean;
}

const emit = defineEmits<{
  (e: 'show-activate'): void;
}>();

// ==================== 响应式状态 ====================
const settings = ref<SettingsState>({
  minimizeToTray: false,
  startupWithSystem: false,
});

// 数据路径相关
const currentDataPath = ref<string>('');
const defaultDataPath = ref('');
const configFilePath = ref('');
const isLoading = ref(false);
const isChangingPath = ref(false);

const saveMessage = ref('');

// ==================== 生命周期 ====================
onMounted(async () => {
  // 加载数据路径
  await loadDataPath();
  // 加载其他设置
  await loadSettings();
});

// ==================== 方法函数 ====================

// 加载数据路径
const loadDataPath = async () => {
  isLoading.value = true;
  try {
    // 获取默认路径
    const defaultPathResponse = await window.electronAPI.getDefaultDataPath();
    if (defaultPathResponse.success) {
      defaultDataPath.value = defaultPathResponse.data || '';
    }
    
    // 获取当前使用的数据路径
    const response = await window.electronAPI.getDataPath();
    if (response.success) {
      if (response.data === 'default' || !response.data) {
        currentDataPath.value = '';
      } else {
        currentDataPath.value = response.data || '';
      }
    }
    
    // 获取配置文件路径
    const configResponse = await window.electronAPI.getConfigFilePath();
    if (configResponse.success && configResponse.data) {
      configFilePath.value = configResponse.data;
    } else {
      // 如果获取失败，使用默认路径
      configFilePath.value = 'C:\\Users\\' + (await window.electronAPI.getDefaultDataPath()).data?.split('\\')[2] + '\\AppData\\Roaming\\com.giftbook.app' || '';
    }
  } catch (error) {
    console.error('加载数据路径失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 加载其他设置
const loadSettings = async () => {
  try {
    const savedSettings = localStorage.getItem('giftbook_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      settings.value = { ...settings.value, ...parsed };
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

// 保存设置
const saveSettings = async () => {
  try {
    localStorage.setItem('giftbook_settings', JSON.stringify(settings.value));
    saveMessage.value = '设置已保存';
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('保存设置失败:', error);
    saveMessage.value = '保存失败';
  }
};

// 打开资源管理器 - 数据路径
const handleOpenDataPath = async () => {
  const pathToOpen = currentDataPath.value || defaultDataPath.value;
  
  if (!pathToOpen) {
    alert('路径无效');
    return;
  }
  
  try {
    const openResponse = await window.electronAPI.openPathInExplorer(pathToOpen);
    if (!openResponse.success) {
      alert('打开资源管理器失败: ' + (openResponse.error || '未知错误'));
    }
  } catch (error) {
    console.error('打开资源管理器失败:', error);
    alert('打开资源管理器失败');
  }
};

// 打开资源管理器 - 配置文件路径
const handleOpenConfigPath = async () => {
  if (!configFilePath.value) {
    alert('配置文件路径无效');
    return;
  }
  
  try {
    const openResponse = await window.electronAPI.openPathInExplorer(configFilePath.value);
    if (!openResponse.success) {
      alert('打开资源管理器失败: ' + (openResponse.error || '未知错误'));
    }
  } catch (error) {
    console.error('打开资源管理器失败:', error);
    alert('打开资源管理器失败');
  }
};

// 更改数据路径
const handleChangePath = async () => {
  isChangingPath.value = true;
  try {
    const response = await window.electronAPI.selectDataFolder();
    if (response.success && response.data) {
      const newPath = response.data;
      // 询问是否迁移数据
      if (await window.confirmDialog('是否将现有数据迁移到新位置？')) {
        const migrateResponse = await window.electronAPI.setCustomDataPath(newPath, true);
        if (migrateResponse.success) {
          currentDataPath.value = newPath;
          saveMessage.value = '数据路径已更改并迁移数据成功！';
          setTimeout(() => saveMessage.value = '', 3000);
        } else {
          alert('迁移数据失败: ' + (migrateResponse.error || '未知错误'));
        }
      } else {
        const setResponse = await window.electronAPI.setCustomDataPath(newPath, false);
        if (setResponse.success) {
          currentDataPath.value = newPath;
          saveMessage.value = '数据路径已更改成功！';
          setTimeout(() => saveMessage.value = '', 3000);
        } else {
          alert('设置路径失败: ' + (setResponse.error || '未知错误'));
        }
      }
    }
  } catch (error) {
    console.error('更改数据路径失败:', error);
    alert('更改数据路径失败，请重试');
  } finally {
    isChangingPath.value = false;
  }
};
</script>

<template>
  <div class="settings-page">
    <!-- 数据存储设置 -->
    <div class="settings-card">
      <div class="card-header">
        <IconSvg name="folder" :size="24" />
        <h2 class="card-title">数据存储</h2>
      </div>
      
      <div class="settings-list">
        <!-- 数据存储路径 -->
        <div class="setting-item path-setting-item">
          <div class="setting-info">
            <span class="setting-label">数据存储目录</span>
            <span 
              class="path-value clickable" 
              :title="currentDataPath || defaultDataPath"
              @click="handleOpenDataPath"
            >
              {{ isLoading ? '加载中...' : (currentDataPath || defaultDataPath || '默认路径') }}
            </span>
          </div>
          <button 
            class="setting-btn" 
            @click="handleChangePath"
            :disabled="isChangingPath"
          >
            {{ isChangingPath ? '处理中...' : '更改位置' }}
          </button>
        </div>

        <!-- 配置文件路径 -->
        <div class="setting-item path-setting-item">
          <div class="setting-info">
            <span class="setting-label">配置文件目录</span>
            <span 
              class="path-value clickable config-path" 
              :title="configFilePath"
              @click="handleOpenConfigPath"
            >
              {{ isLoading ? '加载中...' : configFilePath || '未找到' }}
            </span>
            <span class="setting-desc">软件配置文件的存储位置，不可更改</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统设置 -->
    <div class="settings-card">
      <div class="card-header">
        <IconSvg name="settings" :size="24" />
        <h2 class="card-title">系统设置</h2>
      </div>
      
      <div class="settings-list">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">最小化到托盘</span>
            <span class="setting-desc">关闭窗口时最小化到系统托盘</span>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.minimizeToTray" @change="saveSettings">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">开机自启动</span>
            <span class="setting-desc">系统启动时自动运行应用</span>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.startupWithSystem" @change="saveSettings">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 激活设置 -->
    <div class="settings-card">
      <div class="card-header">
        <IconSvg name="key" :size="24" />
        <h2 class="card-title">软件激活</h2>
      </div>
      
      <div class="activation-content">
        <p class="activation-desc">激活软件以解锁全部功能，包括导出、搜索、修改记录等高级功能。</p>
        <button class="activate-btn" @click="emit('show-activate')">
          <IconSvg name="key" :size="18" />
          打开激活窗口
        </button>
      </div>
    </div>

    <!-- 保存提示 -->
    <Transition name="fade">
      <div v-if="saveMessage" class="save-toast">
        <IconSvg name="check" :size="16" />
        <span>{{ saveMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.settings-page::-webkit-scrollbar {
  width: 6px;
}

.settings-page::-webkit-scrollbar-track {
  background: transparent;
}

.settings-page::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.settings-page::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 卡片样式 */
.settings-card {
  background: var(--card-bg, #FFFFFF);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* 设置列表 */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.path-setting-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.setting-desc {
  font-size: 12px;
  color: #999;
}

/* 路径显示 */
.path-value {
  font-size: 13px;
  color: #666;
  word-break: break-all;
  line-height: 1.5;
}

.path-value.clickable {
  color: #c75b39;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}

.path-value.clickable:hover {
  color: #a04530;
}

/* 设置按钮 */
.setting-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #c75b39;
  background: rgba(199, 91, 57, 0.1);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.setting-btn:hover:not(:disabled) {
  background: rgba(199, 91, 57, 0.2);
}

.setting-btn:disabled {
  color: #999;
  background: #e8e8e8;
  cursor: not-allowed;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #C75B39;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* 激活区域 */
.activation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.activation-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.6;
}

.activate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
}

.activate-btn {
  background: linear-gradient(135deg, #C75B39 0%, #A04530 100%);
  color: white;
}

.activate-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.3);
}

/* 保存提示 */
.save-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #52c41a;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  z-index: 1000;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
