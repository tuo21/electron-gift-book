# 实时姓名预览功能方案（横排布局）

## 需求描述
监控右侧宾客姓名输入框内的文字，实时显示到左侧展示区的**工具栏下方、主内容区上方**，**横排显示**，高度 **80px**。

## 布局分析

### 当前布局结构
```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏 (app-header) - 固定高度                          │
│  - Logo + 应用名称 | 功能按钮组 | 农历日期                   │
├─────────────────────────────────────────────────────────────┤
│  【预览区域】- 新增，高度 80px                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  实时姓名预览（横排）                                │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  主内容区 (main-content)                                    │
│  ┌──────────────────────────────┬───────────────────────┐  │
│  │  礼金簿展示区                │  右侧边栏             │  │
│  │  (giftbook-section)          │  (sidebar-section)    │  │
│  │  - RecordList 组件           │  - RecordForm         │  │
│  │  - 竖排显示                  │  - Statistics         │  │
│  └──────────────────────────────┴───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 当前尺寸计算
- **视口高度**: 100vh
- **顶部导航栏高度**: 约 72px (padding 16px * 2 + 内容高度)
- **主内容区高度**: `flex: 1` 占据剩余空间
- **预览区域高度**: 80px (新增)

### 布局空间计算

**可用空间分析**:
```
总高度: 100vh
- 顶部导航栏: ~72px
- 预览区域: 80px (新增)
- 主内容区: 剩余空间
```

**结论**: ✅ **空间足够**

主内容区使用 `flex: 1`，会自动适应剩余空间，增加 80px 的预览区域不会导致布局溢出。

---

## 推荐方案：工具栏下方横排预览

### 实现思路
在 `app-header` 和 `main-content` 之间插入一个新的预览区域，横排显示输入的姓名。

### 详细实现步骤

#### 1. App.vue 模板修改
```vue
<template>
  <div v-show="isAppReady" class="app-container" :class="{ 'fade-in': isAppReady }">
    
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <!-- ... 原有内容 ... -->
    </header>

    <!-- 
      ========================================
      姓名预览区域 (name-preview-section)
      ========================================
      位置：工具栏下方，主内容区上方
      高度：80px
      显示：横排显示当前输入的姓名
    -->
    <div v-if="previewName" class="name-preview-section">
      <div class="preview-label">预览</div>
      <div class="preview-content">
        <span class="preview-name">{{ previewName }}</span>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- ... 原有内容 ... -->
    </main>
    
    <!-- ... 弹窗等 ... -->
  </div>
</template>
```

#### 2. App.vue 样式添加
```css
/* 
  ========================================
  姓名预览区域
  ========================================
  - 高度：80px
  - 背景：半透明主题色
  - 文字：横排显示，大号字体
  - 位置：工具栏和主内容区之间
*/
.name-preview-section {
  height: 80px;
  background: rgba(255, 255, 255, 0.15);
  border-bottom: 2px dashed rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  padding: 0 var(--theme-spacing-xl);
  gap: var(--theme-spacing-md);
}

.preview-label {
  font-size: var(--theme-font-size-sm);
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: var(--theme-border-radius);
  flex-shrink: 0;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-name {
  font-size: 48px;  /* 大号字体 */
  font-weight: bold;
  color: #fff;
  font-family: var(--theme-font-family);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

#### 3. App.vue 逻辑修改
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

// 取消编辑时清空预览
const handleCancelEdit = () => {
  previewName.value = '' // 清空预览
  // ... 原有逻辑
}
```

#### 4. RecordForm.vue 修改
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
const emit = defineEmits<{
  submit: [record: Omit<Record, 'id' | 'createTime' | 'updateTime'>]
  update: [record: Record]
  cancel: []
  'name-input': [name: string]  // 新增
}>()

const onNameInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  emit('name-input', value)
}
```

---

## 布局验证

### 空间占用
| 区域 | 高度 | 说明 |
|------|------|------|
| 顶部导航栏 | ~72px | 固定 |
| 姓名预览区 | 80px | 新增，有内容时显示 |
| 主内容区 | 剩余 | flex: 1 自适应 |

### 视觉效果
- 预览区域使用半透明背景，与主题色融合
- "预览"标签提示用户这是预览状态
- 姓名字体大（48px），横排显示，醒目易读
- 文字过长时自动截断显示省略号

---

## 验收标准
- [ ] 在姓名输入框输入时，工具栏下方实时显示预览
- [ ] 预览区域高度 80px，横排显示姓名
- [ ] 姓名字体大且醒目，使用主题字体
- [ ] 提交表单后，预览区域消失
- [ ] 清空表单时，预览区域也清空
- [ ] 预览区域不影响主内容区布局

## 预估工作量
- 修改文件：2个（App.vue、RecordForm.vue）
- 预计时间：20-30分钟

## 优化建议

### 1. 动画效果（可选）
添加淡入淡出动画，让预览区域显示/隐藏更平滑：
```css
.name-preview-section {
  transition: all 0.3s ease;
}
```

### 2. 自适应字体（可选）
如果姓名很长，可以动态调整字体大小：
```typescript
const previewFontSize = computed(() => {
  const length = previewName.value.length
  if (length <= 4) return 48
  if (length <= 6) return 36
  if (length <= 8) return 28
  return 24
})
```

### 3. 多字段预览（可选）
如果需要同时预览金额等信息，可以扩展：
```vue
<div class="preview-content">
  <span class="preview-name">{{ previewName }}</span>
  <span v-if="previewAmount" class="preview-amount">{{ previewAmount }}</span>
</div>
```
