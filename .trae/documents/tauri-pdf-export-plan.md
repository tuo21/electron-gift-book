# Tauri PDF 导出功能复刻计划

## 背景

当前 Tauri 版本的 PDF 导出功能使用简单的表格样式，而 Electron 版本有完整的礼金簿样式模板系统，包括：

- **封面页**：项目名称 + 日期，带背景图片
- **内容页**：每页 15 列记录，竖排文字，带背景图片
- **统计页**：总人数、总金额、大写金额
- **封底页**：品牌信息

Electron 版本使用模板图片（JPG）+ 精确定位的方式生成 PDF，而当前 Tauri 版本使用简单的 HTML 表格。

## Electron 版本实现分析

### 1. 核心架构

**文件结构：**
```
electron-gift-book/
├── electron/
│   ├── pdfGeneratorService.ts    # PDF 生成服务（核心）
│   └── pdfTemplateConfig.ts      # 模板配置文件（精确定位）
├── public/
│   ├── templates/
│   │   ├── red/                  # 红色主题模板
│   │   │   ├── cover.jpg         # 封面
│   │   │   ├── content.jpg       # 内容页
│   │   │   ├── statistics.jpg    # 统计页
│   │   │   └── backcover.jpg     # 封底
│   │   └── gray/                 # 灰色主题模板
│   └── print.html                # 打印模板 HTML
```

### 2. 关键特性

#### 2.1 模板配置系统（pdfTemplateConfig.ts）

- **页面尺寸**：3508px × 2479px（横版 A4，300 DPI）
- **精确定位**：每个元素都有精确的坐标和尺寸
- **两套主题**：红色主题和灰色主题
- **自适应字体**：根据文字长度自动调整字号

关键配置示例：
```typescript
const SCALE = 4.167  // 300 DPI 缩放系数

content: {
  list: {
    left: Math.round(41 * SCALE),
    top: Math.round(98 * SCALE),
    columnWidth: Math.round(46 * SCALE),
    columnGap: Math.round(5 * SCALE),
    columnsPerPage: 15,  // 每页 15 列
  }
}
```

#### 2.2 PDF 生成服务（pdfGeneratorService.ts）

核心流程：
1. **生成各页 HTML**：
   - `generateCoverPage()` - 封面
   - `generateContentPage()` - 内容页（支持分页）
   - `generateStatisticsPage()` - 统计页
   - `generateBackCoverPage()` - 封底

2. **使用模板图片作为背景**：
   ```typescript
   private getTemplateImagePath(type: string, theme: string): string {
     const jpgPath = path.join(this.assetsPath, 'templates', theme, `${fileName}.jpg`)
     return jpgPath.replace(/\\/g, '/')
   }
   ```

3. **创建隐藏 BrowserWindow 加载 HTML**：
   ```typescript
   const printWindow = new BrowserWindow({
     width: 1200,
     height: 800,
     show: false,
   })
   await printWindow.loadFile(tempHtmlPath)
   ```

4. **使用 printToPDF 生成 PDF**：
   ```typescript
   pdfBuffer = await printWindow.webContents.printToPDF({
     margins: { top: 0, bottom: 0, left: 0, right: 0 },
     printBackground: true,
     preferCSSPageSize: true
   })
   ```

5. **弹出保存对话框**：
   ```typescript
   const { filePath } = await dialog.showSaveDialog({...})
   fs.writeFileSync(filePath, pdfBuffer)
   ```

#### 2.3 样式特点

- **竖排文字**：使用 CSS `writing-mode: vertical-rl`
- **自适应字体**：根据文字长度动态调整字号
- **背景图片**：使用设计好的模板图片
- **精确定位**：绝对定位确保布局准确
- **字体支持**：使用"演示春风楷"等书法字体

### 3. 颜色配置

```typescript
THEME_COLORS = {
  red: {
    primary: '#c44a3d',
    accent: '#ff6666',
    text: '#ff6666',
    paper: '#f5f0e8',
    border: '#d4a574'
  },
  gray: {
    primary: '#4a4a4a',
    accent: '#666666',
    text: '#333333',
    paper: '#e8e8e8',
    border: '#999999'
  }
}
```

