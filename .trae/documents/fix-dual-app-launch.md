# 修复 Tauri 开发模式同时启动 Electron 应用的问题

## 问题分析

当前 `vite.config.ts` 配置了 `vite-plugin-electron` 插件。当运行 `npm run tauri:dev` 时：

1. Tauri 执行 `beforeDevCommand`（即 `npm run dev`）
2. `npm run dev` 启动 Vite 开发服务器
3. `vite-plugin-electron` 插件检测到开发模式，自动启动 Electron 应用
4. 同时 Tauri 也启动了自己的窗口

结果：同时启动了 Electron 和 Tauri 两个应用窗口。

## 解决方案

修改 `vite.config.ts`，通过环境变量判断是否为 Tauri 开发模式，在 Tauri 模式下禁用 Electron 插件。

## 实施步骤

### 步骤 1：修改 `vite.config.ts`

添加环境变量检测，当 `TAURI_ENV` 或类似标记存在时，跳过 Electron 插件：

```typescript
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

const isTauri = process.env.TAURI_ENV === 'true' || process.argv.includes('--tauri')

export default defineConfig({
  plugins: [
    vue(),
    // 只在非 Tauri 模式下启用 Electron 插件
    !isTauri && electron({
      main: {
        entry: 'electron/main.ts',
        onstart(args) {
          if (args.reload) {
            args.reload()
          } else {
            args.startup()
          }
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['better-sqlite3', 'bindings'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            sourcemap: true,
          },
        },
      },
      renderer: process.env.NODE_ENV === 'test'
        ? undefined
        : {
            nodeIntegration: false,
            contextIsolation: true,
          },
    }),
  ].filter(Boolean),
})
```

### 步骤 2：修改 `package.json` 的 Tauri 脚本

设置环境变量 `TAURI_ENV=true`：

```json
{
  "scripts": {
    "tauri:dev": "cross-env TAURI_ENV=true tauri dev",
    "tauri:build": "cross-env TAURI_ENV=true tauri build"
  }
}
```

或者使用 Windows 兼容的方式：

```json
{
  "scripts": {
    "tauri:dev": "set TAURI_ENV=true && tauri dev",
    "tauri:build": "set TAURI_ENV=true && tauri build"
  }
}
```

### 步骤 3：安装 cross-env（可选，用于跨平台兼容）

```bash
npm install -D cross-env
```

## 预期结果

- 运行 `npm run dev`：只启动 Electron 应用
- 运行 `npm run tauri:dev`：只启动 Tauri 应用
