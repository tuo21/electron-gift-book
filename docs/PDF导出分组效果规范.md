# PDF 导出分组效果规范文档

> **目标**：详细描述桌面端（electron-gift-book）PDF 导出中分组相关的布局、样式和数据处理逻辑，供小程序端还原实现。
>
> **参考代码**：`src/utils/pdfExport.ts`

---

## 一、全局布局参数

### 1.1 页面尺寸

| 参数 | 值 | 说明 |
|------|-----|------|
| `SCALE` | 4.167 | 全局缩放因子，所有坐标都乘以这个值 |
| 横版页面宽度 | `842 * SCALE` ≈ 3510 | A4 横向宽度（点） |
| 横版页面高度 | `595 * SCALE` ≈ 2470 | A4 横向高度（点） |
| 竖版页面宽度 | `595 * SCALE` ≈ 2470 | A4 纵向宽度（点） |
| 竖版页面高度 | `842 * SCALE` ≈ 3510 | A4 纵向高度（点） |

### 1.2 列表区域参数

**横版布局**：

| 参数 | 值（乘以 SCALE） | 说明 |
|------|------------------|------|
| `listStartX` | 41 | 列表起始 X 坐标 |
| `listStartY` | 98 | 列表起始 Y 坐标（姓名顶端位置） |
| `columnWidth` | 46 | 每列宽度 |
| `columnGap` | 5 | 列间距 |

**竖版布局**：

| 参数 | 值（乘以 SCALE） | 说明 |
|------|------------------|------|
| `listStartX` | 66 | 列表起始 X 坐标 |
| `listStartY` | 49 | 列表起始 Y 坐标（姓名顶端位置） |
| `columnWidth` | 46 | 每列宽度 |
| `columnGap` | 0 | 列间距（竖版无间隙） |

### 1.3 列位置计算

```javascript
// 第 index 列的中心 X 坐标
const x = listStartX + index * (columnWidth + columnGap) + columnWidth / 2

// 第 index 列的左边缘
const leftEdge = listStartX + index * (columnWidth + columnGap)

// 第 index 列的右边缘
const rightEdge = leftEdge + columnWidth
```

---

## 二、分组角色处理逻辑

### 2.1 角色类型

| groupRole | 处理方式 | 是否占用一列 |
|-----------|----------|-------------|
| `'start'` | 分组开始标记 | 是 |
| `'end'` | 分组结束标记 | 是 |
| `'summary'` | 小组小计（核心） | 是 |
| `'member'` | 普通组员记录 | 是 |
| `null/undefined` | 非分组记录 | 是 |

### 2.2 分组识别

在渲染列表前，需要预先计算每个小组的第一个组员 ID（用于添加红色左括号）：

```javascript
const groupFirstMemberIds = new Set<number>()
const seenGroups = new Set<number>()

records.forEach(r => {
  if (r.groupRole === 'member' && r.groupId && !seenGroups.has(r.groupId)) {
    seenGroups.add(r.groupId)
    if (r.id) groupFirstMemberIds.add(r.id)
  }
})
```

---

## 三、分组开始标记（groupRole = 'start'）

### 3.1 横版布局

**位置**：单独占用一列，与其他记录同高

**内容**：
- 文字："分组开始"
- 字体：`XuandongKaishu`（玄冬楷书）
- 字号：`24 * SCALE`
- 颜色：棕色 `rgb(139, 90, 43)`
- 对齐：水平居中

**边框**：棕色粗边框（线宽 `2 * SCALE`），绘制三条边
- 上边框：`(x - columnWidth/2, 30) → (x + columnWidth/2, 30)` （相对于 listStartY）
- 下边框：`(x - columnWidth/2, 140) → (x + columnWidth/2, 140)` （相对于 listStartY）
- 左边框：`(x - columnWidth/2, 30) → (x - columnWidth/2, 140)` （相对于 listStartY）

**效果**：左侧和上下有边框，像一个开口朝右的方括号

### 3.2 竖版布局

**内容**：同上

**边框位置**：
- 上边框：`(x - columnWidth/2, 40) → (x + columnWidth/2, 40)` （相对于 listStartY）
- 下边框：`(x - columnWidth/2, 200) → (x + columnWidth/2, 200)` （相对于 listStartY）
- 左边框：`(x - columnWidth/2, 40) → (x - columnWidth/2, 200)` （相对于 listStartY）

---

## 四、分组结束标记（groupRole = 'end'）

