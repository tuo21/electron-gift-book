<script setup lang="ts">
import { ref } from 'vue';
import IconSvg from '../IconSvg.vue';

interface InstructionItem {
  icon: string;
  title: string;
  desc: string;
}

const instructionItems: InstructionItem[] = [
  {
    icon: 'edit',
    title: '如何创建礼簿',
    desc: '在左边创建礼簿栏中，填写事务名称和日期，选择主题样式点击创建礼簿即可。'
  },
  {
    icon: 'folder',
    title: '删除与编辑礼簿信息',
    desc: '在礼簿管理列表中右键点击，选择删除或编辑。注意，删除操作不可恢复。请谨慎操作。'
  },
  {
    icon: 'gift',
    title: '如何记录礼金',
    desc: '在礼金输入面板中，填写礼金金额、类型、备注等信息，点击确认即可。可以通过tab键切换输入框，选择支付方式后，双击回车即可快速完成录入。'
  },
  {
    icon: 'history',
    title: '如何修改礼金记录',
    desc: '在需要修改的条目上，右键即可选择修改或者删除。点击上方工具栏中"修改记录"可以查看历史修改记录。右键可以还原到修改前的状态。'
  },
  {
    icon: 'export',
    title: '如何导出数据',
    desc: '在打开礼簿，在工具栏中点击"导出"按钮，即可导出为PDF或Excel格式。'
  },
  {
    icon: 'palette',
    title: '选择布局样式',
    desc: '为了满足不同用户的需求，我们提供了两种布局样式：完整版详细布局（贵州广西常用布局）和简洁版布局（湖北四川等地常用布局）。您可以在工具栏"样式"中选择您喜欢的布局。'
  }
];

const activeIndex = ref<number | null>(0);

const toggleItem = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index;
};
</script>

<template>
  <div class="instructions-page">
    <div class="instructions-card">
      <div class="card-header">
        <IconSvg name="help" :size="24" />
        <h2 class="card-title">使用说明</h2>
      </div>
      
      <div class="instructions-list">
        <div
          v-for="(item, index) in instructionItems"
          :key="index"
          class="instruction-item"
          :class="{ active: activeIndex === index }"
        >
          <div class="item-header" @click="toggleItem(index)">
            <div class="item-icon">
              <IconSvg :name="item.icon" :size="20" />
            </div>
            <span class="item-title">{{ item.title }}</span>
            <IconSvg 
              :name="activeIndex === index ? 'chevron-down' : 'chevron-right'" 
              :size="16" 
              class="toggle-icon"
            />
          </div>
          <Transition name="collapse">
            <div v-show="activeIndex === index" class="item-content">
              <p class="item-desc">{{ item.desc }}</p>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 快捷键说明 -->
    <div class="shortcuts-card">
      <div class="card-header">
        <IconSvg name="keyboard" :size="24" />
        <h2 class="card-title">快捷键说明</h2>
      </div>
      
      <div class="shortcuts-list">
        <div class="shortcut-item">
          <span class="shortcut-key">Ctrl + N</span>
          <span class="shortcut-desc">新增记录</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Ctrl + F</span>
          <span class="shortcut-desc">搜索记录</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Ctrl + E</span>
          <span class="shortcut-desc">导出数据</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Delete</span>
          <span class="shortcut-desc">删除选中记录</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Tab</span>
          <span class="shortcut-desc">切换输入框</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Enter</span>
          <span class="shortcut-desc">确认/提交</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instructions-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.instructions-page::-webkit-scrollbar {
  width: 6px;
}

.instructions-page::-webkit-scrollbar-track {
  background: transparent;
}

.instructions-page::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.instructions-page::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* 卡片样式 */
.instructions-card,
.shortcuts-card {
  background: var(--card-bg, #FFFFFF);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

/* 使用说明列表 */
.instructions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.instruction-item {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.instruction-item:hover {
  border-color: rgba(199, 91, 57, 0.2);
}

.instruction-item.active {
  border-color: rgba(199, 91, 57, 0.3);
  background: rgba(199, 91, 57, 0.02);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.item-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.item-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(199, 91, 57, 0.1);
  border-radius: 8px;
  color: #C75B39;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.toggle-icon {
  color: #999;
  transition: transform 0.2s ease;
}

.item-content {
  padding: 0 16px 16px 64px;
}

.item-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

/* 快捷键列表 */
.shortcuts-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  transition: background 0.2s ease;
}

.shortcut-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.shortcut-key {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #C75B39;
  background: rgba(199, 91, 57, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(199, 91, 57, 0.2);
  white-space: nowrap;
}

.shortcut-desc {
  font-size: 14px;
  color: #666;
}

/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  opacity: 1;
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
