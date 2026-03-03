# Tauri 读取 Windows 系统字体计划

## 目标
通过 Tauri 后端动态读取 Windows 系统自带的宋体(simsun.ttc)和楷体(simkai.ttf)文件，供前端 jsPDF 使用，避免将字体文件打包到项目中。

## 实施步骤

### 步骤 1: 修改 src-tauri/Cargo.toml
- 添加 `base64` 依赖用于将字体文件转为 Base64
- 添加 `std::fs` 和 `std::path` 相关功能

### 步骤 2: 修改 src-tauri/src/main.rs
1. 创建 `get_system_font` 命令函数：
   - 接收 `font_name` 参数（"simsun" 或 "simkai"）
   - 构建字体文件路径：`C:\Windows\Fonts\{font_file}`
   - 支持的字体映射：
     - "simsun" → simsun.ttc 或 simsun.ttf
     - "simkai" → simkai.ttf 或 simkai.ttc
   - 读取文件内容为字节数组
   - 使用 base64 编码返回字符串
   - 错误处理：文件不存在、读取失败等情况

2. 在 `generate_handler!` 宏中注册 `get_system_font` 命令

### 步骤 3: 修改前端 pdfExport.ts
1. 创建 `loadSystemFont` 函数：
   - 使用 `@tauri-apps/api/core` 的 `invoke` 调用 `get_system_font`
   - 分别获取宋体和楷体的 Base64 数据
   - 缓存结果避免重复调用

2. 修改 `createChinesePDF` 函数：
   - 调用 `loadSystemFont` 获取系统字体
   - 使用 `pdf.addFileToVFS` 注册字体
   - 使用 `pdf.addFont` 添加字体
   - 设置字体别名：'SimSun' 和 'STKaiti'

3. 修改 `setFont` 函数：
   - 支持 'SimSun' 和 'STKaiti' 两种字体
   - 如果系统字体加载失败，回退到嵌入字体

### 步骤 4: 更新字体使用逻辑
- 页眉日期、页脚、支付类型、金额小写 → SimSun（宋体）
- 备注、物品描述 → STKaiti（楷体）
- 名字、金额中文、标题 → XuandongKaishu（原有字体）

## 文件变更清单
1. `src-tauri/Cargo.toml` - 添加 base64 依赖
2. `src-tauri/src/main.rs` - 添加 get_system_font 命令
3. `src/utils/pdfExport.ts` - 修改字体加载逻辑

## 注意事项
- Windows 系统字体路径固定为 `C:\Windows\Fonts\`
- 需要处理字体文件可能是 .ttf 或 .ttc 格式
- 添加适当的错误处理和日志输出
- 考虑字体加载失败时的回退机制
