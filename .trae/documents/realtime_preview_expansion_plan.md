# 实时预览功能扩展方案（单字段模式）

## 需求描述
调整姓名预览区的功能：预览当前输入框显示的文字，当光标移动到下一个输入框后，当前文字清空，准备预览下一次文字显示。

## 当前状态
- 姓名预览区已存在，位于工具栏下方，主内容区上方
- 目前只能预览"宾客姓名"输入框的内容
- 高度 80px，宽度 600px，使用 SVG 背景

## 目标
扩展预览功能，实时显示当前聚焦输入框的内容：
1. 宾客姓名
2. 礼金金额
3. 备注
4. 物品

（支付方式不需要预览文字，因为是按钮选择）

## 方案：单字段实时预览

### 实现思路
- 记录当前聚焦的输入框字段
- 只预览当前聚焦输入框的内容
- 切换输入框时清空预览
- 提交表单后清空预览

### 详细实现步骤

#### 1. App.vue 修改

**状态定义**：
```typescript
// 当前预览的字段和值
const currentPreview = ref({
  field: '',  // 当前字段名：'guestName' | 'amount' | 'remark' | 'itemDescription'
  value: ''    // 当前值
});

// 计算显示文本
const previewText = computed(() => {
  return currentPreview.value.value || '\u00A0';
});
```

**处理函数**：
```typescript
// 处理输入预览
const handleInputPreview = (field: string, value: string) => {
  currentPreview.value = { field, value };
};

// 清空预览（切换输入框时调用）
const clearPreview = () => {
  currentPreview.value = { field: '', value: '' };
};

// 提交后清空预览
const handleSubmit = async (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) => {
  // ... 原有逻辑
  clearPreview(); // 清空预览
};
```

**模板**：
```vue
<div class="name-preview-section">
  <div class="preview-content">
    <span class="preview-name">{{ previewText }}</span>
  </div>
</div>
```

#### 2. RecordForm.vue 修改

**事件定义**：
```typescript
const emit = defineEmits<{
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void;
  (e: 'update', record: Record): void;
  (e: 'cancel'): void;
  (e: 'input-preview', field: string, value: string): void;  // 输入预览事件
  (e: 'clear-preview'): void;  // 清空预览事件
}>();
```

**输入框添加 focus 和 input 监听**：
```vue
<!-- 姓名输入 -->
<input
  ref="nameInput"
  v-model="formData.guestName"
  type="text"
  class="form-input"
  placeholder="请输入姓名"
  @focus="onInputFocus('guestName')"
  @input="onInputChange('guestName', formData.guestName)"
  @blur="onInputBlur"
/>

<!-- 金额输入 -->
<input
  ref="amountInput"
  v-model="formData.amount"
  type="number"
  class="form-input"
  placeholder="请输入金额"
  @focus="onInputFocus('amount')"
  @input="onInputChange('amount', formData.amount)"
  @blur="onInputBlur"
/>

<!-- 备注 -->
<input
  ref="remarkInput"
  v-model="formData.remark"
  type="text"
  class="form-input"
  placeholder="可选填"
  @focus="onInputFocus('remark')"
  @input="onInputChange('remark', formData.remark)"
  @blur="onInputBlur"
/>

<!-- 物品 -->
<input
  ref="itemInput"
  v-model="formData.itemDescription"
  type="text"
  class="form-input"
  placeholder="如: 被子、枕头等"
  @focus="onInputFocus('itemDescription')"
  @input="onInputChange('itemDescription', formData.itemDescription)"
  @blur="onInputBlur"
/>
```

**处理函数**：
```typescript
// 当前聚焦的字段
const currentField = ref('');

// 输入框获得焦点
const onInputFocus = (field: string) => {
  currentField.value = field;
  // 获取当前值并预览
  const value = getFieldValue(field);
  emit('input-preview', field, value);
};

// 输入框内容变化
const onInputChange = (field: string, value: string) => {
  if (currentField.value === field) {
    emit('input-preview', field, value);
  }
};

// 输入框失去焦点（延迟清空，避免切换时闪烁）
const onInputBlur = () => {
  // 使用 setTimeout 延迟清空，给下一个输入框的 focus 事件留出时间
  setTimeout(() => {
    emit('clear-preview');
    currentField.value = '';
  }, 100);
};

// 获取字段值
const getFieldValue = (field: string): string => {
  switch (field) {
    case 'guestName': return formData.value.guestName;
    case 'amount': return formData.value.amount;
    case 'remark': return formData.value.remark;
    case 'itemDescription': return formData.value.itemDescription;
    default: return '';
  }
};
```

#### 3. 样式调整（可选）

如果预览内容过长，可以调整字体大小：
```css
.preview-name {
  font-size: 48px;
  color: #000;
  font-family: '演示春风楷', 'KaiTi', 'STKaiti', serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  display: flex;
  align-items: center;
  margin-top: -14px;
}
```

## 交互流程

1. 用户点击/聚焦"姓名"输入框
   - 触发 `@focus` 事件
   - 预览区显示当前姓名

2. 用户输入姓名
   - 触发 `@input` 事件
   - 预览区实时更新

3. 用户切换到"金额"输入框
   - "姓名"输入框触发 `@blur`，延迟清空预览
   - "金额"输入框触发 `@focus`，预览区显示当前金额

4. 用户提交表单
   - 预览区清空

## 验收标准
- [ ] 聚焦姓名输入框时，预览区显示姓名
- [ ] 聚焦金额输入框时，预览区显示金额
- [ ] 聚焦备注输入框时，预览区显示备注
- [ ] 聚焦物品输入框时，预览区显示物品
- [ ] 切换输入框时，预览区清空后显示新内容
- [ ] 提交表单后预览区清空
- [ ] 取消编辑时预览区清空

## 预估工作量
- 修改文件：2个（App.vue、RecordForm.vue）
- 预计时间：20-30分钟
