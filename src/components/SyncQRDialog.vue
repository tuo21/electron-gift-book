<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="sync-overlay" @click.self="handleClose">
        <div class="sync-dialog">
          <!-- 标题 -->
          <div class="sync-header">
            <div class="sync-title">小程序版本</div>
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
          <!-- 底部按钮 -->
          <div class="sync-footer">
            <button class="btn-primary" @click="handleClose">知道了</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
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
.sync-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.sync-dialog {
  background: white;
  border-radius: 16px;
  padding: 32px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.sync-header {
  text-align: center;
  margin-bottom: 24px;
}

.sync-title {
  font-size: 24px;
  font-weight: bold;
  color: #8B0000;
  margin-bottom: 8px;
}

.sync-subtitle {
  font-size: 14px;
  color: #666;
}

.sync-desc {
  text-align: center;
  font-size: 13px;
  color: #666;
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
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  display: block;
  margin: 0 auto;
}

.sync-footer {
  display: flex;
  justify-content: center;
}

.btn-primary {
  padding: 10px 32px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: #8B0000;
  color: white;
}

.btn-primary:hover {
  background: #a00000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
