<script setup lang="ts">
import { ref, computed } from 'vue';

// ==================== Props & Emits ====================
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

// ==================== 响应式状态 ====================
const activationCode = ref('');
const isActivating = ref(false);
const activationStatus = ref<'inactive' | 'active'>('inactive');

// ==================== 计算属性 ====================
const isValid = computed(() => {
  return activationCode.value.trim().length > 0;
});

// ==================== 方法函数 ====================

// 关闭弹窗
const close = () => {
  emit('update:show', false);
  activationCode.value = '';
};

// 处理激活
const handleActivate = async () => {
  if (!isValid.value || isActivating.value) return;

  isActivating.value = true;
  
  // TODO: 实现实际的激活逻辑
  // 这里预留激活接口
  
  // 模拟激活过程
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  alert('激活功能开发中，敬请期待！');
  
  isActivating.value = false;
  close();
};
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

            <!-- 激活码输入 -->
            <div class="input-section">
              <label class="input-label">请输入激活码</label>
              <input
                v-model="activationCode"
                type="text"
                class="activation-input"
                placeholder="请输入激活码"
                :disabled="isActivating"
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

            <!-- 提示信息 -->
            <div class="tips-section">
              <div class="tip-item">
                <span class="tip-icon">💡</span>
                <span class="tip-text">激活后可使用全部功能</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">🔒</span>
                <span class="tip-text">激活码为一次性使用，请妥善保管</span>
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
  margin-bottom: 20px;
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
