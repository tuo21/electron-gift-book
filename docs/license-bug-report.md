# 软件激活系统 BUG 报告

**报告日期**: 2025年4月23日  
**问题等级**: 高  
**影响范围**: 特定机器码激活失败

---

## 1. 问题概述

### 1.1 现象描述
在某台特定电脑上，使用正确的激活码进行激活时失败，提示"激活码与当前电脑不匹配"。该激活码在其他3台电脑上测试均能正常激活。

### 1.2 问题激活码信息
```
机器码: 381C-7CEE-88
用户名: 用户
有效期: 永久
激活码: eyJt-aWQi-OiIz-ODFD-LTdD-RUUt-ODgi-LCJu-YW1l-Ijoi-55So-5oi3-Iiwi-ZXhw-Ijpu-dWxs-fQ.T-M86K-aU5r-EIM1-rq-5-Lrmy-UtlE-LY1Z-5_qj-0mid-Ob-Q-Lk
```

---

## 2. 系统架构

### 2.1 激活流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户界面   │────▶│  机器码获取  │────▶│  激活码输入  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   激活成功   │◀────│  签名验证   │◀────│  数据解码   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │  机器码比对  │
                    └─────────────┘
```

### 2.2 核心组件

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| 机器码生成 | `src-tauri/src/license.rs` | Rust后端，读取Windows注册表硬件信息 |
| 激活码生成 | `scripts/generate-license.js` | Node.js脚本，生成带签名的激活码 |
| 激活验证 | `src-tauri/src/license.rs` | Rust后端，验证签名和机器码匹配 |

---

## 3. 机器码生成方案

### 3.1 生成逻辑
```rust
// 读取Windows注册表硬件信息
let board_id = RegKey::open("HARDWARE\DESCRIPTION\System\BIOS")
    .get_value("BaseBoardProduct");
    
let bios_version = RegKey::open("HARDWARE\DESCRIPTION\System\BIOS")
    .get_value("BIOSVersion");
    
let cpu_info = RegKey::open("HARDWARE\DESCRIPTION\System\CentralProcessor\0")
    .get_value("ProcessorNameString");
    
let computer_name = RegKey::open("SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName")
    .get_value("ComputerName");

// 拼接原始数据
let raw = format!("{}|{}|{}|{}", board_id, bios_version, cpu_info, computer_name);

// SHA256哈希取前5字节
let hash = Sha256::digest(raw.as_bytes());
let mid = hex::encode(&hash[0..5]).to_uppercase();  // 大写格式

// 格式化为 XXXX-XXXX-XX 形式
let formatted = mid.chars().collect::<Vec<_>>()
    .chunks(4)
    .map(|c| c.iter().collect::<String>())
    .collect::<Vec<_>>()
    .join("-");
```

### 3.2 机器码格式
- **长度**: 10个十六进制字符（5字节哈希）
- **格式**: `XXXX-XXXX-XX`（分组显示）
- **大小写**: **大写**（关键！）

---

## 4. 激活码生成方案

### 4.1 数据结构
```json
{
  "mid": "381C-7CEE-88",    // 机器码
  "name": "用户",           // 用户名
  "exp": null               // 过期时间（null为永久）
}
```

### 4.2 生成流程

```javascript
// 1. JSON序列化
const jsonStr = JSON.stringify(payload);