## Tauri 版本复刻方案

### 方案设计原则

1. **保持 Electron 版本的视觉效果**：使用相同的模板图片和布局
2. **适配 Tauri 架构**：使用浏览器打印 API，不使用 Electron 的 printToPDF
3. **保留两套主题**：红色和灰色主题
4. **使用相同字体**：确保中文字体效果一致

### 实现步骤

#### 步骤 1：复制模板资源文件

**目标位置**：`electron-gift-book/public/templates/`

**需要复制的文件**：
```
public/templates/
├── red/
│   ├── cover.jpg
│   ├── content.jpg
│   ├── statistics.jpg
│   └── backcover.jpg
├── gray/
│   ├── cover.jpg
│   ├── content.jpg
│   ├── statistics.jpg
│   └── backcover.jpg
└── README.md
```

**来源**：`electron-gift-book/electron-gift-book/public/templates/`

#### 步骤 2：复刻模板配置

**目标文件**：`electron-gift-book/src/utils/pdfTemplateConfig.ts`（新建）

**内容**：直接复制 `electron/pdfTemplateConfig.ts` 的完整配置

**关键点**：
- 保持所有定位信息不变
- 保持缩放系数 `SCALE = 4.167`
- 保持两套主题颜色配置

#### 步骤 3：重写 PDF 生成 HTML

**目标文件**：`electron-gift-book/src/utils/export.ts`

**修改内容**：重写 `generatePrintHTML()` 函数

**新实现要点**：

1. **页面结构**：
   ```html
   <div class="pdf-container">
     <div class="page cover-page">封面内容</div>
     <div class="page content-page">内容页 1</div>
     <div class="page content-page">内容页 2</div>
     <div class="page statistics-page">统计页</div>
     <div class="page backcover-page">封底</div>
   </div>
   ```

2. **封面页生成**：
   ```typescript
   function generateCoverPage(appName: string, exportDate: string, theme: string): string {
     const config = PDF_TEMPLATE_CONFIG.cover
     const bgImage = getTemplateImagePath('cover', theme)
     return `
       <div class="page cover-page" style="background-image: url('${bgImage}')">
         <div class="cover-title">${appName}</div>
         <div class="cover-date">${exportDate}</div>
       </div>
     `
   }
   ```

3. **内容页生成**（核心）：
   - 每页 15 列记录
   - 竖排文字布局
   - 精确定位每个字段
   - 自适应字体大小
   - 页眉、页脚信息

4. **统计页生成**：
   - 总人数
   - 总金额（数字 + 大写）

5. **封底页生成**：
   - 品牌标语
   - 公众号信息

#### 步骤 4：实现辅助函数

**需要实现的函数**：

1. **数字转大写**：
   ```typescript
   function numberToChinese(amount: number): string
   function integerToChinese(num: number): string
   function segmentToChinese(num: number): string
   ```

2. **格式化金额**：
   ```typescript
   function formatAmount(amount: number): string
   ```

3. **支付方式转换**：
   ```typescript
   function getPaymentTypeText(type: number): string
   ```

4. **自适应字体**：
   ```typescript
   function getAdaptiveFontSize(text: string, isName: boolean, hasItem: boolean): number
   ```

5. **模板图片路径**：
   ```typescript
   function getTemplateImagePath(type: string, theme: string): string
   ```

#### 步骤 5：CSS 样式复刻

**关键样式**：

```css
@page {
  size: 842px 595px; /* A4 横向 */
  margin: 0;
}

.page {
  width: 842px;
  height: 595px;
  position: relative;
  background-size: cover;
  background-position: center;
  page-break-after: always;
}

.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 8px;
}

.name-text {
  font-size: 110px;
  font-family: '演示春风楷', 'KaiTi', serif;
}

.amount-text {
  font-size: 110px;
  font-family: '演示春风楷', 'KaiTi', serif;
}
```

#### 步骤 6：适配 Tauri 打印

**修改 `exportToPDF()` 函数**：

