<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import licenseAPI from '../../api/license';

// ==================== Props & Emits ====================
defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

// ==================== 响应式状态 ====================
const activationCode = ref('');
const machineId = ref('');
const isActivating = ref(false);
const activationStatus = ref<'inactive' | 'active'>('inactive');
const licenseInfo = ref<{ name: string } | null>(null);
const errorMessage = ref('');
const successMessage = ref('');
const isCopied = ref(false);
const showConfirm = ref(false);

// ==================== 计算属性 ====================
const isValid = computed(() => {
  return activationCode.value.trim().length > 0;
});

// ==================== 方法函数 ====================

// 加载机器码和激活状态
const loadStatus = async () => {
  try {
    machineId.value = await licenseAPI.getMachineId();
    const status = await licenseAPI.getLicenseStatus();
    if (status) {
      activationStatus.value = 'active';
      licenseInfo.value = { name: status.name };
    } else {
      activationStatus.value = 'inactive';
      licenseInfo.value = null;
    }
  } catch (error) {
    console.error('加载激活状态失败:', error);
  }
};

// 复制机器码
const copyMachineId = async () => {
  try {
    await navigator.clipboard.writeText(machineId.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    alert('复制失败，请手动选择复制');
  }
};

// 处理激活
const handleActivate = async () => {
  if (!isValid.value || isActivating.value) return;

  isActivating.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await licenseAPI.saveLicense(activationCode.value.trim());
    successMessage.value = '激活成功！';
    activationStatus.value = 'active';
    const status = await licenseAPI.getLicenseStatus();
    if (status) {
      licenseInfo.value = { name: status.name };
    }
    activationCode.value = '';

    setTimeout(() => {
      close();
    }, 2000);
  } catch (error) {
    console.error('--- 激活错误完整信息 ---');
    console.error('Error object:', error);
    console.error('JSON.stringify:', JSON.stringify(error, null, 2));
    // Tauri 返回的错误是 { message: string }
    errorMessage.value = (error as any)?.message || (error as Error).message || '激活失败，请检查激活码是否正确';
  } finally {
    isActivating.value = false;
  }
};

// 显示确认对话框
const showConfirmDialog = () => {
  showConfirm.value = true;
};

// 确认清除激活
const confirmClearLicense = async () => {
  showConfirm.value = false;
  try {
    await licenseAPI.clearLicense();
    activationStatus.value = 'inactive';
    licenseInfo.value = null;
    successMessage.value = '激活信息已清除！';
    setTimeout(() => {
      successMessage.value = '';
    }, 2000);
  } catch (error) {
    console.error('清除激活失败:', error);
    errorMessage.value = '清除失败，请重试';
  }
};

// 取消清除激活
const cancelClearLicense = () => {
  showConfirm.value = false;
};

// 关闭弹窗
const close = () => {
  emit('update:show', false);
  activationCode.value = '';
  errorMessage.value = '';
  successMessage.value = '';
};

