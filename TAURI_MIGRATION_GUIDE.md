# Electron to Tauri 迁移指令集 (Skills File)

## 1. 核心目标
将项目从 Electron 架构迁移到 Tauri 架构，将包体积从 100MB+ 缩减至 10MB 以内，同时 100% 保留现有业务逻辑和 UI。

## 2. 迁移原则（安全第一）
- **禁止删除/覆盖**：严禁修改或删除现有的 `main.js`, `preload.js` 以及任何与 Electron 相关的构建脚本。
- **平行开发**：所有的 Tauri 后端代码必须位于 `src-tauri` 目录下。
- **环境隔离**：前端代码通过环境变量或条件编译来区分 Electron 和 Tauri 的调用逻辑。

## 3. 技术栈映射规范
在转换逻辑时，请遵循以下对应关系：
- `ipcRenderer.invoke(channel, data)` -> `import { invoke } from '@tauri-apps/api/tauri'; invoke(cmd, { data })`
- `node:fs` / `path` -> 使用 Tauri 的 `fs` 插件或在 Rust 后端实现文件 IO。
- `sqlite3` / `better-sqlite3` -> 使用 `tauri-plugin-sql` (Rust 驱动)。
- `shell.openExternal` -> `@tauri-apps/api/shell.open`。

## 4. 执行步骤 (Step-by-Step)

### 第一步：初始化环境
1. 在项目根目录运行 `npx tauri init`。
2. 配置 `tauri.conf.json`：
   - 设置 `distDir` 为原项目的构建输出目录 (例如 `../dist` 或 `../build`)。
   - 设置 `devPath` 为前端开发服务器地址 (例如 `http://localhost:5173`)。

### 第二步：依赖安装
1. 安装前端桥接库：`npm install @tauri-apps/api @tauri-apps/plugin-sql`。
2. 在 `src-tauri/Cargo.toml` 中添加必要的 Rust 依赖（如 `serde`, `serde_json`）。

### 第三步：IPC 接口重写 (核心任务)
1. **分析**：扫描原项目中的 `main/` 文件夹或 `ipcMain.handle` 调用。
2. **转换**：在 `src-tauri/src/main.rs` 中为每个 Electron 通道编写对应的 `#[tauri::command]`。
3. **前端适配**：创建一个新的 `src/api/bridge.ts`，封装一套统一的 API。
   - 如果检测到 `window.__TAURI_METADATA__`，则调用 Tauri `invoke`。
   - 否则回退到 Electron 的 `window.electron.invoke`。

### 第四步：数据库与存储迁移
1. 如果原项目使用 `electron-store`，请改用 `tauri-plugin-store`。
2. 如果使用 SQLite，请配置 `tauri-plugin-sql` 并确保数据库文件路径在 Tauri 的 `AppData` 范围内。

## 5. 检查清单 (Definition of Done)
- [x] 运行 `npm run tauri dev` 能够正常打开窗口。
- [x] 礼簿的"增删改查"功能在新窗口中运行正常。
- [ ] 导出 Excel/PDF 功能通过 Tauri 接口触发。
- [x] 窗口最小化、关闭等自定义标题栏功能正常适配（原应用使用系统默认标题栏，无需自定义）。