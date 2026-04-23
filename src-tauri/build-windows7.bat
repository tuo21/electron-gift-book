@echo off
chcp 65001 >nul
echo ==========================================
echo  电子礼金簿 - Windows 7 兼容构建脚本
echo ==========================================
echo.

REM 检查 Rust 版本
echo [1/3] 检查 Rust 版本...
rustc --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Rust，请先安装 Rust
    echo 访问 https://rustup.rs/ 安装
    pause
    exit /b 1
)

echo 当前 Rust 版本:
rustc --version
echo.

REM 检查是否为 1.77.2 或更早版本
echo [2/3] 检查 Rust 版本兼容性...
for /f "tokens=2" %%i in ('rustc --version') do set RUST_VER=%%i
echo 检测到的版本: %RUST_VER%

echo.
echo 注意：Windows 7 支持需要 Rust 1.77.2 或更早版本
echo 如果版本较新，请运行：rustup install 1.77.2 ^&^& rustup default 1.77.2
echo.

REM 安装 Windows 目标（如果不存在）
echo [3/3] 确保 Windows 目标已安装...
rustup target add x86_64-pc-windows-msvc 2>nul
echo.

REM 清理之前的构建
echo 清理之前的构建...
cargo clean
echo.

REM 设置环境变量并构建
echo ==========================================
echo 开始构建 Windows 7 兼容版本...
echo ==========================================
echo.

set RUSTFLAGS=-C target-feature=+crt-static -C link-arg=/SUBSYSTEM:WINDOWS,6.01
cargo build --release

if errorlevel 1 (
    echo.
    echo ==========================================
    echo 构建失败！
    echo ==========================================
    echo.
    echo 可能的解决方案：
    echo 1. 降级 Rust 到 1.77.2：rustup default 1.77.2
    echo 2. 确保已安装 Visual Studio C++ 构建工具
    echo 3. 检查 Cargo.toml 中的依赖版本
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo 构建成功！
echo ==========================================
echo.
echo 输出文件：target\release\gift-book.exe
echo.
pause