// ==================== 生命周期 ====================
onMounted(() => {
  loadStatus();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <!-- 头部 -->
          <div class="modal-header">
            <h3 class="modal-title">激活窗口</h3>
            <button class="close-btn" @click="close">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <!-- 激活状态 -->
            <div class="status-section">
              <div class="status-label">激活状态</div>
              <div class="status-value" :class="activationStatus">
                <span class="status-dot"></span>
                <span>{{ activationStatus === 'active' ? '已激活' : '未激活' }}</span>
              </div>
            </div>

            <!-- 已激活状态显示 -->
            <div v-if="activationStatus === 'active' && licenseInfo" class="activated-info">
              <div class="info-item">
                <span class="info-label">授权用户：</span>
                <span class="info-value">{{ licenseInfo.name }}</span>
              </div>
              <button 
                class="clear-btn"
                @click="showConfirmDialog"
              >
                清除激活信息（测试用）
              </button>
            </div>

            <!-- 未激活状态显示 -->
            <div v-if="activationStatus === 'inactive'">
              <!-- 机器码 -->
              <div class="machine-id-section">
                <label class="input-label">机器码</label>
                <div class="machine-id-display">
                  <span class="machine-id-text">{{ machineId || '加载中...' }}</span>
                  <button
                    class="copy-btn"
                    :class="{ copied: isCopied }"
                    @click="copyMachineId"
                    :disabled="!machineId"
                  >
                    {{ isCopied ? '已复制' : '复制' }}
                  </button>
                </div>
                <div class="machine-id-tip">请将机器码发给客服获取激活码</div>
              </div>

              <!-- 激活码输入 -->
              <div class="input-section">
                <label class="input-label">请输入激活码</label>
                <input
                  v-model="activationCode"
                  type="text"
                  class="activation-input"
                  placeholder="请输入激活码"
                  :disabled="isActivating"
                  @keyup.enter="handleActivate"
                />
              </div>

              <!-- 激活按钮 -->
              <button
                class="activate-btn"
                :disabled="!isValid || isActivating"
                @click="handleActivate"
              >
                <span v-if="isActivating" class="loading-spinner"></span>
                <span v-else>激活</span>
              </button>

              <!-- 错误提示 -->
              <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
              </div>

              <!-- 成功提示 -->
              <div v-if="successMessage" class="success-message">
                {{ successMessage }}
              </div>
            </div>

            <!-- 确认对话框 -->
            <div v-if="showConfirm" class="confirm-dialog">
              <div class="confirm-content">
                <p class="confirm-text">确定要清除激活信息吗？这将需要重新激活。</p>
                <div class="confirm-buttons">
                  <button class="confirm-btn cancel" @click="cancelClearLicense">
                    取消
                  </button>
                  <button class="confirm-btn confirm" @click="confirmClearLicense">
                    确定清除
                  </button>
                </div>
              </div>
            </div>

            <!-- 提示信息 -->
            <div v-else class="tips-section">
              <div class="tip-item">
                <span class="tip-icon">💡</span>
                <span class="tip-text">激活后可使用全部功能</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">🔒</span>
                <span class="tip-text">激活码与电脑绑定，更换电脑需联系客服</span>
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
  max-width: 420px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
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
  padding: 24px;
}

/* 状态区域 */
.status-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 10px;
}

.status-label {
  font-size: 14px;
  color: #666;
}

.status-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-value.inactive {
  color: #999;
}

.status-value.active {
  color: #52c41a;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

/* 已激活信息 */
.activated-info {
  padding: 16px;
  background: #f0f9f0;
  border-radius: 10px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #666;
  min-width: 80px;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.clear-btn {
  margin-top: 12px;
  width: 100%;
  padding: 10px;
  font-size: 13px;
  color: #ff4d4f;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #ff4d4f;
  color: white;
}

.confirm-dialog {
  padding: 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  margin-top: 16px;
}

.confirm-content {
  text-align: center;
}

.confirm-text {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #333;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  padding: 8px 20px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.confirm-btn.cancel:hover {
  background: #d9d9d9;
}

.confirm-btn.confirm {
  background: #ff4d4f;
  color: white;
}

.confirm-btn.confirm:hover {
  background: #d9363e;
}

/* 机器码区域 */
.machine-id-section {
  margin-bottom: 20px;
}

.machine-id-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.machine-id-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  letter-spacing: 1px;
}

.copy-btn {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #c75b39;
  background: white;
  border: 1px solid #c75b39;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #c75b39;
  color: white;
}

.copy-btn.copied {
  background: #52c41a;
  border-color: #52c41a;
  color: white;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.machine-id-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

/* 输入区域 */
.input-section {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.activation-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-size: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  color: #333;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.activation-input:focus {
  border-color: #c75b39;
  background: white;
  box-shadow: 0 0 0 3px rgba(199, 91, 57, 0.1);
}

.activation-input::placeholder {
  color: #bbb;
}

.activation-input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
}

/* 激活按钮 */
.activate-btn {
  width: 100%;
  height: 44px;
  margin-bottom: 12px;
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

.activate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(199, 91, 57, 0.3);
}

.activate-btn:disabled {
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 错误/成功提示 */
.error-message {
  padding: 10px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
  margin-bottom: 12px;
}

.success-message {
  padding: 10px 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  color: #52c41a;
  font-size: 13px;
  margin-bottom: 12px;
}

/* 提示区域 */
.tips-section {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #666;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  font-size: 14px;
}

.tip-text {
  line-height: 1.5;
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
