use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use data_encoding::BASE32_NOPAD;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

// 密钥（生产环境应使用混淆方式存储）
const SECRET_KEY: &[u8] = b"GIFT_BOOK_LICENSE_KEY_2026_V1.0";
const SIGN_BYTES: usize = 6;  // 签名长度

/// 授权信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub mid: String,
    pub name: String,
    pub exp: Option<u64>,
}

/// 获取机器码 - 基于Windows注册表硬件信息，兼容Win7+
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
        let hostname = std::process::Command::new("hostname")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .unwrap_or_default()
            .trim()
            .to_string();

        let raw = format!("{}|{}", hostname, std::process::id());
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
}

/// 模糊匹配：检查机器码是否匹配
fn fuzzy_match(stored_mid: &str, current_mid: &str) -> bool {
    let stored_clean = stored_mid.replace('-', "").replace(' ', "").to_lowercase();
    let current_clean = current_mid.replace('-', "").replace(' ', "").to_lowercase();
    if stored_clean == current_clean { return true }
    if stored_clean.len() >= 8 && current_clean.len() >= 8 {
        if &stored_clean[..8] == &current_clean[..8] { return true }
    }
    if stored_clean.len() >= 4 && current_clean.len() >= 4 {
        if &stored_clean[..4] == &current_clean[..4] { return true }
    }
    false
}

/// 验证短激活码（Crockford Base32 格式）
#[tauri::command]
pub fn verify_license(license_code: String) -> Result<LicenseInfo, String> {
    println!("--- 激活调试信息 ---");
    println!("收到的激活码: {}", license_code);

    // 清洗输入：去横线、空格，转大写
    let clean = license_code.replace('-', "").replace(' ', "").to_uppercase();
    println!("清洗后: {}", clean);

    // Base32 解码 (Crockford)
    let combined = match BASE32_NOPAD.decode(clean.as_bytes()) {
        Ok(v) => {
            println!("Base32解码成功，长度: {}", v.len());
            v
        },
        Err(e) => {
            println!("Base32解码失败: {:?}", e);
            return Err("激活码格式错误，请检查是否复制完整".to_string());
        }
    };

    // 检查最小长度 (签名6字节 + 机器码4字节 + 用户名1字节 = 11字节)
    if combined.len() < SIGN_BYTES + 5 {
        println!("激活码太短: {} 字节", combined.len());
        return Err("激活码格式错误，长度不足".to_string());
    }

    // 分离签名和payload
    let sign_bytes = &combined[..SIGN_BYTES];
    let payload_bytes = &combined[SIGN_BYTES..];
    println!("签名长度: {}, Payload长度: {}", sign_bytes.len(), payload_bytes.len());

    // 验证 HMAC
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(SECRET_KEY)
        .map_err(|_| "密钥初始化失败".to_string())?;
    mac.update(payload_bytes);
    let expected_sign = mac.finalize().into_bytes();
    
    println!("预期签名: {:?}", &expected_sign[..SIGN_BYTES]);
    println!("实际签名: {:?}", sign_bytes);

    if !constant_time_eq(sign_bytes, &expected_sign[..SIGN_BYTES]) {
        println!("签名验证失败！");
        return Err("激活码无效或已被篡改".to_string());
    }
    println!("签名验证通过！");

    // 解析 payload
    // 格式: [机器码4字节][用户名1字节][过期时间4字节(可选)]
    if payload_bytes.len() < 5 {
        return Err("激活码数据损坏".to_string());
    }

    let mid_bytes = &payload_bytes[..4];
    let name_byte = payload_bytes[4];
    let has_exp = payload_bytes.len() >= 9;

    // 机器码转十六进制 (4字节 = 8个十六进制字符)
    let mid = hex::encode(mid_bytes).to_uppercase();
    // 格式化为 XXXX-XXXX 形式 (前4位-后4位)
    let formatted_mid = if mid.len() >= 8 {
        format!("{}-{}", &mid[..4], &mid[4..8])
    } else {
        format!("{}-XXXX", &mid) // 备用格式
    };

    // 用户名（单字符转字符串）
    let name = String::from_utf8(vec![name_byte])
        .unwrap_or_else(|_| "用户".to_string());

    // 过期时间
    let exp = if has_exp {
        let exp_bytes = &payload_bytes[5..9];
        let exp_time = u32::from_be_bytes([exp_bytes[0], exp_bytes[1], exp_bytes[2], exp_bytes[3]]) as u64;
        Some(exp_time)
    } else {
        None
    };

    println!("解析结果: mid={}, name={}, exp={:?}", formatted_mid, name, exp);

    // 机器码匹配检查
    let current_mid = get_machine_id()?;
    println!("当前机器码: {}", current_mid);
    println!("激活码机器码: {}", formatted_mid);

    if !fuzzy_match(&formatted_mid, &current_mid) {
        println!("机器码不匹配！");
        return Err(format!(
            "激活码与当前电脑不匹配\n当前机器码: {}\n激活码绑定: {}",
            current_mid, formatted_mid
        ));
    }
    println!("机器码匹配！");

    // 过期检查
    if let Some(exp_time) = exp {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        println!("当前时间: {}, 过期时间: {}", now, exp_time);
        if now > exp_time {
            println!("已过期！");
            return Err("激活码已过期".to_string());
        }
    }

    println!("--- 验证成功 ---");
    Ok(LicenseInfo {
        mid: formatted_mid,
        name,
        exp,
    })
}

/// 保存激活信息到本地
#[tauri::command]
pub fn save_license(app: AppHandle, license_code: String) -> Result<(), String> {
    let info = verify_license(license_code.clone())?;

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "无法获取应用数据目录".to_string())?;

    if !app_data.exists() {
        fs::create_dir_all(&app_data)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }

    let license_data = serde_json::json!({
        "code": license_code,
        "info": {
            "mid": info.mid,
            "name": info.name,
            "exp": info.exp
        },
        "activated_at": chrono::Utc::now().to_rfc3339(),
        "version": 2  // 标记为新版本格式
    });

    let path = app_data.join("license.json");
    fs::write(
        &path,
        serde_json::to_string_pretty(&license_data).unwrap(),
    )
    .map_err(|e| format!("保存失败: {}", e))?;

    log::info!("激活成功: {}", info.name);
    Ok(())
}

/// 获取当前激活状态
#[tauri::command]
pub fn get_license_status(app: AppHandle) -> Option<LicenseInfo> {
    let app_data = app.path().app_data_dir().ok()?;
    let path = app_data.join("license.json");

    if !path.exists() {
        return None;
    }

    let content = fs::read_to_string(&path).ok()?;
    let data: serde_json::Value = serde_json::from_str(&content).ok()?;
    let code = data["code"].as_str()?;

    verify_license(code.to_string()).ok()
}

/// 检查是否已激活
#[tauri::command]
pub fn is_activated(app: AppHandle) -> bool {
    get_license_status(app).is_some()
}

/// 清除激活信息（用于测试）
#[tauri::command]
pub fn clear_license(app: AppHandle) -> Result<(), String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "无法获取应用数据目录".to_string())?;
    
    let path = app_data.join("license.json");
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("删除失败: {}", e))?;
        log::info!("激活信息已清除");
    }
    
    Ok(())
}

/// 常量时间比较，防止时序攻击
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
