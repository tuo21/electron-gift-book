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

      <!-- 开发初衷 -->
      <div class="content-section">
        <h3 class="section-title">开发初衷</h3>
        <div class="story-content">
          <p class="story-text">
            现在越来越多的年轻人开始接手「礼部尚书」这一职位了。我想，工具是否也可以随着时代更新一下呢？
          </p>
          <p class="story-text">
            说实话，我本人写名字时老是提笔忘字，实在有点尴尬。而且传统纸质记录查阅不便——每逢人情往来，总要翻箱倒柜找本子。
          </p>
          <p class="story-text">
            我曾尝试将礼金簿录入Excel表格，实现手机随时查阅。于是萌生一个念头：<strong>何不一站到底，现场直接用电脑录入，完事后直接导出电子版？</strong>
          </p>
          <p class="story-text">
            需要说明的是，我本人并非软件开发者。这个项目完全借助AI辅助完成，因此难免存在未知的Bug或不完善之处，还请各位谅解。
          </p>
        </div>
      </div>

      <div class="divider" />

      <!-- 软件特点 -->
      <div class="content-section">
        <h3 class="section-title">软件特点</h3>
        <div class="features-list">
          <div class="feature-item">
            <span class="feature-icon">📜</span>
            <span><strong>竖排仿传统界面</strong>：模拟传统礼金簿的经典布局，视觉上更显亲切与庄重</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✍️</span>
            <span><strong>自动转换大写数字</strong>：彻底告别提笔忘字的窘境</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">💾</span>
            <span><strong>实时自动保存</strong>：每次录入后马上自动保存，退出软件或者断电不会丢失数据</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span><strong>支持多文件管理</strong>：可创建和管理多个礼金簿文件</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📤</span>
            <span><strong>导出功能</strong>：支持导出Excel表格和PDF打印格式，方便存档查询</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔍</span>
            <span><strong>修改记录追溯</strong>：每一次数据修改均有记录可追溯</span>
          </div>
        </div>
      </div>

      <div class="divider" />

      <!-- 用户感谢 -->
      <div class="content-section thanks-section">
        <h3 class="section-title">感谢</h3>
        <div class="thanks-content">
          <p class="thanks-text">
            衷心感谢天南地北的用户们提出的建议和支持！
          </p>
          <p class="thanks-text">
            您的每一条反馈，都是我持续打磨这个小工具的最大动力。
          </p>
          <p class="thanks-text">
            如果您有任何建议或意见，欢迎随时反馈给我。
          </p>
        </div>
      </div>
      
      <div class="divider" />

      <!-- 隐私安全 -->
      <div class="content-section">
        <h3 class="section-title">隐私安全</h3>
        <div class="tips-list">
          <p class="tip-item">本软件完全本地运行，所有数据均存储于用户个人电脑，<strong class="safe-highlight">绝不收集或上传任何信息</strong>。</p>
          <p class="tip-item">请务必<strong class="safe-highlight">及时导出备份</strong>数据，以防意外情况发生。</p>
        </div>
      </div>
      
      <div class="divider" />

      <!-- 扫码体验小程序 -->
      <div class="content-section mini-app-section">
        <h3 class="section-title">推荐小程序</h3>
        <p class="mini-app-desc">微信扫描下方小程序码，体验「礼金簿」小程序，随时随地管理您的礼金记录。</p>
        <div class="qrcode-wrapper">
          <img src="/images/小程序码.jpg" alt="礼金簿小程序码" class="mini-qrcode" />
          <p class="qrcode-hint">微信扫一扫，体验小程序</p>
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

/* 开发故事内容 */
.story-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0;
  text-align: left;
}

.story-text strong {
  color: #c75b39;
}

/* 功能列表 */
.features-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-item {
  display: flex;
  gap: 10px;
  font-size: 14px;
  color: #666;
  line-height: 1.7;
}

.feature-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* 感谢区域 */
.thanks-section {
  text-align: center;
}

.thanks-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thanks-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

/* 内容区块 */
.content-section {
  text-align: left;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

/* 安全高亮 */
.safe-highlight {
  color: #52c41a;
  font-weight: 600;
}

/* 小程序二维码区域 */
.mini-app-section {
  text-align: center;
}

.mini-app-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0 0 20px 0;
  text-align: center;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.mini-qrcode {
  width: 180px;
  height: 180px;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.qrcode-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

/* 温馨提示 */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-item {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}
</style>