# PDF 导出优化计划

## 问题分析

### 1. PDF 尺寸比例问题
**现状**：
- CSS 中定义了 `@page { size: A4 landscape; }`
- Electron `printToPDF` 中设置了 `pageSize: 'A4'`
- 实际礼金簿内容尺寸为 `297mm × 210mm`（A4横向尺寸）

**问题**：如果实际内容高度小于210mm，会被拉伸到A4高度，导致视觉变形。

**解决方案**：
- 使用自定义页面尺寸，根据实际内容计算高度
- 或者使用 `printToPDF` 的自定义尺寸选项

### 2. 列表间隔问题
**现状**：
- CSS 中 `--column-gap: 0mm` 设置为0
- 但 `.print-content` 使用了 `justify-content: space-between`

**问题**：`space-between` 会在列之间均匀分配空间，导致间隔。

**解决方案**：
- 将 `justify-content: space-between` 改为 `justify-content: flex-start`

### 3. 空白列表透明度问题
**现状**：
- CSS 中 `.empty-column { opacity: 0.5; background: rgba(255, 255, 255, 0.7); }`

**问题**：空白列显示为半透明，与有内容的列外观不一致。

**解决方案**：
- 移除 `.empty-column` 的 `opacity` 和特殊背景色设置

### 4. 空白页问题
**现状**：
- CSS 中 `.print-container { page-break-after: always; }`

**问题**：每个容器后都会强制分页，导致最后出现空白页。

**解决方案**：
- 移除 `page-break-after: always`，或改为 `page-break-after: auto`

---

## 修改计划

### 文件 1: `public/print.css`

1. **修改 `@page` 规则**（第31-34行）
   - 移除固定的 A4 尺寸限制
   - 改为自适应内容尺寸

2. **修改 `.print-content`**（第87-98行）
   - 将 `justify-content: space-between` 改为 `justify-content: flex-start`

3. **修改 `.empty-column`**（第116-119行）
   - 移除 `opacity: 0.5`
   - 移除 `background: rgba(255, 255, 255, 0.7)`

4. **修改 `.print-container`**（第52-59行）
   - 移除 `page-break-after: always`（在 @media print 中）

### 文件 2: `electron/main.ts`

1. **修改 `printToPDF` 配置**（第447-452行）
   - 将 `pageSize: 'A4'` 改为自定义尺寸
   - 根据实际内容计算页面尺寸

---

## 具体修改内容

### print.css 修改

```css
/* 1. 页面设置 - 移除固定A4尺寸 */
@page {
  margin: 0;
}

/* 2. 打印内容区 - 移除间隔 */
.print-content {
  /* ... */
  justify-content: flex-start;  /* 改为 flex-start */
  /* ... */
}

/* 3. 空白列 - 移除透明度 */
.empty-column {
  /* 移除 opacity 和特殊背景 */
}

/* 4. 打印优化 - 移除强制分页 */
@media print {
  .print-container {
    /* 移除 page-break-after: always */
  }
}
```

### main.ts 修改

```typescript
// 使用自定义页面尺寸
const pdfBuffer = await printWindow.webContents.printToPDF({
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  printBackground: true,
  landscape: true,
  pageSize: {
    width: 297000,  // 297mm in microns
    height: 210000  // 210mm in microns (可根据内容调整)
  }
})
```
