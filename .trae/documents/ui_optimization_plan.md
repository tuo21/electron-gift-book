# 电子礼金簿 UI 优化计划

## 项目概述

优化 Tauri 项目中的用户界面，**不使用 emoji 图标**，重新设计除了礼金簿内容区之外的所有界面。

## 现状分析

### 当前问题

1. **大量使用 Emoji 图标** - 不符合专业 UI 设计规范

   * App.vue: 💾 📤 ✏️ 📊 🔍 🏠 ℹ️ 📖 📥 📁 🗑️ 📍 ↩️

   * SplashScreen.vue: 🎊 🕯️ ✓ ›

   * AboutDialog.vue: ℹ️ ▼ ▶

   * ExportModal.vue: 📊 📄

2. **界面风格不够统一** - 弹窗、按钮、表单等组件样式存在差异

3. **缺乏专业图标系统** - 需要使用 SVG 图标替代 Emoji

4. **视觉层次不够清晰** - 部分区域对比度和间距需要优化

## 设计原则

### 1. 中式传统风格

* 保持喜庆红/肃穆灰双主题

* 使用传统中式配色和元素

* 字体保持楷体/宋体组合

### 2. 专业图标系统

* 使用 SVG 图标替代所有 Emoji

* 统一图标尺寸 20px-24px

* 使用 Lucide 或 Heroicons 风格图标

### 3. 视觉层次

* 清晰的标题层级

* 合理的间距系统

* 统一的圆角和阴影

### 4. 交互反馈

* 悬停状态反馈

* 点击效果

* 过渡动画 200-300ms

## 需要优化的组件清单

### 1. 启动页 (SplashScreen.vue)

**当前 Emoji:**

* 🎊 (喜庆主题图标)

* 🕯️ (肃穆主题图标)

* ✓ (选中标记)

* › (箭头)

* 📖 (新建按钮)

* 📥 (导入按钮)

* 📁 (文件图标)

* 🗑️ (删除图标)

**优化方案:**

* 使用 SVG 图标替代所有 Emoji

* 优化主题卡片设计

* 改进历史文件列表样式

* 美化删除确认弹窗

### 2. 主应用界面 (App.vue)

**当前 Emoji:**

* 💾 (保存)

* 📤 (导出)

* ✏️ (修改记录)

* 📊 (统计)

* 🔍 (搜索)

* 🏠 (返回首页)

* ℹ️ (关于)

**优化方案:**

* 顶部导航栏重新设计

* 功能按钮使用 SVG 图标

* 优化统计面板样式

* 改进所有弹窗样式

### 3. 关于对话框 (AboutDialog.vue)

**当前 Emoji:**

* ℹ️ (信息图标)

* ▼ ▶ (展开/收起箭头)

**优化方案:**

* 使用 SVG 信息图标

* 优化折叠面板样式

* 改进整体布局

### 4. 修改记录弹窗 (EditHistoryModal.vue)

**当前 Emoji:**

* 📍 (定位)

* ↩️ (还原)

**优化方案:**

* 使用 SVG 图标

* 优化右键菜单样式

* 改进列表项设计

### 5. 导出弹窗 (ExportModal.vue)

**当前 Emoji:**

* 📊 (Excel)

* 📄 (PDF)

**优化方案:**

* 使用 SVG 文件类型图标

* 优化导出选项卡片

### 6. 录入表单 (RecordForm.vue)

**优化方案:**

* 优化表单输入框样式

* 改进支付方式选择按钮

* 美化提交按钮

### 7. 统计面板 (StatisticsPanel.vue / StatisticsModal.vue)

**优化方案:**

* 优化统计卡片样式

* 改进数字展示

## SVG 图标设计方案

### 图标库选择

使用内联 SVG 图标，风格参考 Lucide Icons:

* 线条粗细: 2px

* 圆角端点

* 24x24 视口

* 单色设计

### 图标映射表

| 功能    | 原 Emoji | SVG 图标设计              |
| ----- | ------- | --------------------- |
| 保存    | 💾      | 软盘图标 (floppy-disk)    |
| 导出    | 📤      | 上传/导出图标 (upload)      |
| 修改    | ✏️      | 铅笔图标 (pencil)         |
| 统计    | 📊      | 柱状图图标 (bar-chart-3)   |
| 搜索    | 🔍      | 放大镜图标 (search)        |
| 首页    | 🏠      | 房子图标 (home)           |
| 关于    | ℹ️      | 信息圆圈图标 (info)         |
| 新建    | 📖      | 书本加号图标 (book-plus)    |
| 导入    | 📥      | 下载图标 (download)       |
| 文件    | 📁      | 文件夹图标 (folder)        |
| 删除    | 🗑️     | 垃圾桶图标 (trash-2)       |
| 定位    | 📍      | 定位图标 (map-pin)        |
| 还原    | ↩️      | 撤销图标 (undo-2)         |
| Excel | 📊      | 表格图标 (table)          |
| PDF   | 📄      | 文件文本图标 (file-text)    |
| 喜庆    | 🎊      | 灯笼/喜庆装饰图标             |
| 肃穆    | 🕯️     | 莲花/菊花图标               |
| 选中    | ✓       | 对勾图标 (check)          |
| 箭头    | ›       | 右箭头图标 (chevron-right) |
| 展开    | ▼       | 下箭头图标 (chevron-down)  |
| 收起    | ▶       | 右箭头图标 (chevron-right) |

## 样式优化细节

### 1. 按钮样式统一

```css
/* 主按钮 */
.btn-primary {
  background: var(--theme-primary);
  color: var(--theme-text-light);
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background: var(--theme-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--theme-shadow-hover);
}

/* 次按钮 */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--theme-primary);
  color: var(--theme-primary);
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}
```

### 2. 弹窗样式统一

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--theme-paper);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-body {
  padding: 24px;
}
```

### 3. 表单样式优化

```css
.form-input {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 15px;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 3px rgba(235, 86, 74, 0.1);
}
```

## 实施步骤

### 阶段 1: 创建图标组件

1. 创建 `IconSvg.vue` 通用图标组件
2. 定义所有需要的 SVG 图标
3. 支持尺寸、颜色自定义

### 阶段 2: 启动页优化

1. 替换 SplashScreen.vue 中所有 Emoji
2. 优化主题卡片设计
3. 改进历史文件列表
4. 美化删除确认弹窗

### 阶段 3: 主界面优化

1. 替换 App.vue 中所有 Emoji
2. 重新设计顶部导航栏
3. 优化功能按钮组
4. 改进统计面板

### 阶段 4: 弹窗优化

1. 优化 AboutDialog.vue
2. 优化 EditHistoryModal.vue
3. 优化 StatisticsModal.vue
4. 优化 ExportModal.vue

### 阶段 5: 表单优化

1. 优化 RecordForm.vue 样式
2. 改进支付方式选择
3. 美化按钮样式

### 阶段 6: 最终调整

1. 统一所有组件样式
2. 检查颜色对比度
3. 验证交互效果
4. 测试双主题显示

## 预期效果

1. **专业感提升** - 使用 SVG 图标替代 Emoji，界面更加专业
2. **视觉统一** - 所有组件风格一致，视觉层次清晰
3. **交互优化** - 悬停、点击等交互反馈更加流畅
4. **可维护性** - 统一的图标系统和样式规范，便于后续维护

## 注意事项

1. **礼金簿内容区不动** - 只优化除礼金簿展示区外的界面
2. **保持双主题** - 所有优化必须兼容喜庆红和肃穆灰两种主题
3. **字体不变** - 保持现有的楷体/宋体字体方案
4. **功能不变** - 只改UI，不改变任何功能逻辑

