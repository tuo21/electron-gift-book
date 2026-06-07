<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import '../../types/database';


// ==================== Props & Emits ====================
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

// ==================== 响应式状态 ====================
const currentDataPath = ref<string>('');
const defaultDataPath = ref('');
const configFilePath = ref('');
const isLoading = ref(false);
const isChangingPath = ref(false);

// ==================== 计算属性 ====================
const isUsingDefaultPath = computed(() => {
  return !currentDataPath.value || currentDataPath.value === 'default';
});

const displayPath = computed(() => {
  if (isUsingDefaultPath.value) {
    return defaultDataPath.value || '默认路径';
  }
  return currentDataPath.value;
});

const pathLabel = computed(() => {
  return isUsingDefaultPath.value ? '默认位置' : '自定义路径';
});

// ==================== 方法函数 ====================

// 关闭弹窗
const close = () => {
  emit('update:show', false);
};

// 加载当前数据路径
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
      if (response.data === 'default') {
        currentDataPath.value = '';
      } else {
        currentDataPath.value = response.data || '';
      }
    }
    
    // 配置文件目录 = app_data_dir（defaultDataPath 始终返回真正的默认目录）
    configFilePath.value = defaultDataPath.value;
    console.log('配置文件目录:', configFilePath.value);
  } catch (error) {
    console.error('加载数据路径失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 打开资源管理器
const handleOpenInExplorer = async () => {
  let pathToOpen = '';
  
  // 直接获取当前使用的数据路径
  const response = await window.electronAPI.getDataPath();
  if (response.success) {
    if (response.data === 'default' || !response.data) {
      // 使用默认路径
      const defaultResponse = await window.electronAPI.getDefaultDataPath();
      if (defaultResponse.success && defaultResponse.data) {
        pathToOpen = defaultResponse.data;
      }
    } else {
      pathToOpen = response.data;
    }
  }
  
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

// 打开配置文件所在的资源管理器
const handleOpenConfigFile = async () => {
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
          alert('数据路径已更改并迁移数据成功！');
        } else {
          alert('迁移数据失败: ' + (migrateResponse.error || '未知错误'));
        }
      } else {
        const setResponse = await window.electronAPI.setCustomDataPath(newPath, false);
        if (setResponse.success) {
          currentDataPath.value = newPath;
          alert('数据路径已更改成功！');
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

// ==================== 生命周期 ====================
onMounted(() => {
  if (props.show) {
    loadDataPath();
  }
});

// 监听show属性变化，当模态框显示时加载数据
watch(() => props.show, (newValue) => {
  if (newValue) {
    loadDataPath();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">设置</h3>
            <button class="close-btn" @click="close">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <!-- 数据存储 -->
            <div class="setting-section">
              <div class="section-title">数据存储</div>
              <div class="setting-card">
                <div class="setting-item path-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ pathLabel }}</div>
                    <div 
                      class="setting-value path-value clickable" 
                      :title="displayPath"
                      @click="handleOpenInExplorer"
                    >
                      {{ isLoading ? '加载中...' : displayPath }}
                    </div>
                  </div>
                  <button 
                    class="setting-btn" 
                    @click="handleChangePath"
                    :disabled="isChangingPath"
                  >
                    {{ isChangingPath ? '处理中...' : '更改位置' }}
                  </button>
                </div>
                <div class="setting-item path-item">
                  <div class="setting-info">
                    <div class="setting-label">配置文件路径</div>
                    <div 
                      class="setting-value path-value clickable" 
                      :title="configFilePath"
                      @click="() => handleOpenConfigFile()"
                    >
                      {{ isLoading ? '加载中...' : configFilePath || '未找到' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 同步设置 -->
            <div class="setting-section">
              <div class="section-title">同步设置（即将推出）</div>
              <div class="setting-card disabled">
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">同步到小程序</div>
                    <div class="setting-desc">开启后可将数据同步到微信小程序</div>
                  </div>
                  <button class="setting-btn" disabled>功能开发中</button>
                </div>
              </div>
            </div>

            <!-- 账号管理 -->
            <div class="setting-section">
              <div class="section-title">账号管理（即将推出）</div>
              <div class="setting-card disabled">
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">登录账号</div>
                    <div class="setting-desc">登录后可使用云同步功能</div>
                  </div>
                  <button class="setting-btn" disabled>功能开发中</button>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩层 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  padding: 20px;
}

/* 弹窗容器 */
.modal-container {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

/* 内容区 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* 设置区块 */
.setting-section {
  margin-bottom: 24px;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-left: 4px;
}

/* 设置卡片 */
.setting-card {
  background: #f8f8f8;
  border-radius: 12px;
  overflow: hidden;
}

.setting-card.disabled {
  opacity: 0.6;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  gap: 16px;
}

.setting-item + .setting-item {
  border-top: 1px solid #f0f0f0;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.setting-value {
  font-size: 13px;
  color: #666;
  word-break: break-all;
}

.setting-desc {
  font-size: 12px;
  color: #999;
}

/* 路径项样式 */
.path-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.path-value {
  word-break: break-all;
  line-height: 1.4;
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

/* 样式选项 */
.style-options {
  display: flex;
  gap: 16px;
}

.style-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.style-option input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #c75b39;
  cursor: pointer;
}

/* 滚动条 */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