### 4.1 横版布局

**位置**：单独占用一列

**内容**：
- 文字："分组结束"
- 字体：`XuandongKaishu`
- 字号：`24 * SCALE`
- 颜色：棕色 `rgb(139, 90, 43)`
- 对齐：水平居中

**边框**：棕色粗边框（线宽 `2 * SCALE`），绘制三条边
- 上边框：`(x - columnWidth/2, 30) → (x + columnWidth/2, 30)`
- 下边框：`(x - columnWidth/2, 140) → (x + columnWidth/2, 140)`
- 右边框：`(x + columnWidth/2, 30) → (x + columnWidth/2, 140)`

**效果**：右侧和上下有边框，像一个开口朝左的方括号

### 4.2 竖版布局

**边框位置**：
- 上边框：`(x - columnWidth/2, 40) → (x + columnWidth/2, 40)`
- 下边框：`(x - columnWidth/2, 200) → (x + columnWidth/2, 200)`
- 右边框：`(x + columnWidth/2, 40) → (x + columnWidth/2, 200)`

---

## 五、小组小计（groupRole = 'summary'）—— 核心样式

这是分组功能的核心展示，需要精确还原布局。

### 5.1 布局结构图

```
┌─────────────────────────────────────────────────────────┐
│                     列表区域                            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   张三   │  │   小计   │  │ （红色   │              │
│  │  500.00  │  │  总账    │  │   ）    │ ← 右括号     │
│  │   现金   │  │ 1200.00  │  └──────────┘              │
│  └──────────┘  │  开支    │                             │
│                │  500.00  │                             │
│                │  结余    │                             │
│                │  700.00  │                             │
│                └──────────┘                             │
│                                                         │
│  注：小计列无上下边框，右侧红色"）"与姓名顶端对齐        │
│      总账和开支并列左右两列，结余在下方居中              │
└─────────────────────────────────────────────────────────┘
```

### 5.2 红色右括号

**位置**：在小计列的右侧，与姓名顶端对齐

| 参数 | 横版值 | 竖版值 |
|------|--------|--------|
| X 坐标 | `x + columnWidth/2 + bracketSize/2` | `x + columnWidth/2 + bracketSize/2` |
| Y 坐标 | `listStartY + 40 * SCALE` | `listStartY + 42 * SCALE` |
| bracketSize | `28 * SCALE` | `28 * SCALE` |
| 字体 | `XuandongKaishu` | `XuandongKaishu` |
| 字号 | `28 * SCALE` | `28 * SCALE` |
| 颜色 | 红色 `rgb(255, 0, 0)` | 红色 `rgb(255, 0, 0)` |
| 对齐 | `center` | `center` |

### 5.3 标题"小计"

**位置**：在姓名位置上方（上移一个姓名字号的距离）

| 参数 | 横版值 | 竖版值 |
|------|--------|--------|
| X 坐标 | `x` | `x` |
| Y 坐标 | `listStartY + 40 * SCALE - nameFontSizeH` | `listStartY + 42 * SCALE - 32 * SCALE` |
| 字体 | `XuandongKaishu` | `XuandongKaishu` |
| 字号 | `10 * SCALE` | `10 * SCALE` |
| 颜色 | 棕色 `rgb(139, 90, 43)` | 棕色 `rgb(139, 90, 43)` |
| 对齐 | `center` | `center` |

> **nameFontSizeH 计算**：`getAdaptiveFontSize('测试', 3, 34, 10) * SCALE`

### 5.4 总账和开支（并列两列）

**布局**：总账在左，开支在右，各自独立竖排

| 参数 | 值 |
|------|-----|
| 左右偏移量 | `columnWidth / 4` |
| 总账 X 坐标 | `x - columnWidth/4` |
| 开支 X 坐标 | `x + columnWidth/4` |

**标签样式**：

| 参数 | 值 |
|------|-----|
| 字体 | `ZhiSong`（霞鹜新致宋） |
| 字号 | `10 * SCALE` |
| 颜色 | 灰色 `rgb(102, 102, 102)` |
| 对齐 | `center` |

**数值样式**：

| 参数 | 总账 | 开支 |
|------|------|------|
| 字体 | `ZhiSong` | `ZhiSong` |
| 字号 | `14 * SCALE` | `14 * SCALE` |
| 颜色 | 黑色 `rgb(0, 0, 0)` | 红色 `rgb(196, 74, 61)` |
| 对齐 | `center` | `center` |

