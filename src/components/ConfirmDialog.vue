<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click="handleOverlayClick">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <span class="confirm-icon">⚠️</span>
          <span class="confirm-title">{{ dialogTitle }}</span>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">{{ dialogMessage }}</p>
        </div>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="handleCancel">
            {{ dialogCancelText }}
          </button>
          <button class="confirm-btn confirm" :class="dialogConfirmType" @click="handleConfirm">
            {{ dialogConfirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const visible = ref(false);
const dialogTitle = ref('确认操作')
const dialogMessage = ref('')
const dialogConfirmText = ref('确定')
const dialogCancelText = ref('取消')
const dialogConfirmType = ref<'danger' | 'warning' | 'primary'>('danger')
let resolvePromise: ((value: boolean) => void) | null = null;

interface OpenOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmType?: 'danger' | 'warning' | 'primary'
}

const open = (options?: OpenOptions): Promise<boolean> => {
  if (options) {
    dialogTitle.value = options.title || '确认操作'
    dialogMessage.value = options.message
    dialogConfirmText.value = options.confirmText || '确定'
    dialogCancelText.value = options.cancelText || '取消'
    dialogConfirmType.value = options.confirmType || 'danger'
  }
  visible.value = true;
  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
};

const handleConfirm = () => {
  visible.value = false;
  emit('confirm');
  if (resolvePromise) {
    resolvePromise(true);
    resolvePromise = null;
  }
};

const handleCancel = () => {
  visible.value = false;
  emit('cancel');
  if (resolvePromise) {
    resolvePromise(false);
    resolvePromise = null;
  }
};

const handleOverlayClick = () => {
  handleCancel();
};

defineExpose({ open });
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-dialog {
  background: var(--theme-paper, #f5f0e8);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  max-width: 400px;
  overflow: hidden;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.confirm-icon {
  font-size: 24px;
}

.confirm-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--theme-text-primary, #333);
}

.confirm-body {
  padding: 20px;
}

.confirm-message {
  font-size: 15px;
  color: var(--theme-text-primary, #333);
  line-height: 1.6;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.confirm-btn {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn.cancel {
  background: rgba(0, 0, 0, 0.08);
  color: var(--theme-text-primary, #333);
}

.confirm-btn.cancel:hover {
  background: rgba(0, 0, 0, 0.15);
}

.confirm-btn.confirm {
  color: white;
}

.confirm-btn.confirm.danger {
  background: #ef4444;
}

.confirm-btn.confirm.danger:hover {
  background: #dc2626;
}

.confirm-btn.confirm.warning {
  background: #f59e0b;
}

.confirm-btn.confirm.warning:hover {
  background: #d97706;
}

.confirm-btn.confirm.primary {
  background: var(--theme-primary, #c44a3d);
}

.confirm-btn.confirm.primary:hover {
  background: var(--theme-primary-dark, #a33a30);
}
</style>
