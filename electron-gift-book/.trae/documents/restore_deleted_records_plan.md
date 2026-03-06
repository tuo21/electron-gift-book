# 已删除记录还原功能实现计划

## 需求分析

在"修改记录"弹窗（导航栏-修改记录）中，对已删除的内容实现还原功能：

1. 用户点击修改记录，在修改记录中对标记已删除的信息右键时，弹出"还原"右键菜单
2. 用户点击"还原"则执行还原数据的操作，将该数据新增到数据最后（和新增数据一样操作，但要增加一条操作记录）
3. 修改右键菜单逻辑：

   * 对非"已删除"数据：显示"定位到该项"和"还原修改"

   * 对"已删除"数据：显示"还原数据"菜单

## 当前问题

* 右键菜单对已删除记录显示"还原修改"选项，但点击后无反应（被禁用）

* 缺少后端 API 支持还原已删除记录的操作

* 前端未实现还原已删除记录的事件处理

## 实现步骤

### 1. 后端 Rust 代码修改

**文件**: `src-tauri/src/commands.rs`

添加 `restore_deleted_record` 命令：

* 接收历史记录 ID 或记录 ID 参数

* 根据历史记录中的原数据，创建一条新记录（而不是恢复旧记录）

* 新记录的创建时间设为当前时间，使其显示在列表最后

* 添加历史记录，记录类型为 "RESTORE" 或 "INSERT"

### 2. 前端 API 桥接层修改

**文件**: `src/api/bridge.ts`

添加 `restoreDeletedRecord` 方法：

* 调用后端 `restore_deleted_record` 命令

* 传入历史记录对象，包含原记录的所有字段

* 返回统一的 ApiResponse 格式

### 3. EditHistoryModal 组件修改

**文件**: `src/components/business/EditHistoryModal.vue`

修改右键菜单逻辑：

* 根据 `history.operationType === 'DELETE'` 判断显示不同菜单项

* 非删除记录：显示"定位到该项"和"还原修改"

* 已删除记录：显示"还原数据"菜单项

* 添加 `handleRestoreDeleted` 方法处理还原操作

* 添加 `restore-deleted` 事件 emit

### 4. App.vue 修改

**文件**: `src/App.vue`

* 添加 `handleRestoreDeleted` 方法处理还原逻辑

* 监听 EditHistoryModal 的 `restore-deleted` 事件

* 调用 API 创建新记录（使用历史记录中的原数据）

* 刷新记录列表

* 显示成功提示

## 详细实现

### 后端命令实现

```rust
#[tauri::command]
pub async fn restore_deleted_record(history: RecordHistory) -> Result<i64, String> {
    // 1. 根据历史记录中的数据创建新记录
    // 2. 新记录的创建时间为当前时间，使其显示在列表最后
    // 3. 添加历史记录，标记为还原操作
    // 4. 返回新记录的 ID
}
```

### 前端右键菜单逻辑

```vue
<!-- 非删除记录 -->
<template v-if="selectedHistory?.operationType !== 'DELETE'">
  <div class="context-menu-item" @click="handleLocate">
    <IconSvg name="map-pin" :size="14" />
    <span>定位到该项</span>
  </div>
  <div class="context-menu-item" @click="handleRevert">
    <IconSvg name="undo" :size="14" />
    <span>还原修改</span>
  </div>
</template>

<!-- 已删除记录 -->
<template v-else>
  <div class="context-menu-item" @click="handleRestoreDeleted">
    <IconSvg name="refresh-cw" :size="14" />
    <span>还原数据</span>
  </div>
</template>
```

### 还原后处理流程

1. 用户右键点击已删除的历史记录
2. 显示"还原数据"菜单
3. 点击后弹出确认对话框
4. 确认后调用 API，使用历史记录中的原数据创建新记录
5. 新记录的创建时间为当前时间，自然显示在列表最后
6. 添加一条 "RESTORE" 类型的历史记录
7. 刷新记录列表，显示新添加的记录
8. 显示成功提示

## 验收标准

* [ ] 右键点击已删除的历史记录，菜单显示"还原数据"选项

* [ ] 右键点击非删除的历史记录，菜单显示"定位到该项"和"还原修改"

* [ ] 点击"还原数据"后弹出确认对话框

* [ ] 确认后使用原数据创建新记录，显示在列表末尾

* [ ] 添加一条还原操作的历史记录

* [ ] 还原成功后显示提示信息

* [ ] 新记录可以正常编辑和删除

