# PDF页眉页脚调整计划

## 需求分析

根据用户提供的示意图，需要调整PDF导出的页眉页脚信息：

### 1. 页眉右上角调整
**现状**：显示"导出日期：2024年01月01日"
**目标**：改为"日期：年月日"，值为创建日期

### 2. 记录总数位置调整
**现状**：页眉右上角显示"共*条记录"
**目标**：移到页脚左下角

### 3. 页脚右下角增加金额小计
**现状**：只显示页码
**目标**：右下角增加当前页金额小计（如：本页合计：¥1,234.00）

### 4. 最后一页汇总显示
**现状**：空白格子保持空白
**目标**：在最后一页的空白格子上层显示汇总金额，格式如示意图所示：
- 大字体红色文字："共计：壹拾贰万捌仟元"
- 括号内显示数字："(128000元)"
- 如果空间不足，汇总信息另起一页

---

## 修改计划

### 文件1: electron/main.ts

#### 修改1: 页眉信息调整
**位置**：pagesHtml 生成部分（约第410-426行）

将：
```typescript
<header class="print-header">
  <h1 class="print-title">${appName || '电子礼金簿'}</h1>
  <div class="print-meta">
    <span>导出日期：${exportDate}</span>
    <span>共 ${records.length} 条记录</span>
  </div>
</header>
```

改为：
```typescript
<header class="print-header">
  <h1 class="print-title">${appName || '电子礼金簿'}</h1>
  <div class="print-meta">
    <span>日期：${exportDate}</span>
  </div>
</header>
```

#### 修改2: 计算每页金额小计
**位置**：分页循环中（约第388-403行）

在分页循环中计算每页的金额合计：
```typescript
const pageAmount = pageRecords.reduce((sum, r) => sum + r.amount, 0)
```

#### 修改3: 页脚信息调整
**位置**：pagesHtml 生成部分（约第410-426行）

将页脚改为三栏布局：
- 左下角：共*条记录
- 中间：页码
- 右下角：本页合计

#### 修改4: 最后一页汇总
**位置**：pagesHtml 生成之后，htmlContent 生成之前

判断是否为最后一页，如果是，在空白格子上层添加汇总信息层。

需要：
1. 计算总金额
2. 将金额转为大写
3. 生成汇总HTML覆盖层

### 文件2: public/print.css

#### 修改1: 页脚样式调整
**位置**：.print-footer 部分（约第232-240行）

将页脚改为flex布局，支持三栏：
```css
.print-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  font-size: 9pt;
}
```

#### 修改2: 汇总信息样式
**新增**：汇总信息覆盖层样式

```css
.summary-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--theme-primary);
  font-weight: bold;
  z-index: 10;
}

.summary-amount-chinese {
  font-size: 24pt;
  margin-bottom: 2mm;
}

.summary-amount-number {
  font-size: 18pt;
}
```

#### 修改3: 打印内容区相对定位
**位置**：.print-content 部分（约第86-97行）

添加相对定位，以便汇总信息可以绝对定位：
```css
.print-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: var(--column-gap);
  background: rgba(255, 255, 255, 0.1);
  padding: 0;
  align-content: flex-start;
  justify-content: flex-start;
  position: relative;  /* 新增 */
}
```

---

## 实现细节

### 金额大写转换函数
在 main.ts 中已经存在 `numberToChinese` 函数，可以直接使用。

### 汇总信息HTML结构
```html
<div class="summary-overlay">
  <div class="summary-amount-chinese">共计：壹拾贰万捌仟元</div>
  <div class="summary-amount-number">(128000元)</div>
</div>
```

### 判断最后一页
在生成 pagesHtml 时，通过 `pageIndex === totalPages - 1` 判断是否为最后一页。

---

## 注意事项

1. 汇总信息需要覆盖在空白格子上方，使用绝对定位
2. 汇总信息的字体颜色使用主题红色（--theme-primary）
3. 确保汇总信息不会被打印分页截断
4. 如果记录数刚好是15的倍数（没有空白格子），汇总信息需要另起一页显示