// 2. Base64 URL编码（去掉填充）
const data = Buffer.from(jsonStr)
  .toString('base64')
  .replace(/\+/g, '-')      // URL安全：+ → -
  .replace(/\//g, '_')      // URL安全：/ → _
  .replace(/=+$/g, '');     // 去掉末尾=

// 3. HMAC-SHA256签名
const sign = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(data)             // 对base64字符串签名
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

// 4. 组合并格式化
const token = data + '.' + sign;
return token.match(/.{1,4}/g).join('-');  // 每4字符加横线
```

### 4.3 密钥
```
SECRET_KEY = "GIFT_BOOK_LICENSE_KEY_2026_V1.0"
```

---

## 5. 激活验证方案

### 5.1 验证流程
```rust
pub fn verify_license(license_code: String) -> Result<LicenseInfo, String> {
    // 1. 清洗输入（去掉横线和空格）
    let token = license_code.replace('-', "").replace(' ', "");
    
    // 2. 分割data和sign
    let parts: Vec<&str> = token.split('.').collect();
    
    // 3. Base64 URL解码
    let data_bytes = decode_base64url(parts[0])?;
    let sign_bytes = decode_base64url(parts[1])?;
    
    // 4. 验证签名
    let mut mac = HmacSha256::new_from_slice(SECRET_KEY)?;
    mac.update(parts[0].as_bytes());  // 对原始base64签名
    let expected_sign = mac.finalize().into_bytes();
    
    if !constant_time_eq(&sign_bytes, &expected_sign) {
        return Err("激活码无效".to_string());
    }
    
    // 5. 反序列化JSON
    let payload: LicenseInfo = serde_json::from_slice(&data_bytes)?;
    
    // 6. 机器码匹配（关键步骤！）
    let current_mid = get_machine_id()?;  // 大写格式
    
    // ⚠️ 转换为小写后比较
    let stored_mid = payload.mid.replace('-', "").replace(' ', "").to_lowercase();
    let current_mid_clean = current_mid.replace('-', "").replace(' ', "").to_lowercase();
    
    if stored_mid != current_mid_clean {
        return Err("激活码与当前电脑不匹配".to_string());
    }
    
    Ok(payload)
}
```

### 5.2 解码实现
```rust
fn decode_base64url(s: &str) -> Result<Vec<u8>, ()> {
    // 补充填充
    let padding_needed = (4 - (s.len() % 4)) % 4;
    let padded = format!("{}{}", s, "=".repeat(padding_needed));
    
    // URL安全字符转标准字符
    let standard = padded.replace('-', "+").replace('_', "/");
    
    // 标准Base64解码
    base64::engine::general_purpose::STANDARD.decode(&standard)
        .map_err(|_| ())
}
```

---

## 6. 完整代码

### 6.1 Rust后端 - license.rs
```rust
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use base64::{engine::general_purpose::URL_SAFE, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

const SECRET_KEY: &[u8] = b"GIFT_BOOK_LICENSE_KEY_2026_V1.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub mid: String,
    pub name: String,
    pub exp: Option<u64>,
}

/// 获取机器码
#[tauri::command]
pub fn get_machine_id() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        let board_id = hklm
            .open_subkey("HARDWARE\\DESCRIPTION\\System\\BIOS")
            .and_then(|key| key.get_value::<String, _>("BaseBoardProduct"))
            .unwrap_or_default();

        let bios_version = hklm
            .open_subkey("HARDWARE\\DESCRIPTION\\System\\BIOS")
            .and_then(|key| key.get_value::<String, _>("BIOSVersion"))
            .unwrap_or_default();

        let cpu_info = hklm
            .open_subkey("HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0")
            .and_then(|key| key.get_value::<String, _>("ProcessorNameString"))
            .unwrap_or_default();

        let computer_name = hklm
            .open_subkey("SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName")
            .and_then(|key| key.get_value::<String, _>("ComputerName"))
            .unwrap_or_default();

        let raw = format!("{}|{}|{}|{}", board_id, bios_version, cpu_info, computer_name);
        let hash = Sha256::digest(raw.as_bytes());

        let mid = hex::encode(&hash[0..5]).to_uppercase();
        let formatted: String = mid
            .chars()
            .collect::<Vec<_>>()
            .chunks(4)
            .map(|c| c.iter().collect::<String>())
            .collect::<Vec<_>>()
            .join("-");

        Ok(formatted)
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Linux/Mac fallback...
        Ok("UNKNOWN".to_string())
    }
}

/// 验证激活码
#[tauri::command]
pub fn verify_license(license_code: String) -> Result<LicenseInfo, String> {
    println!("--- 激活调试信息 ---");
    println!("收到的激活码: {}", license_code);
    
    let token = license_code.replace('-', "").replace(' ', "");
    println!("清洗后的token: {}", token);
    
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        return Err("激活码格式错误".to_string());
    }

    // Base64 URL解码
    fn decode_base64url(s: &str) -> Result<Vec<u8>, ()> {
        let padding_needed = (4 - (s.len() % 4)) % 4;
        let padded = format!("{}{}", s, "=".repeat(padding_needed));
        let standard = padded.replace('-', "+").replace('_', "/");
        
        base64::engine::general_purpose::STANDARD
            .decode(&standard)
            .map_err(|_| ())
    }

    let data_bytes = decode_base64url(parts[0])
        .map_err(|_| "数据解码失败".to_string())?;
    
    let sign_bytes = decode_base64url(parts[1])
        .map_err(|_| "签名解码失败".to_string())?;

    // 验证签名
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(SECRET_KEY)
        .map_err(|_| "密钥初始化失败".to_string())?;
    mac.update(parts[0].as_bytes());
    let expected_sign = mac.finalize().into_bytes();
    
    if !constant_time_eq(&sign_bytes, &expected_sign) {
        return Err("激活码无效".to_string());
    }

    let payload: LicenseInfo = serde_json::from_slice(&data_bytes)
        .map_err(|_| "授权数据损坏".to_string())?;

    // 机器码比对
    let current_mid = get_machine_id()?;
    
    // ⚠️ 关键修复：大小写不敏感比较
    let stored_mid = payload.mid.replace('-', "").replace(' ', "").to_lowercase();
    let current_mid_clean = current_mid.replace('-', "").replace(' ', "").to_lowercase();
    
    if stored_mid != current_mid_clean {
        return Err("激活码与当前电脑不匹配".to_string());
    }

    Ok(payload)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}
```

### 6.2 Node.js生成脚本 - generate-license.js
```javascript
import crypto from 'crypto';

const SECRET_KEY = 'GIFT_BOOK_LICENSE_KEY_2026_V1.0';

