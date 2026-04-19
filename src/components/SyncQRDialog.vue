<template>
  <Teleport to="body">
    <div v-if="visible" class="sync-overlay" @click.self="handleClose">
      <div class="sync-dialog">
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">小程序版本</h3>
          <button class="close-btn" @click="handleClose">
            <IconSvg name="close" :size="18" />
          </button>
        </div>

        <!-- 内容区 -->
        <div class="dialog-body">
          <div class="sync-header">
            <div class="sync-subtitle">用微信扫描体验小程序版本</div>
          </div>

          <!-- 二维码展示 -->
          <div class="qr-area">
            <img src="/Img/小程序码.jpg" class="qr-image" alt="小程序二维码" />
          </div>

          <!-- 说明文字 -->
          <div class="sync-desc">
            可将导出Excel表格文件导入小程序，小程序拥有该软件的全部功能，更便捷且可以分享给其他家庭成员
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="dialog-footer">
          <button class="footer-btn cancel" @click="handleClose">知道了</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import IconSvg from './IconSvg.vue'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'close'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
/* 遮罩层 */
.sync-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹窗主体 */
.sync-dialog {
  width: 420px;
  max-height: 85vh;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  box-shadow: var(--theme-shadow-lg), 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 标题栏 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--theme-border);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-text-muted);
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

/* 内容区 */
.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.sync-header {
  text-align: center;
  margin-bottom: 24px;
}

.sync-subtitle {
  font-size: 14px;
  color: var(--theme-text-secondary);
}

.sync-desc {
  text-align: center;
  font-size: 13px;
  color: var(--theme-text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
  padding: 0 8px;
}

.qr-area {
  text-align: center;
  margin-bottom: 24px;
}

.qr-image {
  width: 240px;
  height: 240px;
  border-radius: var(--theme-border-radius);
  border: 2px solid var(--theme-border);
  display: block;
  margin: 0 auto;
  box-shadow: var(--theme-shadow-sm);
  transition: all 0.3s ease;
}

.qr-image:hover {
  transform: scale(1.02);
  box-shadow: var(--theme-shadow-md);
}

/* 底部操作栏 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 28px 20px;
  border-top: 1px solid var(--theme-border);
}

.footer-btn {
  padding: 10px 28px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.footer-btn.cancel {
  background: transparent;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.footer-btn.cancel:hover {
  background: rgba(var(--theme-primary-rgb), 0.04);
  color: var(--theme-text-primary);
}
</style>
