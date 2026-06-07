<script setup lang="ts">
// [ACTIVATION_FEATURE] 激活弹窗组件 - 激活功能已被临时隐藏
// 如需重新启用，请恢复 useActivation.ts 中的 checkActivation() 逻辑
// 并取消 HomeView.vue 中激活状态区域的隐藏
import { ref, computed, onMounted } from 'vue';
import licenseAPI from '../../api/license';

// ==================== Props & Emits ====================
defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'activation-changed'): void;
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
const clickCount = ref(0);
const showClearButton = ref(false);
let clickTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const TEN_MINUTES_MS = 10 * 60 * 1000;

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
    successMessage.value = '激活成功！所有功能已解锁。';
    activationStatus.value = 'active';
    emit('activation-changed');
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
    const msg = (error as any)?.message || (error as Error).message || '激活失败，请检查激活码是否正确';
    errorMessage.value = msg;
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
    emit('activation-changed');
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
  clickCount.value = 0;
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }
};

// 快速点击已激活状态5次，显示清除按钮10分钟
const handleStatusClick = () => {
  if (activationStatus.value !== 'active') return;

  clickCount.value += 1;

  if (clickTimer) {
    clearTimeout(clickTimer);
  }

  clickTimer = setTimeout(() => {
    clickCount.value = 0;
  }, 1000);

  if (clickCount.value >= 5) {
    clickCount.value = 0;
    showClearButton.value = true;

    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      showClearButton.value = false;
    }, TEN_MINUTES_MS);
  }
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
            <h3 class="modal-title">软件激活</h3>
            <button class="close-btn" @click="close">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="modal-body">
            <!-- ===== 激活状态 ===== -->
            <div class="status-bar">
              <span class="status-label">激活状态</span>
              <span class="status-value" :class="activationStatus" @click="handleStatusClick">
                <span class="status-dot"></span>
                {{ activationStatus === 'active' ? '已激活' : '未激活' }}
              </span>
              <button
                v-if="activationStatus === 'active' && showClearButton"
                class="clear-link"
                @click="showConfirmDialog"
              >
                清除激活（测试）
              </button>
            </div>

            <!-- ===== 购买引导区域 ===== -->
            <div class="purchase-guide">
              <p class="guide-text"><strong>本软件为收费软件</strong></p>
              <p class="guide-text">
                授权价格：<span class="price">58元</span> 永久使用（绑定当前电脑硬件）
              </p>
              <p class="guide-text guide-sub">
                购买后三年内，如更换电脑可免费更换一次激活码。
              </p>
              <div class="guide-divider"></div>
              <p class="guide-text guide-title">购买与获取激活码：</p>
              <p class="guide-text">
                请添加客服微信：<span class="wechat-id">zhuyaochicao</span>
              </p>
              <p class="guide-text guide-sub">
                将下方<span class="highlight-label">【机器码】</span>发送给客服，完成支付后，客服将为您提供专属<span class="highlight-label">【激活码】</span>。
              </p>
            </div>

            <!-- ===== 已激活状态显示 ===== -->
            <div v-if="activationStatus === 'active' && licenseInfo" class="activated-info">
              <div class="info-item">
                <span class="info-label">授权用户：</span>
                <span class="info-value">{{ licenseInfo.name }}</span>
              </div>
            </div>

            <!-- ===== 激活操作区域 ===== -->
            <div v-if="activationStatus === 'inactive'" class="activate-area">
              <!-- 机器码 -->
              <div class="machine-id-section">
                <label class="input-label">机器码</label>
                <div class="machine-id-row">
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
              </div>

              <!-- 激活码输入 -->
              <div class="input-section">
                <label class="input-label">激活码</label>
                <input
                  v-model="activationCode"
                  type="text"
                  class="activation-input"
                  placeholder="请输入客服提供的激活码"
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
                <span v-else>激 活</span>
              </button>
            </div>

            <!-- 错误提示 -->
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <!-- 成功提示 -->
            <div v-if="successMessage" class="success-message">
              {{ successMessage }}
            </div>

            <!-- ===== 底部状态提示 ===== -->
            <div class="bottom-tip">
              激活成功后，所有功能立即解锁。如遇问题，请联系客服微信。
            </div>

            <!-- 确认对话框 -->
            <div v-if="showConfirm" class="confirm-overlay" @click.self="cancelClearLicense">
              <div class="confirm-dialog">
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
  max-width: 460px;
  max-height: 90vh;
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
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* ===== 激活状态栏 ===== */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
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
  flex: 1;
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

.clear-link {
  font-size: 12px;
  color: #bbb;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.clear-link:hover {
  color: #ff4d4f;
}

/* ===== 购买引导区域 ===== */
.purchase-guide {
  margin-bottom: 20px;
  padding: 20px;
  background: #fdf6f0;
  border-radius: 10px;
  border: 1px solid #f5e0d0;
}

.guide-text {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin: 0 0 6px 0;
}

.guide-text:last-child {
  margin-bottom: 0;
}

.guide-sub {
  font-size: 13px;
  color: #999;
}

.guide-title {
  font-weight: 500;
  color: #666;
}

.price {
  color: #c75b39;
  font-size: 18px;
  font-weight: 700;
}

.wechat-id {
  color: #07c160;
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(7, 193, 96, 0.08);
  border-radius: 4px;
}

.highlight-label {
  color: #c75b39;
  font-weight: 500;
}

.guide-divider {
  height: 1px;
  background: #ebd8cc;
  margin: 12px 0;
}

/* ===== 已激活信息 ===== */
.activated-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f9f0;
  border-radius: 10px;
  border: 1px solid #d0f0c0;
}

.activated-info .info-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.activated-info .info-label {
  color: #666;
  min-width: 80px;
}

.activated-info .info-value {
  color: #333;
  font-weight: 500;
}

/* ===== 激活操作区域 ===== */
.activate-area {
  margin-bottom: 16px;
}

.machine-id-section {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.machine-id-row {
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
  word-break: break-all;
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
  white-space: nowrap;
  flex-shrink: 0;
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

/* 输入区域 */
.input-section {
  margin-bottom: 20px;
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
  margin-bottom: 4px;
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

/* ===== 底部提示 ===== */
.bottom-tip {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  color: #999;
  text-align: center;
  line-height: 1.6;
}

/* ===== 确认对话框 ===== */
.confirm-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  z-index: 10;
}

.confirm-dialog {
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  max-width: 320px;
  text-align: center;
}

.confirm-text {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
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