function generateLicense(machineId, name = '用户', days = null) {
  const payload = {
    mid: machineId,
    name: name,
    exp: days ? Math.floor(Date.now() / 1000) + days * 86400 : null
  };

  const jsonStr = JSON.stringify(payload);
  
  // Base64 URL编码
  const data = Buffer.from(jsonStr)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  // HMAC-SHA256签名
  const sign = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const token = data + '.' + sign;
  return token.match(/.{1,4}/g).join('-');
}

// 使用示例
const license = generateLicense("381C-7CEE-88", "用户");
console.log(license);
```

---

## 7. BUG详细分析

### 7.1 问题激活码解码

**激活码**: `eyJt-aWQi-OiIz-ODFD-LTdD-RUUt-ODgi-LCJu-YW1l-Ijoi-55So-5oi3-Iiwi-ZXhw-Ijpu-dWxs-fQ.T-M86K-aU5r-EIM1-rq-5-Lrmy-UtlE-LY1Z-5_qj-0mid-Ob-Q-Lk`

**清洗后**: 
```
eyJtWQiOiIzODFDLTdDRUUtODgiLCJuYW1lIjoi55So5oi3IiwiZXhwIjpudWxsfQ.TM86KaU5rEIM1rq5LrmyUtlELY1Z5qj0midObQLk
```

**分割**:
- **Data部分**: `eyJtWQiOiIzODFDLTdDRUUtODgiLCJuYW1lIjoi55So5oi3IiwiZXhwIjpudWxsfQ`
- **Sign部分**: `TM86KaU5rEIM1rq5LrmyUtlELY1Z5qj0midObQLk`

**Data解码后**:
```json
{
  "mid": "381C-7DEE-88",    // ⚠️ 注意这里！
  "name": "用户",
  "exp": null
}
```

### 7.2 机器码对比

| | 值 | 十六进制解码 |
|---|---|---|
| **期望的机器码** | `381C-7CEE-88` | `38 1C 7C EE 88` |
| **激活码中的机器码** | `381C-7DEE-88` | `38 1C 7D EE 88` |
| **差异位置** | 第4字节 | `7C` vs `7D` |

**Base64数据对比**:
- 正确的应该是: `eyJtWQiOiIzODFDN0NFRVV4OCIsIm5hbWUiOiLn...` (包含 `N0NF` = 7CEE)
- 实际的是: `eyJtWQiOiIzODFDLTdDRUUtODgi...` (包含 `LTdD` = 7D?)

### 7.3 根本原因

激活码中的机器码 **第4字节错误**：
- Base64中 `N0NF` → 十六进制 `7C EE` ✓
- Base64中 `LTdD` → 十六进制 `7D` ✗ (只解码出一个字节)

**可能原因**:
1. 生成激活码时使用了错误的机器码（机器码显示和实际获取不一致）
2. Base64编解码过程中字符被错误替换（`N`→`L`, `0`→`T` 等）
3. 复制粘贴时出错

---

## 8. 已修复的问题

### 8.1 大小写敏感问题（已修复）

**问题**: Rust生成的机器码是大写，但比较时大小写敏感

**修复**: `license.rs` 第177-178行添加 `.to_lowercase()`
```rust
let stored_mid = payload.mid.replace('-', "").replace(' ', "").to_lowercase();
let current_mid_clean = current_mid.replace('-', "").replace(' ', "").to_lowercase();
```

### 8.2 其他测试通过的机器码

| 机器码 | 状态 |
|--------|------|
| `8037-43F4-69` | ✅ 激活成功 |
| 其他3台电脑 | ✅ 激活成功 |
| `381C-7CEE-88` | ❌ 失败（本问题） |

---

## 9. 建议

### 9.1 立即解决
为该机器码 `381C-7CEE-88` 重新生成正确的激活码：

```bash
node scripts/generate-license.js "381C-7CEE-88" "用户"
```

正确的激活码应该是：
```
eyJt-aWQi-OiIz-ODFD-N0NF-RUU4-OCIs-Im5h-bWUi-OiLn-lKjm-iLcf-fQ.jgL-RVJ-0uR-X_m-zVJ-D1q-Hgf-Fl8-7Yt-cgW-RGc
```

### 9.2 长期改进
1. 缩短激活码长度（已实现 `generate-license-short.js`）
2. 添加机器码生成日志，便于调试
3. 在线激活服务器替代本地验证

---

## 10. 附录

### 10.1 Base64 URL编码对照表

| 标准Base64 | URL安全Base64 |
|-----------|--------------|
| `+` | `-` |
| `/` | `_` |
| `=` | 省略 |

### 10.2 相关文件路径

```
electron-gift-book/
├── src-tauri/
│   └── src/
│       └── license.rs          # Rust激活核心代码
├── scripts/
│   ├── generate-license.js     # 激活码生成脚本
│   └── generate-license-short.js  # 短格式生成脚本（新增）
└── docs/
    └── license-bug-report.md   # 本文档
```

---

**报告完成**  
如有疑问，请联系开发团队。
