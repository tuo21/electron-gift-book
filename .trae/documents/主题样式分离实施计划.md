# 主题样式分离实施计划

## 问题分析

当前喜庆红主题的样式直接硬编码在 Vue 组件中（如 `#F9D4BB`、`#ff4c4c`、`rgba(254, 237, 219, 1)` 等），导致切换到其他主题（如肃穆灰）时，这些硬编码颜色仍然会生效，造成样式冲突。

## 目标

将所有主题相关的样式统一到 `theme.css` 中管理，组件只使用 CSS 变量，实现主题间的完全隔离。

## 实施方案

### 阶段一：扩展 theme.css 变量系统

在 `theme.css` 中为每个主题定义完整的 CSS 变量集合，包括：

1. **容器背景色变量**

   * `--theme-container-bg`: 礼金簿/表单容器背景

   * `--theme-container-border`: 容器边框色

2. **导航栏变量**

   * `--theme-header-bg`: 导航栏背景

   * `--theme-header-text`: 导航栏文字/图标颜色

   * `--theme-header-border`: 导航栏边框

3. **按钮变量**

   * `--theme-btn-primary-bg`: 主按钮背景

   * `--theme-btn-primary-text`: 主按钮文字

   * `--theme-btn-secondary-bg`: 次按钮背景

   * `--theme-btn-secondary-border`: 次按钮边框

4. **表单区域变量**

   * `--theme-form-title`: 表单标题颜色

   * `--theme-form-accent`: 表单强调色（支付按钮等）

   * `--theme-form-input-focus`: 输入框焦点色

5. **分页栏变量**

   * `--theme-pagination-bg`: 分页栏背景

   * `--theme-pagination-text`: 分页栏文字

   * `--theme-pagination-btn-bg`: 分页按钮背景

   * `--theme-pagination-btn-border`: 分页按钮边框

6. **内容区域变量**

   * `--theme-content-bg`: 内容区背景

   * `--theme-content-border`: 内容区边框

   * `--theme-content-line`: 分隔线颜色

### 阶段二：重构 theme.css 结构

将现有结构改为嵌套主题类结构：

```css
/* 默认主题 - 喜庆红 */
:root {
  /* 基础变量 - 保持向后兼容 */
}

/* 喜庆红主题完整变量 */
.theme-red,
:root {
  /* 所有喜庆红主题变量 */
  --theme-container-bg: rgba(254, 237, 219, 1);
  --theme-container-border: rgb(212 175 55 / 79%);
  --theme-header-bg: transparent;
  --theme-header-text: #F9D4BB;
  --theme-form-title: #ff4c4c;
  /* ... 其他变量 */
}

/* 肃穆灰主题 */
.theme-gray {
  /* 所有肃穆灰主题变量 */
  --theme-container-bg: #F8F8F8;
  --theme-container-border: rgba(61, 61, 61, 0.2);
  --theme-header-bg: rgba(61, 61, 61, 0.8);
  --theme-header-text: #FFFFFF;
  --theme-form-title: #4A4A4A;
  /* ... 其他变量 */
}

/* 寿宴金主题 */
.theme-golden {
  /* 所有寿宴金主题变量 */
  --theme-container-bg: #FDF8F0;
  --theme-container-border: rgba(184, 134, 11, 0.3);
  --theme-header-bg: rgba(184, 134, 11, 0.6);
  --theme-header-text: #FFFFFF;
  --theme-form-title: #B8860B;
  /* ... 其他变量 */
}
```

### 阶段三：更新类型定义

修改 `src/types/theme.ts`：

```typescript
export const THEME_CONFIG: ThemeMeta[] = [
  {
    id: 'red',
    name: 'red',
    displayName: '喜庆红',
    icon: '🏮',
    description: '以温暖的红金色为基调，营造热烈喜庆的婚庆氛围',
    cssClass: 'theme-red',  // 改为明确的类名
    pdfKey: 'red'
  },
  // ... 其他主题
];
```

### 阶段四：重构组件样式

#### 1. App.vue

将所有硬编码颜色替换为 CSS 变量：

```css
/* 修改前 */
.func-btn {
  color: #F9D4BB;
}

/* 修改后 */
.func-btn {
  color: var(--theme-header-text);
}
```

需要替换的样式：

* `.func-btn` 及悬停状态

* `.form-panel` 背景和边框

* `.statistics-panel` 背景和边框

* `.app-header` 相关样式

#### 2. RecordList.vue

替换：

* `.giftbook-container` 背景和边框

* `.record-column` 背景和边框

* `.pagination-bar` 背景、按钮、文字

* `.empty-column` 样式

* `.cell` 边框线

#### 3. RecordForm.vue

替换：

* `.form-title` 颜色和边框

* `.payment-btn` 相关样式

* `.submit-btn` 背景渐变

* `.clear-btn` 边框和悬停

* `.form-input:focus` 边框

* `.amount-chinese` 颜色

* `.edit-hint` 相关样式

### 阶段五：更新 useTheme.ts

修改 `applyThemeToDocument` 函数：

```typescript
function applyThemeToDocument(theme: string): void {
  const normalizedTheme = normalizeTheme(theme);
  const meta = getThemeById(normalizedTheme);
  if (!meta) return;

  const root = document.documentElement;
  const body = document.body;
  
  // 移除所有主题类
  body.classList.remove('theme-red', 'theme-gray', 'theme-golden');
  
  // 添加当前主题类（所有主题都需要添加类名，包括默认主题）
  body.classList.add(meta.cssClass);
}
```

### 阶段六：测试验证

1. 切换到喜庆红主题，验证所有样式正确
2. 切换到肃穆灰主题，验证不再受喜庆红影响
3. 切换到寿宴金主题，验证样式正确
4. 刷新页面，验证主题持久化正常

## 文件修改清单

| 文件路径                            | 修改内容                |
| ------------------------------- | ------------------- |
| `src/styles/theme.css`          | 添加完整主题变量系统          |
| `src/types/theme.ts`            | 更新 `cssClass` 为明确类名 |
| `src/composables/useTheme.ts`   | 修改主题应用逻辑            |
| `src/App.vue`                   | 替换所有硬编码颜色为 CSS 变量   |
| `src/components/RecordList.vue` | 替换所有硬编码颜色为 CSS 变量   |
| `src/components/RecordForm.vue` | 替换所有硬编码颜色为 CSS 变量   |

## 预期结果

1. 每个主题都有独立的 CSS 变量集合
2. 切换主题时，所有样式都会正确切换
3. 新增主题时只需在 `theme.css` 中添加新的主题类
4. 组件代码中不再出现硬编码颜色值

## 实施建议

1. **先备份**：修改前备份 `theme.css` 和受影响的组件文件
2. **逐步实施**：建议按阶段顺序实施，每个阶段完成后进行测试
3. **使用查找替换**：对于大量相同颜色值的替换，使用 IDE 的全局查找替换功能
4. **测试优先**：每个阶段完成后都要测试主题切换功能