**竖排实现**：将金额字符串拆分为单个字符，逐个绘制

```javascript
const totalChars = formatAmount(record.groupTotal).split('')
totalChars.forEach((char, index) => {
  pdf.text(char, totalX, currentY + index * charHeight, { align: 'center' })
})
```

| 参数 | 值 |
|------|-----|
| charHeight | `valueFontSize * 1.2` = `14 * SCALE * 1.2` |
| 标签与数值间距 | `10 * SCALE` |

### 5.5 结余（下方居中）

**位置**：在总账/开支数值下方，水平居中

| 参数 | 值 |
|------|-----|
| X 坐标 | `x`（列中心） |
| Y 坐标 | 当前 Y + 最长数值高度 + lineGap |

**标签样式**：同上（灰色 `ZhiSong`，`10 * SCALE`）

**数值样式**：同总账（黑色 `ZhiSong`，`14 * SCALE`），竖排

**间距参数**：

| 参数 | 横版值 | 竖版值 |
|------|--------|--------|
| lineGap | `15 * SCALE` | `18 * SCALE` |

### 5.6 横版小计完整坐标计算

```javascript
const bracketSize = Math.round(28 * SCALE)

// 右括号
pdf.text('）', x + columnWidth/2 + bracketSize/2, listStartY + 40 * SCALE, { align: 'center' })

// 标题"小计"
const nameFontSizeH = getAdaptiveFontSize('测试', 3, 34, 10) * SCALE
const startY = listStartY + 40 * SCALE - nameFontSizeH
pdf.text('小计', x, startY, { align: 'center' })

// 总账和开支偏移
const subColOffset = Math.round(columnWidth / 4)
const totalX = x - subColOffset
const expenseX = x + subColOffset

let currentY = startY + 18 * SCALE

// 总账标签
pdf.text('总账', totalX, currentY, { align: 'center' })

// 总账数值（竖排）
currentY += 10 * SCALE
const totalChars = formatAmount(record.groupTotal).split('')
totalChars.forEach((char, index) => {
  pdf.text(char, totalX, currentY + index * charHeight, { align: 'center' })
})

// 开支标签（与总账标签同高度）
pdf.text('开支', expenseX, currentY - 10 * SCALE, { align: 'center' })

// 开支数值（竖排，与总账数值同高度）
const expenseChars = formatAmount(record.groupExpense).split('')
expenseChars.forEach((char, index) => {
  pdf.text(char, expenseX, currentY + index * charHeight, { align: 'center' })
})

// 结余位置（取总账和开支中较长的一个）
const totalCharsLen = totalChars.length
const expenseCharsLen = expenseChars.length
currentY += Math.max(totalCharsLen, expenseCharsLen) * charHeight + lineGap

// 结余标签
pdf.text('结余', x, currentY, { align: 'center' })

// 结余数值（竖排）
currentY += 10 * SCALE
const balanceChars = formatAmount(record.groupBalance).split('')
balanceChars.forEach((char, index) => {
  pdf.text(char, x, currentY + index * charHeight, { align: 'center' })
})
```

---

## 六、分组成员标记（groupRole = 'member'）

### 6.1 红色左括号

**位置**：仅在小组的第一个组员左侧显示

| 参数 | 横版值 | 竖版值 |
|------|--------|--------|
| 判断条件 | `record.id && groupFirstMemberIds.has(record.id)` | 同上 |
| X 坐标 | `x - columnWidth/2 - bracketSize/2` | `x - columnWidth/2 - bracketSize/2` |
| Y 坐标 | `listStartY + 40 * SCALE` | `listStartY + 42 * SCALE` |
| bracketSize | `28 * SCALE` | `28 * SCALE` |
| 字体 | `XuandongKaishu` | `XuandongKaishu` |
| 字号 | `28 * SCALE` | `28 * SCALE` |
| 颜色 | 红色 `rgb(255, 0, 0)` | 红色 `rgb(255, 0, 0)` |
| 对齐 | `center` | `center` |

### 6.2 普通组员内容

分组成员的姓名、金额、备注等内容与非分组记录完全相同，没有额外标记。

---

## 七、统计页面分组数据处理

### 7.1 统计项

统计页面包含以下内容（按顺序）：

