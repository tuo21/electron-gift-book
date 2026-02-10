## 第一阶段：框架搭建与原型 - 详细实施计划

### 任务 1: 初始化 Electron + Vue3 + TypeScript 项目

**步骤：**
1. 使用 `npm create electron-vite@latest` 创建项目
   - 项目名称: `electron-gift-book`
   - 框架选择: Vue
   - 语言选择: TypeScript
2. 进入项目目录并安装基础依赖

### 任务 2: 配置 Tailwind CSS

**步骤：**
1. 安装 Tailwind CSS 依赖: `npm install -D tailwindcss postcss autoprefixer`
2. 初始化 Tailwind 配置: `npx tailwindcss init -p`
3. 配置 `tailwind.config.js` 文件内容路径
4. 创建 `src/assets/tailwind.css` 文件并添加基础指令
5. 在 `src/main.ts` 中导入 tailwind.css

### 任务 3: 配置 SQLite 环境

**步骤：**
1. 安装 better-sqlite3: `npm install better-sqlite3`
2. 安装类型定义: `npm install -D @types/better-sqlite3`
3. 配置 Electron 主进程可以访问 Node.js 模块（在 `vite.config.ts` 中设置 `nodeIntegration: true`）

### 任务 4: 编写数据库初始化脚本（InitDB）

**步骤：**
1. 创建 `src/main/database.ts` 文件
2. 实现数据库连接类，包含：
   - 初始化数据库连接
   - 创建 Records 表
   - 创建 Records_History 表
3. 在 Electron 主进程中调用初始化
4. 通过 IPC 暴露数据库操作接口给渲染进程

### 项目结构规划

```
electron-gift-book/
├── src/
│   ├── main/                 # 主进程
│   │   ├── index.ts          # 主进程入口
│   │   └── database.ts       # 数据库服务
│   ├── preload/              # 预加载脚本
│   │   └── index.ts
│   ├── renderer/             # 渲染进程
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── App.vue
│   │   │   └── assets/
│   │   │       └── tailwind.css
│   │   └── index.html
│   └── types/                # 类型定义
│       └── database.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### 数据库表结构实现

根据需求文档创建两个表：
- **Records**: 主记录表（包含宾客姓名、金额、支付方式等）
- **Records_History**: 修改历史表（记录变更日志）

请确认此计划后，我将开始执行初始化配置。