<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="about-dialog-overlay" @click.self="closeDialog">
        <div class="about-dialog">
          <!-- 标题栏 -->
          <div class="dialog-header">
            <h3 class="dialog-title">关于电子礼金簿</h3>
            <button class="close-btn" @click="closeDialog">
              <IconSvg name="close" :size="18" />
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="dialog-body">
            <!-- 作者信息区域 -->
            <div class="author-section">
              <div class="app-info">
                <h3 class="app-name">电子礼金簿</h3>
                <p class="app-version">版本：{{ appVersion }}</p>
              </div>

              <div class="author-info">
                <p class="info-item">
                  <span class="label">联系邮箱：</span>
                  <a href="mailto:luochangxin@foxmail.com" class="link">luochangxin@foxmail.com</a>
                </p>
                <p class="info-item">
                  <span class="label">GitHub：</span>
                  <a href="https://github.com/tuo21/electron-gift-book" target="_blank" class="link">https://github.com/tuo21/electron-gift-book</a>
                </p>
              </div>

              <div class="wechat-section">
                <div class="qr-code">
                  <img v-if="qrCodeExists" src="/images/引流赞赏码.png" alt="公众号二维码和赞赏码" @error="qrCodeExists = false" />
                  <div v-else class="qr-placeholder">
                    <span class="placeholder-text">二维码</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="divider" />

            <!-- 使用小提示区域 -->
            <div class="tips-section">
              <h4 class="tips-title">
                <IconSvg name="info" :size="18" color="#409eff" />
                使用小提示
              </h4>
              <div class="collapse-list">
                <div
                  v-for="(item, index) in tipItems"
                  :key="index"
                  class="collapse-item"
                  :class="{ active: activeIndex === index }"
                >
                  <div class="collapse-header" @click="toggleItem(index)">
                    <span class="collapse-title">{{ item.title }}</span>
                    <IconSvg 
                      :name="activeIndex === index ? 'chevron-down' : 'chevron-right'" 
                      :size="14" 
                      color="#909399" 
                    />
                  </div>
                  <Transition name="collapse">
                    <div v-show="activeIndex === index" class="collapse-content">
                      <div v-if="typeof item.content === 'string'" class="tip-text">{{ item.content }}</div>
                      <ul v-else class="tip-list">
                        <li v-for="(line, i) in item.content" :key="i">{{ line }}</li>
                      </ul>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import IconSvg from './IconSvg.vue'
import { app } from '@tauri-apps/api'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const qrCodeExists = ref(true)
const activeIndex = ref<number | null>(0)
const appVersion = ref('v1.10.3')

onMounted(async () => {
  try {
    const version = await app.getVersion()
    appVersion.value = `v${version}`
  } catch (error) {
    console.error('获取版本号失败:', error)
  }
})

const tipItems = [
  {
    title: '数据保存位置',
    content: '本软件会自动将数据保存在 "C:\\Users\\<用户名>\\AppData\\Roaming\\com.giftbook.app\\" 目录下的 .db 文件。必要时可备份到其他地方。'
  },
  {
    title: '快捷键说明',
    content: [
      'Ctrl + N：新增记录',
      'Ctrl + F：搜索记录',
      'Ctrl + E：导出数据',
      'Delete：删除选中记录'
    ]
  },
  {
    title: '实用技巧',
    content: [
      '支持按姓名、金额、日期等多维度搜索',
      '可以导出 Excel 和 PDF 格式的礼金簿',
      '支持创建多个礼金簿文件',
      '数据修改有历史记录，可追溯变更'
    ]
  }
]

const toggleItem = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}

const closeDialog = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* 遮罩层 */
.about-dialog-overlay {
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

/* 对话框 */
.about-dialog {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--theme-shadow-lg), 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--theme-border);
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
  flex-shrink: 0;
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
  font-size: 24px;
  padding: 0;
}

.close-btn:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

/* 内容区域 */
.dialog-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
}

/* 滚动条 */
.dialog-body::-webkit-scrollbar {
  width: 5px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: var(--theme-border-color);
  border-radius: 3px;
  opacity: 0.4;
}

/* 作者信息区域 */
.author-section {
  text-align: center;
}

.app-info {
  margin-bottom: 24px;
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0 0 8px 0;
}

.app-version {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin: 0;
}

.author-info {
  margin-bottom: 24px;
  text-align: left;
}

.info-item {
  margin: 8px 0;
  font-size: 14px;
  color: var(--theme-text-secondary);
}

.label {
  color: var(--theme-text-muted);
}

.link {
  color: var(--theme-primary);
  text-decoration: none;
  word-break: break-all;
  transition: all 0.2s;
}

.link:hover {
  text-decoration: underline;
  color: var(--theme-accent);
}

.wechat-section {
  margin-top: 24px;
}

.wechat-title {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin-bottom: 12px;
}

.qr-code {
  height: 250px;
  margin: 0 auto;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-code img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow-sm);
}

.qr-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.05) 100%);
  border: 2px dashed var(--theme-border);
  border-radius: var(--theme-border-radius);
}

.placeholder-text {
  font-size: 14px;
  color: var(--theme-text-muted);
}

.wechat-name {
  font-size: 14px;
  color: var(--theme-text-secondary);
  margin-top: 8px;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: var(--theme-border);
  margin: 24px 0;
}

/* 使用小提示区域 */
.tips-section {
  margin-top: 24px;
}

.tips-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: var(--theme-primary);
}

/* 折叠面板 */
.collapse-list {
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius);
  overflow: hidden;
  background: white;
}

.collapse-item {
  border-bottom: 1px solid var(--theme-border);
}

.collapse-item:last-child {
  border-bottom: none;
}

.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapse-header:hover {
  background: rgba(0, 0, 0, 0.05);
}

.collapse-item.active .collapse-header {
  background: rgba(var(--theme-primary-rgb), 0.08);
}

.collapse-title {
  font-size: 14px;
  color: var(--theme-text-primary);
  font-weight: 500;
}

.collapse-arrow {
  font-size: 12px;
  color: var(--theme-text-muted);
  transition: transform 0.2s;
}

.collapse-content {
  padding: 12px 16px;
  background: white;
}

.tip-text {
  font-size: 14px;
  color: var(--theme-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: var(--theme-text-secondary);
  line-height: 1.8;
}

.tip-list li {
  margin: 4px 0;
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

/* 动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
