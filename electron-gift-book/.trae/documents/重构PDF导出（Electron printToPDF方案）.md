## 方案一（Electron printToPDF）详细实施计划

### 核心思路
使用 Electron 的 `webContents.printToPDF()` 方法，创建一个隐藏的打印窗口，加载专门设计的打印页面，生成原生文字的 PDF。

### 技术架构
```
主进程 (main.ts)
    ↓ IPC 通信
渲染进程 (App.vue) 
    ↓ 发送数据
打印窗口 (print.html) - 独立页面，专门用于 PDF 渲染
    ↓ printToPDF
PDF 文件
```

### 实现步骤

**步骤 1：创建打印页面**
- 创建 `public/print.html` - 打印专用页面
- 创建 `src/styles/print.css` - 打印样式（与 theme.css 共享变量）
- 设计礼金簿打印布局（竖排文字、宣纸背景、固定列数）

**步骤 2：主进程添加 PDF 生成功能**
- 在 `electron/main.ts` 中添加 `printToPDF` 处理
- 创建隐藏窗口加载打印页面
- 等待页面渲染完成后生成 PDF
- 保存文件到用户选择的路径

**步骤 3：修改前端导出逻辑**
- 修改 `src/utils/export.ts`，移除 html2canvas + jsPDF
- 改为通过 IPC 调用主进程的 PDF 生成功能
- 传递记录数据和主题配置

**步骤 4：主题系统整合**
- 打印样式使用与主界面相同的 CSS 变量
- 添加 `@media print` 媒体查询优化打印效果
- 确保一套主题同时满足屏幕显示和打印需求

**步骤 5：分页和布局优化**
- 使用 CSS 分页属性控制每页显示 15 列
- 添加页眉（应用名称、导出日期）
- 添加页脚（页码、记录总数）

**步骤 6：测试和优化**
- 测试中文竖排显示
- 测试分页效果
- 测试不同主题下的打印效果