```typescript
export async function exportToPDF(
  records: Record[],
  eventName: string = '电子礼金簿',
  theme: 'red' | 'gray' = 'red'
): Promise<void> {
  const eventDate = getEventDate(records)
  const exportDate = formatDate(eventDate)
  const filename = generateExportFileName(eventName, eventDate)

  // 生成完整的 HTML 内容（包含所有页面）
  const printContent = generateFullPDFHTML(records, eventName, exportDate, theme)
  
  // 保存当前页面状态
  const originalContent = document.body.innerHTML
  const originalTitle = document.title
  
  try {
    // 替换页面内容
    document.body.innerHTML = printContent
    document.title = `${eventName} - 礼金记录`
    
    // 等待字体加载完成
    await document.fonts.ready
    
    // 调用打印
    window.print()
    
    // 恢复原始内容
    document.body.innerHTML = originalContent
    document.title = originalTitle
    
    // 重新加载页面以恢复事件绑定
    window.location.reload()
  } catch (error) {
    console.error('导出 PDF 失败:', error)
    throw error
  }
}
```

#### 步骤 7：测试与优化

**测试项**：
1. 红色主题导出
2. 灰色主题导出
3. 不同数量记录的分页
4. 长姓名、长金额的显示
5. 打印预览效果
6. PDF 保存功能

**优化方向**：
- 字体加载优化
- 打印边距调整
- 颜色准确性
- 文字对齐精度

## 技术难点与解决方案

### 难点 1：模板图片路径

**问题**：Tauri 中如何引用本地图片资源？

**解决方案**：
- 使用 `public` 目录存放模板图片
- 使用相对路径引用：`/templates/red/cover.jpg`
- 确保构建时图片被正确复制

### 难点 2：字体支持

**问题**：书法字体在打印时可能不可用

**解决方案**：
- 在 `public/fonts/` 目录放置字体文件
- 使用 `@font-face` 加载本地字体
- 提供备用字体：`'演示春风楷', 'KaiTi', 'STKaiti', serif`

### 难点 3：打印边距

**问题**：浏览器打印可能有默认边距

**解决方案**：
```css
@page {
  margin: 0;
  size: 842px 595px;
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
}
```

### 难点 4：颜色准确性

**问题**：打印时颜色可能被浏览器调整

**解决方案**：
```css
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

## 预期效果

完成后的 Tauri PDF 导出功能将：

1. ✅ **视觉效果一致**：与 Electron 版本完全相同的布局和样式
2. ✅ **两套主题**：红色和灰色主题可选
3. ✅ **完整结构**：封面 + 内容页 + 统计页 + 封底
4. ✅ **竖排文字**：传统礼金簿样式
5. ✅ **自适应字体**：根据内容长度自动调整
6. ✅ **分页准确**：每页 15 列，自动分页
7. ✅ **保存对话框**：Tauri 原生保存对话框

## 文件清单

### 需要新建的文件

1. `electron-gift-book/src/utils/pdfTemplateConfig.ts` - 模板配置
2. `electron-gift-book/public/fonts/XuandongKaishu.ttf` - 书法字体（可选）

### 需要修改的文件

1. `electron-gift-book/src/utils/export.ts` - 重写 PDF 生成逻辑

### 需要复制的资源

1. `electron-gift-book/public/templates/` - 模板图片目录

## 时间估算

- 步骤 1：复制资源文件 - 5 分钟
- 步骤 2：复刻模板配置 - 10 分钟
- 步骤 3-4：重写 HTML 生成和辅助函数 - 60 分钟
- 步骤 5：CSS 样式 - 30 分钟
- 步骤 6：Tauri 适配 - 15 分钟
- 步骤 7：测试优化 - 30 分钟

**总计**：约 2.5 小时

## 注意事项

1. **不要删除现有代码**：保留 Electron 版本的代码作为参考
2. **保持兼容性**：确保不影响 Excel 导出功能
3. **测试两种主题**：红色和灰色主题都要测试
4. **验证分页**：确保记录正确分页，每页 15 列
5. **字体文件**：如果字体文件太大，考虑使用系统字体替代
