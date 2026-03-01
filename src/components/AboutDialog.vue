<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="about-dialog-overlay" @click.self="closeDialog">
        <div class="about-dialog">
          <!-- 标题栏 -->
          <div class="dialog-header">
            <h3 class="dialog-title">关于电子礼金簿</h3>
            <button class="close-btn" @click="closeDialog">×</button>
          </div>

          <!-- 内容区域 -->
          <div class="dialog-body">
            <!-- 作者信息区域 -->
            <div class="author-section">
              <div class="app-info">
                <h3 class="app-name">电子礼金簿</h3>
                <p class="app-version">版本：v1.10.0</p>
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
                <p class="wechat-title">扫一扫关注微信公众号</p>
                <div class="qr-code">
                  <img v-if="qrCodeExists" src="/images/qrcode.png" alt="微信公众号二维码" @error="qrCodeExists = false" />
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
                <span class="info-icon">ℹ️</span>
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
                    <span class="collapse-arrow">{{ activeIndex === index ? '▼' : '▶' }}</span>
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

          <!-- 底部按钮 -->
          <div class="dialog-footer">
            <button class="btn-primary" @click="closeDialog">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const qrCodeExists = ref(true)
const activeIndex = ref<number | null>(0)

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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

/* 对话框 */
.about-dialog {
  background: #fff;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* 标题栏 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f7fa;
  color: #606266;
}

/* 内容区域 */
.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* 作者信息区域 */
.author-section {
  text-align: center;
}

.app-info {
  margin-bottom: 20px;
}

.app-name {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
}

.app-version {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.author-info {
  margin-bottom: 20px;
  text-align: left;
}

.info-item {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.label {
  color: #909399;
}

.link {
  color: #409eff;
  text-decoration: none;
  word-break: break-all;
}

.link:hover {
  text-decoration: underline;
}

.wechat-section {
  margin-top: 20px;
}

.wechat-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.qr-code {
  height: 120px;
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
}

.qr-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border: 2px dashed #c0c4cc;
  border-radius: 8px;
}

.placeholder-text {
  font-size: 14px;
  color: #909399;
}

.wechat-name {
  font-size: 14px;
  color: #606266;
  margin-top: 8px;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: #e4e7ed;
  margin: 20px 0;
}

/* 使用小提示区域 */
.tips-section {
  margin-top: 20px;
}

.tips-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: #409eff;
}

/* 折叠面板 */
.collapse-list {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.collapse-item {
  border-bottom: 1px solid #e4e7ed;
}

.collapse-item:last-child {
  border-bottom: none;
}

.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f7fa;
  cursor: pointer;
  transition: background 0.2s;
}

.collapse-header:hover {
  background: #e4e7ed;
}

.collapse-item.active .collapse-header {
  background: #ecf5ff;
}

.collapse-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.collapse-arrow {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
}

.collapse-content {
  padding: 12px 16px;
  background: #fff;
}

.tip-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
}

.tip-list li {
  margin: 4px 0;
}

/* 底部按钮 */
.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 20px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #66b1ff;
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
