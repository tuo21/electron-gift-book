# 修改系统窗口标题和Logo

## 需要修改的内容

### 1. 修改HTML模板中的窗口标题
- **文件**：`index.html`
- **修改点**：将 `<title>` 标签内容从 "Vite + Vue + TS" 改为 "礼"
- **位置**：第7行

### 2. 修改HTML模板中的图标
- **文件**：`index.html`
- **修改点**：将 `<link rel="icon">` 标签的 `href` 属性从 "/vite.svg" 改为 "/images/logo.png"
- **位置**：第5行

### 3. 修改Electron窗口图标
- **文件**：`electron/main.ts`
- **修改点**：将窗口图标路径从默认的 `electron-vite.svg` 改为 `logo.png`
- **位置**：第47行

### 4. 替换Logo图片（可选）
- **文件**：`public/images/logo.png`
- **操作**：用户可以提供自己的logo文件来替换现有文件
- **说明**：保持文件名不变，这样代码不需要修改

## 实施步骤

1. **修改HTML标题**：更新 `index.html` 中的 `<title>` 标签
2. **修改HTML图标**：更新 `index.html` 中的 `<link rel="icon">` 标签
3. **修改Electron窗口图标**：更新 `electron/main.ts` 中的图标路径
4. **替换Logo文件**（如果需要）：用户提供新的logo.png文件
5. **验证修改**：重启应用查看效果

## 技术说明

- HTML标题修改后会立即在系统窗口标题栏显示
- HTML图标修改后会在浏览器标签页显示（如果在浏览器中运行）
- Electron窗口图标修改后需要重启应用才能看到效果
- Logo图片替换后需要刷新页面才能看到效果
- 保持文件名不变可以减少代码修改，确保系统正常运行