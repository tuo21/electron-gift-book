# 隐藏激活功能实施计划

## 1. 需求分析

用户要求暂时隐藏激活相关功能，让所有用户都可以直接使用软件的全部功能。但要求：
- 保留相关功能模块在项目中
- 做好标记和说明，便于以后重启该功能

## 2. 激活功能现状分析

### 2.1 涉及的核心文件

| 文件路径 | 功能说明 |
|---------|---------|
| `src/composables/useActivation.ts` | 激活状态管理核心逻辑 |
| `src/components/home/ActivateModal.vue` | 激活弹窗组件 |
| `src/App.vue` | 使用激活功能的主组件 |
| `src/composables/useSearch.ts` | 搜索功能需要激活验证 |
| `src/composables/useRecordOperations.ts` | 统计弹窗需要激活验证 |
| `src/composables/useExport.ts` | 导出功能需要激活验证 |
| `src/components/home/HomeView.vue` | 首页显示激活状态和按钮 |

### 2.2 激活验证的触发点

1. **搜索功能** (`useSearch.ts`): 点击搜索按钮时检查激活状态
2. **统计弹窗** (`useRecordOperations.ts`): 打开统计弹窗时检查激活状态
3. **导出功能** (`useExport.ts`): 打开导出弹窗时检查激活状态
4. **首页显示** (`HomeView.vue`): 显示激活状态和"去激活"按钮

## 3. 实施方案

### 3.1 修改核心策略

**核心思路**: 修改 `useActivation.ts` 的 `checkActivation()` 方法，让其始终返回 `true`（模拟已激活状态），这样所有依赖激活检查的功能都将自动解锁。

### 3.2 具体修改步骤

#### 步骤 1: 修改 `src/composables/useActivation.ts`

```typescript
// 添加标记：激活功能已被临时隐藏
// TODO: [ACTIVATION_FEATURE] 此功能已被临时隐藏，如需重新启用，请移除以下硬编码逻辑
const checkActivation = async (): Promise<boolean> => {
  // 临时隐藏激活功能：始终返回已激活状态
  // 保留原代码作为注释，便于以后恢复
  /*
  try {
    isLoading.value = true;
    const result = await licenseAPI.isActivated();
    isActivated.value = result;
    return result;
  } catch (error) {
    console.error('检查激活状态失败:', error);
    return false;
  } finally {
    isLoading.value = false;
  }
  */
  isActivated.value = true; // 临时：强制设置为已激活
  return true;
};
```

#### 步骤 2: 隐藏首页的激活状态显示 (`HomeView.vue`)

- 隐藏激活状态提示和"去激活"按钮
- 添加标记说明

#### 步骤 3: 保留激活弹窗组件 (`ActivateModal.vue`)

- 保持组件完整，添加标记说明

#### 步骤 4: 标记各 composables 中的激活检查代码

- 在 `useSearch.ts`, `useRecordOperations.ts`, `useExport.ts` 中添加标记

## 4. 文件修改清单

| 文件 | 修改内容 | 状态 |
|-----|---------|------|
| `src/composables/useActivation.ts` | 修改 `checkActivation()` 返回 `true` | 待执行 |
| `src/components/home/HomeView.vue` | 隐藏激活状态区域 | 待执行 |
| `src/App.vue` | 保留激活相关代码但添加标记 | 待执行 |
| `src/composables/useSearch.ts` | 添加标记说明 | 待执行 |
| `src/composables/useRecordOperations.ts` | 添加标记说明 | 待执行 |
| `src/composables/useExport.ts` | 添加标记说明 | 待执行 |
| `src/components/home/ActivateModal.vue` | 添加标记说明 | 待执行 |

## 5. 恢复激活功能的步骤

如需重新启用激活功能，只需：

1. 恢复 `useActivation.ts` 中的原始 `checkActivation()` 逻辑
2. 取消 `HomeView.vue` 中激活状态区域的隐藏
3. 移除各文件中的 `[ACTIVATION_FEATURE]` 标记

## 6. 风险评估

| 风险 | 影响 | 应对措施 |
|-----|------|---------|
| 代码混淆 | 未来维护者可能不清楚为何激活检查被跳过 | 添加清晰的注释标记 |
| 功能遗忘 | 激活功能可能被长期遗忘 | 在关键位置添加 TODO 注释 |
| 构建错误 | 修改可能引入语法错误 | 执行构建测试验证 |
