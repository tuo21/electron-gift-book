<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getVersion } from '@tauri-apps/api/app';

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
  <div class="mini-program-page">
    <!-- 主内容卡片 -->
    <div class="about-card main-card">
      <!-- 顶部标题区 -->
      <div class="app-header-section">

        <div class="app-info">
          <h1 class="app-name">礼金簿小程序</h1>
          <p class="app-version">随时随地 · 便携管理</p>
        </div>
      </div>

      <div class="divider" />

      <div class="content-section mini-app-section">

        <p class="mini-app-desc">微信扫描下方小程序码，即刻体验「礼金簿」小程序</p>
        <div class="qrcode-wrapper">
          <div class="qrcode-container">
            <img src="/images/小程序码.jpg" alt="礼金簿小程序码" class="mini-qrcode" />
            <div class="qrcode-border"></div>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- 小程序介绍 -->
      <div class="content-section">
        <h3 class="section-title">
          <span class="title-icon">📱</span>
          小程序介绍
        </h3>
        <div class="story-content">
          <p class="story-text">
            「礼金簿」小程序是电脑端软件的<strong>移动端伴侣</strong>，让您在外出时也能随时查看和管理礼簿记录。
          </p>
          <p class="story-text">
            无论您在婚礼现场、朋友聚会，还是外出旅行，都可以通过手机快速查询送礼记录，不再需要随身携带厚重的纸质礼簿。
          </p>
        </div>
      </div>

      <div class="divider" />

      <!-- 主要功能 -->
      <div class="content-section">
        <h3 class="section-title">
          <span class="title-icon">✨</span>
          主要功能
        </h3>
        <div class="features-list">
          <div class="feature-item">
            <div class="feature-badge">📝</div>
            <div class="feature-text">
              <strong>礼簿管理</strong>：可以管理多个礼簿，满足结婚、搬家、升学等多个事务的礼簿管理
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">🔍</div>
            <div class="feature-text">
              <strong>快速搜索</strong>：输入姓名即可查看送礼详情，一目了然
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">💰</div>
            <div class="feature-text">
              <strong>送礼支出记录</strong>：新增支出记录功能，收支双向管理
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">📥</div>
            <div class="feature-text">
              <strong>Excel 导入</strong>：将电脑端导出的 Excel 快速导入小程序
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">📊</div>
            <div class="feature-text">
              <strong>数据统计</strong>：礼金总额、人数统计等一目了然
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">🔐</div>
            <div class="feature-text">
              <strong>微信登录</strong>：不怕忘记账号，一键登录即可使用
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-badge">🔗</div>
            <div class="feature-text">
              <strong>礼簿分享</strong>：可以将礼簿分享给家人，让家人也能随时查阅
            </div>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- 使用说明 -->
      <div class="content-section">
        <h3 class="section-title">
          <span class="title-icon">📖</span>
          使用说明
        </h3>
        <div class="tips-list">
          <div class="tip-block">
            <span class="tip-step">1</span>
            <p class="tip-content">在电脑端电子礼金簿中导出 Excel 数据文件</p>
          </div>
          <div class="tip-block">
            <span class="tip-step">2</span>
            <p class="tip-content">将礼簿Excel文件发送到微信，在小程序内点击新建，选择「导入 Excel」</p>
          </div>
          <div class="tip-block">
            <span class="tip-step">3</span>
            <p class="tip-content">在聊天记录中选择对应的Excel文件即可完成导入</p>
          </div>
          <div class="tip-block">
            <span class="tip-step">4</span>
            <p class="tip-content">开始使用手机端管理您的礼簿记录，随时随地查询修改</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mini-program-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

/* 滚动条样式 */
.mini-program-page::-webkit-scrollbar {
  width: 6px;
}

.mini-program-page::-webkit-scrollbar-track {
  background: transparent;
}

.mini-program-page::-webkit-scrollbar-thumb {
  background: rgba(7, 193, 96, 0.2);
  border-radius: 3px;
}

.mini-program-page::-webkit-scrollbar-thumb:hover {
  background: rgba(7, 193, 96, 0.35);
}

/* 卡片样式 */
.about-card {
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.main-card {
  text-align: center;
}

/* 头部区域 */
.app-header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(7, 193, 96, 0.2);
}

.app-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.app-version {
  font-size: 14px;
  color: #07c160;
  font-weight: 500;
  margin: 0;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: 24px 0;
}

/* 内容区块 */
.content-section {
  text-align: left;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
}

/* 故事内容 */
.story-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-text {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin: 0;
  text-align: left;
}

.story-text strong {
  color: #07c160;
}

/* 功能列表 */
.features-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.03) 0%, rgba(7, 193, 96, 0.06) 100%);
  border-radius: 10px;
  border: 1px solid rgba(7, 193, 96, 0.1);
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.06) 0%, rgba(7, 193, 96, 0.1) 100%);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(7, 193, 96, 0.1);
}

.feature-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.feature-text {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
  text-align: left;
}

.feature-text strong {
  color: #07c160;
  font-weight: 600;
}

/* 使用说明区块 */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-block {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.tip-block:hover {
  background: #f5f5f5;
}

.tip-step {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #07c160 0%, #059e4c 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(7, 193, 96, 0.3);
}

.tip-content {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
  margin: 0;
  text-align: left;
  padding-top: 3px;
}

/* 小程序二维码区域 */
.mini-app-section {
  text-align: center;
}

.mini-app-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0 0 24px 0;
  text-align: center;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.qrcode-container {
  position: relative;
  padding: 12px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.qrcode-border {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 2px solid rgba(7, 193, 96, 0.3);
  pointer-events: none;
}

.mini-qrcode {
  width: 180px;
  height: 180px;
  object-fit: contain;
  border-radius: 12px;
  display: block;
}

.qrcode-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
  font-weight: 500;
}

.qr-tips {
  margin-top: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(7, 193, 96, 0.05) 0%, rgba(7, 193, 96, 0.08) 100%);
  border-radius: 8px;
  border: 1px dashed rgba(7, 193, 96, 0.2);
}

.qr-tip {
  font-size: 13px;
  color: #07c160;
  margin: 0;
  line-height: 1.6;
}
</style>