| 序号 | 标签 | 值计算方式 |
|------|------|-----------|
| 1 | 总人数 | `records.filter(r => !r.groupRole \|\| r.groupRole === 'member').length` |
| 2 | 现金 | 过滤 `paymentType === 0` 且非小计的记录，求和 |
| 3 | 微信 | 过滤 `paymentType === 1` 且非小计的记录，求和 |
| 4 | 内收 | 过滤 `paymentType === 2` 且非小计的记录，求和 |
| 5 | 共计 | 所有非小计记录的金额之和（`totalAmount`） |
| 6 | 支出 | 所有 `groupRole === 'summary'` 记录的 `groupExpense` 之和 |
| 7 | 结余 | `totalAmount - 总支出`（不是各小组结余之和） |
| 8 | 大写金额 | `numberToChinese(totalAmount)` |

### 7.2 关键规则

1. **排除小计记录**：统计人数和金额时，必须排除 `groupRole === 'summary'` 的记录
2. **支出计算**：只从 summary 记录的 `groupExpense` 字段累加
3. **结余计算**：`总金额 - 总支出`，不是各小组 `groupBalance` 的累加

### 7.3 数据准备代码

```javascript
const paymentTypes = [
  { type: 0, name: '现金' },
  { type: 1, name: '微信' },
  { type: 2, name: '内收' }
]

// 支付方式统计（排除小计记录）
const paymentStats = paymentTypes.map(({ type, name }) => {
  const typeRecords = records.filter(r => r.paymentType === type && (!r.groupRole || r.groupRole === 'member'))
  const typeAmount = typeRecords.reduce((sum, r) => sum + r.amount, 0)
  return { name, count: typeRecords.length, amount: typeAmount }
})

// 分组统计
const summaryRecords = records.filter(r => r.groupRole === 'summary')
const totalGroupExpense = summaryRecords.reduce((sum, r) => sum + (r.groupExpense || 0), 0)
const totalGroupBalance = totalAmount - totalGroupExpense  // 关键：总金额-总支出

// 统计行
const lines = [
  { label: '总人数：', value: `${records.filter(r => !r.groupRole || r.groupRole === 'member').length}人` },
  ...paymentStats.map(stat => ({
    label: `${stat.name}：`,
    value: `${formatAmount(stat.amount)}元（${stat.count}人）`
  })),
  { label: '共计：', value: `${formatAmount(totalAmount)}元` },
  { label: '支出：', value: `${formatAmount(totalGroupExpense)}元` },
  { label: '结余：', value: `${formatAmount(totalGroupBalance)}元` },
  { label: '', value: numberToChinese(totalAmount) }
]
```

---

## 八、格式工具函数

### 8.1 formatAmount

```javascript
export const formatAmount = (amount: number | string): string => {
  if (typeof amount === 'string') {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    amount = num;
  }
  if (isNaN(amount)) return '0.00';
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
```

**说明**：将金额格式化为 `1,234.56` 格式，保留两位小数，千分位用逗号分隔。

### 8.2 numberToChinese

```javascript
export class AmountConverter {
  private static digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  private static units = ['', '拾', '佰', '仟'];
  private static bigUnits = ['', '万', '亿'];

  public static toChinese(amount: number | string): string {
    if (typeof amount === 'string') {
      const num = parseFloat(amount);
      if (isNaN(num)) return '';
      amount = num;
    }
    if (isNaN(amount)) return '';
    if (amount < 0) return '';
    if (amount > 1e15) return '金额过大';
    if (amount === 0) return '零元';
    
    let integerPart = Math.floor(amount);
    let decimalPart = Math.round((amount - integerPart) * 100);
    
    let result = '';
    if (integerPart > 0) {
      result = this.convertInteger(integerPart);
    }
    if (decimalPart > 0) {
      result += this.convertDecimal(decimalPart);
    } else {
      result += '元';
    }
    
    return result;
  }

  private static convertInteger(num: number): string {
    let result = '';
    let bigUnitIndex = 0;
    let prevSectionHadContent = false;
    
    while (num > 0) {
      const section = num % 10000;
      if (section > 0) {
        const sectionStr = this.convertSection(section);
        if (bigUnitIndex > 0 && prevSectionHadContent) {
          if (section < 1000) {
            result = '零' + result;
          }
        }
        result = sectionStr + this.bigUnits[bigUnitIndex] + result;
        prevSectionHadContent = true;
      } else {
        prevSectionHadContent = false;
      }
      num = Math.floor(num / 10000);
      bigUnitIndex++;
    }
    return result;
  }

  private static convertSection(num: number): string {
    let result = '';
    let unitIndex = 0;
    let zeroFlag = false;
    let hasNonZero = false;
    
    while (num > 0) {
      const digit = num % 10;
      if (digit === 0) {
        if (hasNonZero) {
          zeroFlag = true;
        }
      } else {
        if (zeroFlag) {
          result = '零' + result;
          zeroFlag = false;
        }
        result = this.digits[digit] + this.units[unitIndex] + result;
        hasNonZero = true;
      }
      num = Math.floor(num / 10);
      unitIndex++;
    }
    return result;
  }

  private static convertDecimal(num: number): string {
    if (num === 0) return '';
    const jiao = Math.floor(num / 10);
    const fen = num % 10;
    let result = '元';
    if (jiao > 0) {
      result += this.digits[jiao] + '角';
    }
    if (fen > 0) {
      result += this.digits[fen] + '分';
    }
    return result;
  }
}

export const numberToChinese = (amount: number | string): string => AmountConverter.toChinese(amount);
```

