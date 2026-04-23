<script setup lang="ts">
import { ref, onMounted } from 'vue';
import IconSvg from '../IconSvg.vue';
import { getVersion } from '@tauri-apps/api/app';

const qrCodeExists = ref(true);
const appVersion = ref('v1.10.3');

onMounted(async () => {
  try {
    const version = await getVersion();
    appVersion.value = `v${version}`;
  } catch (error) {
    console.error('获取版本号失败:', error);
  }
});
</script>

<template>
  <div class="about-page">
    <!-- 应用信息卡片 -->
    <div class="about-card main-card">
      <div class="app-header-section">
        <img src="/images/logo.png" alt="电子礼金簿" class="app-logo-large" />
        <div class="app-info">
          <h1 class="app-name">电子礼金簿</h1>
          <p class="app-version">版本 {{ appVersion }}</p>
        </div>
      </div>

      <div class="divider" />

      <!-- 作者信息 -->
      <div class="author-section">
        <h3 class="section-title">开发者信息</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">联系邮箱</span>
            <a href="mailto:luochangxin@foxmail.com" class="info-link">luochangxin@foxmail.com</a>
          </div>
          <div class="info-item">
            <span class="info-label">GitHub</span>
            <a href="https://github.com/tuo21/electron-gift-book" target="_blank" class="info-link">
              https://github.com/tuo21/electron-gift-book
            </a>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- 二维码区域 -->
      <div class="qr-section">
        <h3 class="section-title">关注与支持</h3>
        <p class="section-desc">扫描二维码关注公众号或支持开发者</p>
        <div class="qr-code-wrapper">
          <img 
            v-if="qrCodeExists" 
            src="/images/引流赞赏码.png" 
            alt="公众号二维码和赞赏码" 
            @error="qrCodeExists = false"
            class="qr-image"
          />
          <div v-else class="qr-placeholder">
            <IconSvg name="image" :size="48" />
            <span>二维码加载失败</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.about-page::-webkit-scrollbar {
  width: 6px;
}

.about-page::-webkit-scrollbar-track {
  background: transparent;
}

.about-page::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.about-page::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 卡片样式 */
.about-card {
  background: var(--card-bg, #FFFFFF);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.main-card {
  text-align: center;
}

/* 应用头部 */
.app-header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.app-logo-large {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(199, 91, 57, 0.3);
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.app-version {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: 24px 0;
}

/* 区域标题 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.section-desc {
  font-size: 14px;
  color: #999;
  margin: -8px 0 16px 0;
}

/* 作者信息 - 居中对齐 */
.author-section {
  text-align: center;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #999;
}

.info-link {
  font-size: 14px;
  color: #409eff;
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s;
}

.info-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

/* 二维码区域 */
.qr-section {
  text-align: center;
}

.qr-code-wrapper {
  display: inline-block;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-top: 8px;
}

.qr-image {
  max-width: 400px;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
}

.qr-placeholder {
  width: 240px;
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  font-size: 14px;
}
</style>
