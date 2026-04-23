# Windows 7 兼容性构建指南

## 问题描述

在 Windows 7 上运行软件时提示：
```
无法找到入口：无法定位程序输入点 GetSystemTimePreciseAsFileTime 于动态链接库 kernel32.dll 上
```

这是因为 `GetSystemTimePreciseAsFileTime` 函数只在 Windows 8 及以上系统中可用。

## 根本原因

Rust 1.78.0 及更高版本使用了 Windows 8+ 特有的 API。要支持 Windows 7，必须使用 Rust 1.77.2 或更早版本构建。

## 解决方案

### 快速构建（使用提供的脚本）

1. 确保已安装 Rust 1.77.2：
```bash
rustup install 1.77.2
rustup default 1.77.2
```

2. 运行构建脚本：
```bash
cd src-tauri
build-windows7.bat
```

### 手动构建步骤

#### 步骤 1：切换到 Rust 1.77.2
```bash
rustup install 1.77.2
rustup default 1.77.2
```

#### 步骤 2：清理并构建
```bash
cd src-tauri
cargo clean
set RUSTFLAGS=-C target-feature=+crt-static -C link-arg=/SUBSYSTEM:WINDOWS,6.01
cargo build --release
```

## 已做的配置更改

### 1. tauri.conf.json
```json
"bundle": {
  "windows": {
    "webviewInstallMode": {
      "type": "embedBootstrapper"
    },
    "nsis": {
      "installMode": "both"
    }
  }
}
```
- `embedBootstrapper`: 嵌入 WebView2 引导程序，提高 Windows 7 兼容性
- `installMode: both`: 允许用户选择为当前用户或所有用户安装

### 2. Cargo.toml
- 锁定依赖版本为与 Rust 1.77.2 兼容的版本
- 降低 sqlx 从 0.8 到 0.7
- 降低其他依赖版本

### 3. .cargo/config.toml
```toml
[target.x86_64-pc-windows-msvc]
rustflags = [
    "-C", "target-feature=+crt-static",
    "-C", "link-arg=/SUBSYSTEM:WINDOWS,6.01"
]
```
- `crt-static`: 静态链接 C 运行时，减少 DLL 依赖
- `/SUBSYSTEM:WINDOWS,6.01`: 指定支持 Windows 7 (6.1)

## Windows 7 系统要求

### 必需更新
确保 Windows 7 已安装：
- Service Pack 1 (SP1)
- KB3063858 - Universal C Runtime 更新
- KB2999226 - Visual C++ Redistributable 依赖
- TLS 1.2 支持（KB3140245 等）

### WebView2 运行时
应用需要 WebView2 运行时。安装程序已配置为嵌入引导程序，会自动处理。

## 故障排除

### 问题 1：Rust 版本太新
**症状**: 构建成功但 Windows 7 上仍然报错
**解决**: 
```bash
rustup default 1.77.2
cargo clean
cargo build --release
```

### 问题 2：缺少 Visual C++ Redistributable
**症状**: 运行时提示缺少 VCRUNTIME140.dll 等
**解决**: 在目标 Windows 7 系统上安装 Visual C++ Redistributable 2015-2022

### 问题 3：WebView2 安装失败
**症状**: 应用启动后白屏或报错
**解决**: 
- 确保 Windows 7 已启用 TLS 1.2
- 手动下载并安装 WebView2 运行时

### 问题 4：构建时出现链接错误
**症状**: `link.exe` 相关错误
**解决**: 确保已安装 Visual Studio 2019/2022 的 C++ 构建工具

## 验证 Windows 7 兼容性

构建完成后，可以使用以下工具检查可执行文件的兼容性：

1. **Dependency Walker**: 检查 DLL 依赖
2. **dumpbin**: Visual Studio 自带的工具
   ```bash
   dumpbin /headers target\release\gift-book.exe | findstr "subsystem"
   ```
   应显示 `6.01` 或更低版本

## 替代方案

如果 Windows 7 兼容性无法解决：

1. **升级操作系统**: 建议升级到 Windows 10/11
2. **使用 Web 版本**: 如果应用有 Web 版本，可以在 Windows 7 浏览器中使用
3. **虚拟机**: 在 Windows 7 上运行 Windows 10 虚拟机来使用应用

## 参考链接

- [Tauri Windows 7 支持文档](https://v2.tauri.app/distribute/windows-installer/#supporting-windows-7)
- [Rust Windows 7 兼容性](https://github.com/tauri-apps/tauri/issues/13738)
- [Microsoft: GetSystemTimePreciseAsFileTime](https://docs.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getsystemtimepreciseasfiletime)
