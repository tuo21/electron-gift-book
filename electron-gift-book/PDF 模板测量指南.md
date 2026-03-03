# PDF 模板测量与坐标计算指南

## 一、模板规格说明

### 1.1 基本规格

- **纸张尺寸**: A4 横版 (297mm × 210mm)
- **分辨率**: 300 DPI (dots per inch)
- **像素尺寸**: 3508px × 2480px
- **色彩模式**: RGB
- **文件格式**: JPG (高质量压缩)

### 1.2 两套模板

#### 喜庆红模板
- **用途**: 婚礼、庆典等喜庆场合
- **主色调**: 中国红 (#c44a3d)
- **模板文件**: 
  - `public/templates/red/cover.jpg` - 封面
  - `public/templates/red/content.jpg` - 内页
  - `public/templates/red/statistics.jpg` - 统计页
  - `public/templates/red/backcover.jpg` - 封底

#### 肃穆灰模板
- **用途**: 葬礼、追悼会等肃穆场合
- **主色调**: 深灰色 (#4a4a4a)
- **模板文件**:
  - `public/templates/gray/cover.jpg` - 封面
  - `public/templates/gray/content.jpg` - 内页
  - `public/templates/gray/statistics.jpg` - 统计页
  - `public/templates/gray/backcover.jpg` - 封底

## 二、坐标系统说明

### 2.1 坐标系定义

```
原点 (0, 0): 页面左上角
X 轴：从左到右递增 (0 → 3508px)
Y 轴：从上到下递增 (0 → 2480px)
```

示意图：
```
(0,0) ┌─────────────────────────────────┐
      │                                  │
      │                                  │
      │         X 轴向右 →              │
      │                                  │
      │                                  │
      │    ↓                             │
      │    Y                             │
      │    轴                            │
      │    向                            │
      │    下                            │
      │                                  │
      └─────────────────────────────────┘ (3508, 2480)
```

### 2.2 区域 (Region) 定义

每个元素的位置和大小使用四元组表示：

```typescript
interface Region {
  left: number    // 距离左边的像素值
  top: number     // 距离上边的像素值
  width: number   // 区域宽度（像素）
  height: number  // 区域高度（像素）
}
```

### 2.3 坐标计算示例

**示例 1：计算封面标题位置**

从 PDF 位置信息文档中：
```javascript
cover: {
  文字内容区：width: 341px; height: 77px;
  left: 251px; top: 461px;
}
```

转换为配置：
```typescript
title: {
  region: {
    left: 251,      // 距离左边 251px
    top: 461,       // 距离上边 461px
    width: 341,     // 宽度 341px
    height: 40      // 标题高度 40px (上半部分)
  }
}
```

**示例 2：计算内页列表项位置**

列表区域：
```javascript
列表区域：{
  left: 41px;
  top: 98px;
  width: 760px;
  height: 401px;
}
```

第一列数据：
```javascript
第一列数据：{
  left: 0px;    // 相对于列表区域的左边
  top: 0px;     // 相对于列表区域的顶部
  width: 46px;
  height: 401px;
}
```

姓名区域（在第一列内）：
```javascript
姓名：{
  left: 0px;    // 相对于第一列的左边
  top: 0px;     // 相对于第一列的顶部
  width: 46px;
  height: 139px;
}
```

**绝对坐标计算**：
```
姓名的绝对 X 坐标 = 列表区域.left + 第一列.left + 姓名.left
                 = 41 + 0 + 0 = 41px

姓名的绝对 Y 坐标 = 列表区域.top + 第一列.top + 姓名.top
                 = 98 + 0 + 0 = 98px
```

## 三、模板测量方法

### 3.1 使用设计工具测量

推荐使用以下工具进行精确测量：

1. **Adobe Photoshop**
   - 打开模板图片
   - 使用标尺工具 (Ctrl+R)
   - 使用矩形选框工具测量区域

2. **Figma** (免费)
   - 导入模板图片
   - 使用 Frame 工具框选区域
   - 右侧面板查看坐标和尺寸

3. **GIMP** (免费开源)
   - 打开模板图片
   - 使用对齐工具
   - 查看状态栏的坐标信息

### 3.2 测量步骤

#### 步骤 1：确定页面尺寸

1. 打开模板图片
2. 查看图片属性：图像 → 图像大小
3. 确认尺寸为 3508px × 2480px (300 DPI)

#### 步骤 2：测量主要区域

**以封面为例**：

1. **文字内容区**
   - 使用矩形选框工具框选文字区域
   - 记录左上角坐标 (left, top)
   - 记录尺寸 (width, height)

2. **标题文字**
   - 框选标题文字区域
   - 记录坐标和尺寸
   - 测量文字高度（用于字体大小参考）

3. **日期文字**
   - 框选日期文字区域
   - 记录坐标和尺寸

#### 步骤 3：测量内页列表

1. **列表区域边界**
   - 找到列表的起始位置
   - 测量列表区域：left, top, width, height

2. **单列尺寸**
   - 测量第一列的宽度
   - 测量列与列之间的间距
   - 计算：列间距 = (总宽度 - 列宽 × 列数) ÷ (列数 - 1)

3. **列内元素**
   - 从上到下依次测量：
     - 姓名区域
     - 备注区域
     - 礼金区域
     - 支付方式区域

#### 步骤 4：测量文字样式

1. **字体大小**
   - 使用文字工具选中文字
   - 查看字体大小（像素）
   - 或使用公式估算：字体高度 ≈ 行高

2. **字体颜色**
   - 使用吸管工具吸取颜色
   - 记录 RGB 或 HEX 值

3. **字间距和行高**
   - 测量两个字符之间的距离
   - 测量两行文字基线之间的距离

### 3.3 测量数据记录表

| 页面 | 元素名称 | left | top | width | height | 备注 |
|------|---------|------|-----|-------|--------|------|
| 封面 | 文字区 | 251 | 461 | 341 | 77 | |
| 封面 | 标题 | 251 | 461 | 341 | 40 | 上半部分 |
| 封面 | 日期 | 251 | 501 | 341 | 37 | 下半部分 |
| 内页 | 页眉 | 41 | 21 | 760 | 35 | |
| 内页 | 列表区 | 41 | 98 | 760 | 401 | |
| 内页 | 第一列 | 0 | 0 | 46 | 401 | 相对列表区 |
| 内页 | 姓名 | 0 | 0 | 46 | 139 | 相对第一列 |
| ... | ... | ... | ... | ... | ... | ... |

## 四、坐标计算方法

### 4.1 相对坐标与绝对坐标

**相对坐标**：相对于父容器的坐标
**绝对坐标**：相对于页面原点的坐标

**转换公式**：
```
绝对坐标 = 父容器绝对坐标 + 相对坐标
```

**示例**：
```typescript
// 列表区域的绝对坐标
listRegion = { left: 41, top: 98, width: 760, height: 401 }

// 第一列相对于列表区域的坐标
column1Relative = { left: 0, top: 0, width: 46, height: 401 }

// 姓名相对于第一列的坐标
nameRelative = { left: 0, top: 0, width: 46, height: 139 }

// 姓名的绝对坐标
nameAbsolute = {
  left: listRegion.left + column1Relative.left + nameRelative.left = 41 + 0 + 0 = 41,
  top: listRegion.top + column1Relative.top + nameRelative.top = 98 + 0 + 0 = 98,
  width: 46,
  height: 139
}
```

### 4.2 多列坐标计算

内页有 15 列数据，每列间距 5px：

```typescript
const columnWidth = 46
const columnGap = 5
const listLeft = 41

// 计算第 n 列的 X 坐标 (n 从 0 开始)
function getColumnX(n: number): number {
  return listLeft + n * (columnWidth + columnGap)
}

// 示例：
// 第 1 列 (n=0): 41 + 0 * 51 = 41px
// 第 2 列 (n=1): 41 + 1 * 51 = 92px
// 第 3 列 (n=2): 41 + 2 * 51 = 143px
// ...
// 第 15 列 (n=14): 41 + 14 * 51 = 755px
```

### 4.3 自适应字体计算

根据文字长度自动调整字体大小：

```typescript
function getAdaptiveFontSize(
  text: string,
  maxLength: number = 3,
  maxSize: number = 110,
  minSize: number = 55
): number {
  if (!text || text.length <= maxLength) {
    return maxSize
  }
  
  const reduceSize = (text.length - maxLength) * 25
  return Math.max(minSize, maxSize - reduceSize)
}

// 示例：
getAdaptiveFontSize("张三")     // 110px (≤3 字符)
getAdaptiveFontSize("张三丰")   // 110px (=3 字符)
getAdaptiveFontSize("欧阳奋强") // 85px (4 字符，减少 25px)
getAdaptiveFontSize("亚历山大·彼得罗夫") // 55px (≥7 字符，最小值)
```

## 五、数据渲染流程

### 5.1 封面渲染

```typescript
function renderCover(appName: string, date: string) {
  const config = PDF_TEMPLATE_CONFIG.cover
  
  // 计算标题位置（绝对坐标）
  const titleX = config.title.region.left
  const titleY = config.title.region.top
  const titleWidth = config.title.region.width
  const titleHeight = config.title.region.height
  
  // 渲染标题文字
  renderText(appName, {
    x: titleX,
    y: titleY,
    width: titleWidth,
    height: titleHeight,
    style: config.title.style
  })
  
  // 计算日期位置
  const dateX = config.date.region.left
  const dateY = config.date.region.top
  
  // 渲染日期文字
  renderText(date, {
    x: dateX,
    y: dateY,
    width: config.date.region.width,
    height: config.date.region.height,
    style: config.date.style
  })
}
```

### 5.2 内页渲染

```typescript
function renderContentPage(
  records: Record[],
  pageNum: number,
  totalPages: number
) {
  const config = PDF_TEMPLATE_CONFIG.content
  
  // 渲染页眉
  renderHeader(appName, date)
  
  // 渲染列表（最多 15 条）
  records.forEach((record, index) => {
    const columnX = config.list.region.left + 
                    index * (config.list.column.width + config.list.column.gap)
    
    // 渲染姓名（竖排）
    renderVerticalText(record.guestName, {
      x: columnX + config.list.column.elements.name.left,
      y: config.list.region.top + config.list.column.elements.name.top,
      width: config.list.column.elements.name.width,
      height: config.list.column.elements.name.height,
      fontSize: getAdaptiveFontSize(record.guestName)
    })
    
    // 渲染备注
    renderText(record.remark, {
      x: columnX + config.list.column.elements.remark.left,
      y: config.list.region.top + config.list.column.elements.remark.top,
      // ...
    })
    
    // 渲染金额（竖排大写）
    const amountChinese = numberToChinese(record.amount / 100)
    renderVerticalText(amountChinese, {
      x: columnX + config.list.column.elements.amount.left,
      y: config.list.region.top + config.list.column.elements.amount.top,
      fontSize: getAdaptiveFontSize(amountChinese)
    })
    
    // 渲染物品描述（如果有）
    if (record.itemDescription) {
      renderVerticalText(record.itemDescription, {
        // ... 物品描述位置
      })
    }
    
    // 渲染支付方式和数字金额
    renderText(getPaymentTypeText(record.paymentType), {
      // ...
    })
    renderText(`¥${formatAmount(record.amount / 100)}`, {
      // ...
    })
  })
  
  // 渲染页脚
  renderFooter(pageNum, totalPages, records.length)
}
```

### 5.3 统计页渲染

```typescript
function renderStatisticsPage(totalRecords: number, totalAmount: number) {
  const config = PDF_TEMPLATE_CONFIG.statistics
  
  // 渲染标题
  renderText(config.title.content, {
    x: config.title.region.left,
    y: config.title.region.top,
    style: config.title.style
  })
  
  // 渲染统计项
  const items = [
    { label: '总人数', value: `${totalRecords} 人` },
    { label: '总金额', value: `¥${formatAmount(totalAmount / 100)}` },
    { label: '大写金额', value: numberToChinese(totalAmount / 100) }
  ]
  
  items.forEach((item, index) => {
    const y = config.content.region.top + index * 60
    renderText(`${item.label}: ${item.value}`, {
      x: config.content.region.left,
      y: y,
      style: { /* ... */ }
    })
  })
}
```

### 5.4 封底渲染

```typescript
function renderBackCover() {
  const config = PDF_TEMPLATE_CONFIG.backCover
  
  // 渲染文字 1
  renderText(config.text1.content, {
    x: config.text1.region.left,
    y: config.text1.region.top,
    width: config.text1.region.width,
    height: config.text1.region.height,
    style: config.text1.style
  })
  
  // 渲染文字 2
  renderText(config.text2.content, {
    x: config.text2.region.left,
    y: config.text2.region.top,
    style: config.text2.style
  })
}
```

## 六、PDF 体积优化方案

### 6.1 模板图片优化

1. **使用 JPEG 格式**
   - 质量设置：85%
   - 渐进式 JPEG
   - 预期大小：每张 50-100KB

2. **分辨率匹配**
   - 严格使用 300 DPI
   - 尺寸：3508px × 2480px
   - 避免过大或过小

3. **色彩优化**
   - 使用 sRGB 色彩空间
   - 减少不必要的色彩深度
   - 可使用 8-bit 色彩

### 6.2 渲染优化

1. **字体嵌入**
   - 仅嵌入使用的字体
   - 使用字体子集（subset）
   - 优先使用系统字体

2. **减少重复元素**
   - 模板图片作为背景，只加载一次
   - 文字内容动态生成
   - 使用 CSS 缓存样式

3. **PDF 生成优化**
   - 使用对象流压缩
   - 启用 JPEG 流压缩
   - 移除元数据

### 6.3 预期体积

- 模板图片：4 张 × 50KB = 200KB
- 字体文件：~500KB (可选，如使用系统字体则为 0)
- PDF 内容：~100KB
- **总计**: ~800KB (不含字体) 或 ~1.3MB (含字体)

## 七、常见问题解答

### Q1: 为什么我的 PDF 打印出来尺寸不对？

**A**: 检查以下几点：
1. 确认页面尺寸设置为 3508px × 2480px
2. 确认 DPI 设置为 300
3. 打印时选择"实际大小"，不要缩放
4. 检查 CSS 中的 `@page` 规则

### Q2: 文字位置偏移怎么办？

**A**: 
1. 重新测量模板，确认坐标准确
2. 检查是否有 margin/padding 影响
3. 确认字体是否正确加载
4. 使用浏览器的开发者工具调试

### Q3: 如何验证坐标的准确性？

**A**: 
1. 在模板图片上用设计工具画出参考线
2. 导出带参考线的图片进行对比
3. 使用半透明色块标记区域位置
4. 打印测试页进行实物验证

### Q4: 竖排文字渲染不正确？

**A**: 
1. 使用 CSS `writing-mode: vertical-rl`
2. 设置 `text-orientation: upright`
3. 调整 `letter-spacing` 控制字间距
4. 确保容器宽度足够容纳文字

## 八、工具和资源

### 8.1 推荐工具

- **设计测量**: Figma, Photoshop, GIMP
- **PDF 查看**: Adobe Acrobat, PDF-XChange Editor
- **开发调试**: Chrome DevTools, Firefox Developer Edition

### 8.2 参考文档

- PDF 位置信息：`f:\编程\电子礼金簿\V1\PDF 位置信息.js`
- 模板配置：`electron-gift-book/src/utils/pdfTemplateConfig.ts`
- Electron 实现：`electron-gift-book/electron/pdfGeneratorService.ts`

### 8.3 联系支持

如有问题，请联系：
- 微信公众号：说自
- 项目文档：`f:\编程\电子礼金簿\V1\README.md`
