## 导出功能实现计划

### 功能需求
1. **Excel (xlsx) 导出**：表格形式导出所有记录数据
2. **PDF 导出**：横向A4尺寸，布局和主题与主内容区礼金簿一致（竖排文字、宣纸背景等）

### 技术方案

**需要安装的依赖：**
- `xlsx` - 用于 Excel 导出
- `jspdf` + `html2canvas` - 用于 PDF 导出（将 DOM 渲染为图片再生成 PDF）

**实现步骤：**

**步骤 1：安装依赖**
- 安装 `xlsx`、`jspdf`、`html2canvas`

**步骤 2：启用导出按钮**
- 在 [App.vue](file:///f:/编程/电子礼金簿/V1/electron-gift-book/src/App.vue#L325-329) 中取消注释导出按钮

**步骤 3：创建导出工具函数**
- 创建 `src/utils/export.ts` 文件
- 实现 `exportToExcel(records)` 函数
- 实现 `exportToPDF(records)` 函数

**步骤 4：实现 Excel 导出**
- 使用 `xlsx` 库生成表格
- 包含字段：姓名、金额（数字）、金额（大写）、物品、支付方式、备注、创建时间

**步骤 5：实现 PDF 导出**
- 创建一个隐藏的 DOM 元素，模拟礼金簿布局
- 使用竖排文字样式（writing-mode: vertical-rl）
- 添加宣纸背景
- 使用 `html2canvas` 将 DOM 转为图片
- 使用 `jspdf` 生成横向 A4 PDF

**步骤 6：添加导出弹窗**
- 点击导出按钮弹出选择对话框（Excel / PDF）
- 处理导出逻辑

**步骤 7：添加样式**
- 导出弹窗样式
- PDF 渲染用的隐藏容器样式