# 添加"关于"按钮和弹窗计划

## 目标

在主界面标题栏添加一个"关于"按钮，点击后弹出窗口显示软件作者介绍和使用小提示。

## 实施步骤

### 步骤 1: 创建 AboutDialog 组件

创建 `src/components/AboutDialog.vue` 组件：

* 使用 Element Plus 的 Dialog 组件

* 包含作者介绍区域

* 包含使用小提示区域（可折叠或列表形式）

* 添加关闭按钮

### 步骤 2: 设计关于弹窗内容模板

弹窗包含以下内容区域：

**作者介绍区域：**

* 软件名称：电子礼金簿

* 版本号：v1.10.0

* 开发者信息：

* 联系邮箱：<luochangxin@foxmail.com>

* github地址：<https://github.com/tuo21/electron-gift-book>

* 扫一扫关注微信公众号

* <公众号二维码>

**使用小提示区域：**

* 数据自动保存提示

* 快捷键说明

* 数据备份建议

* 其他实用技巧

### 步骤 3: 在主界面标题栏添加按钮

修改 `src/App.vue`：

* 在标题栏右侧（返回首页按钮旁边）添加"关于"按钮

* 使用 Element Plus 的 Button 组件

* 使用信息图标（InfoFilled 或 QuestionFilled）

### 步骤 4: 添加交互逻辑

在 `src/App.vue` 中：

* 添加 `aboutDialogVisible` 响应式变量控制弹窗显示

* 绑定按钮点击事件打开弹窗

* 导入并注册 AboutDialog 组件

## 文件变更清单

1. `src/components/AboutDialog.vue` - 新建关于弹窗组件
2. `src/App.vue` - 添加关于按钮和弹窗引用

## UI 设计参考

* 弹窗宽度：500px

* 标题：关于电子礼金簿

* 内容分区：作者信息 + 分隔线 + 使用提示

* 使用 Element Plus 的卡片或折叠面板展示提示