**说明**：将数字金额转换为中文大写，如 `1234.56` → `壹仟贰佰叁拾肆元伍角陆分`。

### 8.3 getAdaptiveFontSize

```javascript
export function getAdaptiveFontSize(
  text: string,
  maxLength: number = 3,
  maxSize: number = 28,
  minSize: number = 16
): number {
  if (!text || text.length <= maxLength) {
    return maxSize
  }
  const reduceSize = (text.length - maxLength) * 6
  return Math.max(minSize, maxSize - reduceSize)
}
```

**说明**：根据文字长度计算自适应字号。超过 `maxLength` 后，每增加一个字符缩小 6 号，最小不低于 `minSize`。

**PDF 中实际使用的参数**：
- 姓名：`getAdaptiveFontSize(text, 3, 34, 10)`
- 金额：`getAdaptiveFontSize(text, 3, 34, 10)`（无物品描述时）或 `getAdaptiveFontSize(text, 2, 34, 10)`（有物品描述时）

---

## 九、分页逻辑

### 9.1 分页规则

**每页列数**：
- 横版布局：15 列/页
- 竖版布局：10 列/页

**分页方式**：按记录顺序平均分配，不考虑分组边界。即分组可能跨越多页。

```javascript
const columnsPerPage = layout === 'h' ? 15 : 10
const totalContentPages = Math.ceil(records.length / columnsPerPage)

for (let i = 0; i < totalContentPages; i++) {
  const startIdx = i * columnsPerPage
  const endIdx = Math.min(startIdx + columnsPerPage, records.length)
  const pageRecords = records.slice(startIdx, endIdx)
  // ... 生成页面
}
```

### 9.2 本页小计计算

**当前实现**：本页小计 = 当前页所有记录的 `amount` 字段之和（不区分分组角色）

```javascript
const pageAmount = pageRecords.reduce((sum, r) => sum + r.amount, 0)
```

**显示位置**：页脚右侧

**格式**：`本页小计：¥1,234.56`

**注意**：当前实现**没有排除小组内成员的金额**，即小组内成员的金额会被重复计算（既在小组小计中，也在本页小计中）。如果需要修改此逻辑，应改为：

```javascript
// 排除分组内成员的金额（因为已有小组小计）
const pageAmount = pageRecords.reduce((sum, r) => {
  if (r.groupRole === 'member') return sum  // 跳过分组内成员
  return sum + r.amount
}, 0)
```

### 9.3 分组跨页处理

**当前实现**：分组标记（start/end/summary）和成员按顺序分布在各页，没有特殊处理。

**可能出现的情况**：
- `start` 在第 N 页，`member` 和 `summary` 在第 N+1 页
- `member` 分布在第 N 页和第 N+1 页
- `summary` 和 `end` 在不同页

**建议改进**：如果需要保持分组完整性，可以在分页时检测分组边界，将完整分组放在同一页。但当前版本未实现此逻辑。

---

## 十、字体资源

### 10.1 使用的字体

| 字体名称 | 用途 | 文件路径 |
|----------|------|----------|
| `XuandongKaishu` | 姓名、标题、小计标题、括号 | `/fonts/XuandongKaishu.ttf` |
| `ZhiSong` | 金额数字、标签、统计文字 | `/fonts/LXGWNeoZhiSongPlus.ttf` |
| `KaiTi` | 备注、物品描述 | `/fonts/gkai00mp.ttf` |

### 10.2 字体加载方式

