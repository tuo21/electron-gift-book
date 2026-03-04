# 实时姓名预览功能方案

## 需求描述
监控右侧宾客姓名输入框内的文字，实时显示到左侧展示区的姓名展示框里。

## 可行性分析

### ✅ 可行

此功能完全可以实现，主要有两种实现方案：

## 方案一：新增独立预览列（推荐）

### 实现思路
在 RecordList 组件的最前面（或最后面）增加一个特殊的"预览列"，当用户在 RecordForm 中输入姓名时，实时同步显示到这个预览列中。

### 具体步骤
1. **App.vue 修改**
   - 添加 `previewName` 响应式变量存储预览姓名
   - 监听 RecordForm 的输入事件，更新 previewName
   - 将 previewName 传递给 RecordList

2. **RecordList.vue 修改**
   - 添加 `previewName` prop
   - 在 records-grid 最前面添加一个预览列（特殊样式区分）
   - 预览列显示 previewName，使用相同的竖排样式
   - 预览列添加半透明/虚线边框等视觉效果，表示这是预览

3. **RecordForm.vue 修改**
   - 添加 `@input` 事件监听
   - emit `name-input` 事件，将输入值传递给父组件

### 优点
- 实现简单，代码侵入性小
- 用户体验好，预览效果明显
- 不影响现有数据结构

### 缺点
- 预览列占用一个位置

---

## 方案二：高亮最后一列作为预览

### 实现思路
使用 RecordList 中的空白列（empty-column）作为预览区域，当用户输入时，动态填充最后一列的姓名。

### 具体步骤
1. **App.vue 修改**
   - 添加 `previewName` 响应式变量
   - 监听 RecordForm 输入事件

2. **RecordList.vue 修改**
   - 添加 `previewName` prop
   - 修改 empty-column 逻辑：当 previewName 有值时，第一列空白列显示预览姓名
   - 预览列使用特殊样式（半透明、虚线边框）

### 优点
- 不增加额外列数
- 利用现有空白列

### 缺点
- 逻辑稍微复杂
- 如果当前页已满，没有空白列可用

---

## 推荐方案：方案一

方案一更加清晰直观，且实现简单。

### 详细实现步骤

#### 1. App.vue
```typescript
// 添加预览姓名状态
const previewName = ref('')

// 处理姓名输入预览
const handleNameInput = (name: string) => {
  previewName.value = name
}

// 提交后清空预览
const handleSubmit = (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) => {
  previewName.value = '' // 清空预览
  // ... 原有逻辑
}
```

#### 2. RecordList.vue
```typescript
// 添加 prop
const props = defineProps<{
  // ... 原有 props
  previewName?: string
}>()
```

```vue
<!-- 在 records-grid 最前面添加预览列 -->
<div v-if="previewName" class="record-column preview-column">
  <!-- 姓名标签 -->
  <div class="cell label-cell"><span class="label-text">姓名</span></div>
  <!-- 预览姓名 -->
  <div class="cell name-cell">
    <span class="name-text" :style="{ fontSize: getAdaptiveFontSize(previewName, true) + 'px' }">{{ previewName }}</span>
  </div>
  <!-- 其他空白单元格 -->
  <div class="cell remark-cell"><span class="remark-text">&nbsp;</span></div>
  <div class="cell label-cell"><span class="label-text">礼金</span></div>
  <div class="cell amount-cell"><span class="amount-chinese"></span></div>
  <div class="cell payment-cell">
    <div class="payment-placeholder"></div>
    <span class="amount-number"></span>
  </div>
</div>
```

```css
.preview-column {
  opacity: 0.6;
  border: 2px dashed rgba(235, 86, 74, 0.5);
  background: rgba(255, 255, 255, 0.3);
}
```

#### 3. RecordForm.vue
```vue
<input
  ref="nameInput"
  v-model="formData.guestName"
  type="text"
  class="form-input"
  placeholder="请输入姓名"
  @input="onNameInput"
  @keydown.tab.prevent="focusAmount"
  @keydown.arrow-down.prevent="focusAmount"
  @keydown.enter.prevent="focusAmount"
/>
```

```typescript
const onNameInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  emit('name-input', value)
}
```

---

## 验收标准
- [ ] 在姓名输入框输入时，左侧展示区实时显示预览
- [ ] 预览列使用特殊样式（半透明、虚线边框）与正式记录区分
- [ ] 预览姓名使用相同的竖排显示和自适应字体
- [ ] 提交表单后，预览列消失，新记录显示在列表中
- [ ] 清空表单时，预览列也清空

## 预估工作量
- 修改文件：3个（App.vue、RecordList.vue、RecordForm.vue）
- 预计时间：30-60分钟