```javascript
async function loadAllFonts(): Promise<LoadedFonts> {
  const [xuandong, chunfeng, zhisong, kaiti] = await Promise.all([
    loadFontAsBase64('/fonts/XuandongKaishu.ttf'),
    loadFontAsBase64('/fonts/演示春风楷.ttf'),
    loadFontAsBase64('/fonts/LXGWNeoZhiSongPlus.ttf'),
    loadFontAsBase64('/fonts/gkai00mp.ttf')
  ])

  return {
    XuandongKaishu: xuandong || '',
    ChunfengKai: chunfeng || '',
    ZhiSong: zhisong || '',
    KaiTi: kaiti || ''
  }
}

function setFont(pdf, fonts, fontName) {
  // 根据字体名称设置 jsPDF 字体
  // 字体需要预先通过 pdf.addFont() 注册
}
```

---

## 十一、布局示意图

### 11.1 横版页面分组效果

```
┌─────────────────────────────────────────────────────────────────────┐
│  礼金簿标题                        日期                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │（    │  │ 张   │  │ 李   │  │ 小   │  │ 王   │  │ 赵   │       │
│  │   ） │  │ 三   │  │ 四   │  │ 计   │  │ 五   │  │ 六   │       │
│  └──────┘  │500.00│  │300.00│  │1200  │  │400.00│  │600.00│       │
│            │ 现金 │  │ 微信 │  │500开支│  │ 现金 │  │ 微信 │       │
│  组1开始  │      │  │      │  │700结余│  │      │  │      │ 组1结束│
│  ┌──────┐  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  ┌───┐│
│  │ 分   │                                                   │ 分 ││
│  │ 组   │                                                   │ 组 ││
│  │ 开   │                                                   │ 结 ││
│  │ 始   │                                                   │ 束 ││
│  └──────┘                                                   └───┘│
│     ↑                                                             │
│  左+上+下边框                                                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  统计信息：总人数、现金、微信、内收、共计、支出、结余、大写金额        │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 小计列内部布局

```
┌─────────────────────────────────────────────────────────┐
│                         ↑                              │
│                      红色"）"                          │
│                         │                              │
│                    姓名位置上方                         │
│                         ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                     小计                         │   │ ← 棕色小字号标题
│  │                                                 │   │
│  │    ┌─────────────┐    ┌─────────────┐           │   │
│  │    │    总账     │    │    开支     │           │   │ ← 灰色标签
│  │    │             │    │             │           │   │
│  │    │    1200     │    │     500     │           │   │ ← 数值竖排
│  │    │    .00      │    │     .00     │           │   │   总账黑色/开支红色
│  │    └─────────────┘    └─────────────┘           │   │
│  │                                                 │   │
│  │              ┌─────────────┐                    │   │
│  │              │    结余     │                    │   │ ← 灰色标签
│  │              │             │                    │   │
│  │              │     700     │                    │   │ ← 数值竖排（黑色）
│  │              │     .00     │                    │   │
│  │              └─────────────┘                    │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↑                              │
│                     无上下边框                          │
└─────────────────────────────────────────────────────────┘
```

---

## 十二、关键数据结构

### 12.1 Record 接口（分组相关字段）

```typescript
interface Record {
  id?: number
  guestName: string
  amount: number
  paymentType: number           // 0=现金, 1=微信, 2=内收
  groupId?: number              // 分组 ID
  groupRole?: 'start' | 'end' | 'member' | 'summary'
  groupTotal?: number           // 小组总账（仅 summary）
  groupExpense?: number         // 小组开支（仅 summary）
  groupBalance?: number         // 小组结余（仅 summary）
}
```

### 12.2 记录排序

记录按 `createTime` 排序，分组记录（start、member、summary、end）按创建顺序排列在列表中。

---

## 十三、小程序端实现注意事项

1. **字体兼容性**：小程序 PDF 导出使用 puppeteer 渲染 HTML，需确保字体文件可访问
2. **缩放因子**：SCALE = 4.167 是固定值，所有坐标必须乘以这个值
3. **竖排文字**：通过将字符串拆分为单个字符，逐个绘制实现竖排
4. **括号位置**：红色括号使用 `XuandongKaishu` 字体，位置在列边缘外侧半个字号距离
5. **统计逻辑**：必须排除 summary 记录，支出从 groupExpense 累加，结余 = 总金额 - 总支出
6. **边框绘制**：start/end 标记的边框只绘制三条边，summary 无任何边框
7. **自适应字号**：姓名和金额使用 `getAdaptiveFontSize` 根据长度调整字号
