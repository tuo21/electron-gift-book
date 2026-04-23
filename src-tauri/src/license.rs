use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use base64::{engine::general_purpose::URL_SAFE, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

// 密钥（生产环境应使用混淆方式存储）
const SECRET_KEY: &[u8] = b"GIFT_BOOK_LICENSE_KEY_2026_V1.0"; // 替换为实际密钥

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

/// 验证激活码
#[tauri::command]
pub fn verify_license(license_code: String) -> Result<LicenseInfo, String> {
    println!("--- 激活调试信息 ---");
    println!("收到的激活码: {}", license_code);
    
    // 只去掉空格和短横线，⚠️ 绝对不要转大小写！！！
    let token = license_code.replace('-', "").replace(' ', "");
    println!("清洗后的token: {}", token);
    
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        println!("错误: 格式错误，期望有 '.'");
        return Err("激活码格式错误".to_string());
    }
    println!("Data部分: {}", parts[0]);
    println!("Sign部分: {}", parts[1]);

    // 自定义兼容的Base64 URL解码（支持末尾缺少填充的情况）
    fn decode_base64url(s: &str) -> Result<Vec<u8>, ()> {
        // 先补充可能缺少的填充
        let padding_needed = (4 - (s.len() % 4)) % 4;
        let padded = format!("{}{}", s, "=".repeat(padding_needed));
        
        // 使用标准的Base64解码（先把URL安全字符换回标准字符）
        let standard = padded.replace('-', "+").replace('_', "/");
        
        base64::engine::general_purpose::STANDARD
            .decode(&standard)
            .map_err(|_| ())
    }

    let data_bytes = match decode_base64url(parts[0]) {
        Ok(b) => {
            println!("数据解码成功，长度: {}", b.len());
            b
        },
        Err(e) => {
            println!("数据解码失败: {:?}", e);
            return Err("数据解码失败".to_string());
        }
    };
    
    let sign_bytes = match decode_base64url(parts[1]) {
        Ok(b) => {
            println!("签名解码成功，长度: {}", b.len());
            b
        },
        Err(e) => {
            println!("签名解码失败: {:?}", e);
            return Err("签名解码失败".to_string());
        }
    };

    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(SECRET_KEY)
        .map_err(|_| "密钥初始化失败".to_string())?;
    // ✅ 正确：用原始的base64url字符串（parts[0]）计算HMAC！
    mac.update(parts[0].as_bytes()); 
    let expected_sign = mac.finalize().into_bytes();
    println!("预期签名长度: {}，实际签名长度: {}", expected_sign.len(), sign_bytes.len());
    
    // 打印字节对比
    println!("实际签名字节: {:?}", sign_bytes);
    println!("预期签名字节: {:?}", expected_sign);
    
    if !constant_time_eq(&sign_bytes, &expected_sign) {
        println!("签名不匹配！验证失败");
        return Err("激活码无效".to_string());
    }
    println!("签名验证通过！");

    let payload: LicenseInfo = match serde_json::from_slice(&data_bytes) {
        Ok(p) => {
            println!("反序列化成功: {:?}", p);
            p
        },
        Err(e) => {
            println!("反序列化失败: {:?}", e);
            return Err("授权数据损坏".to_string());
        }
    };

    let current_mid = get_machine_id()?;
    println!("当前机器码: {}", current_mid);
    println!("激活码中的机器码: {}", payload.mid);
    
    let stored_mid = payload.mid.replace('-', "").replace(' ', "");
    let current_mid_clean = current_mid.replace('-', "").replace(' ', "");
    println!("清洗后当前: {}，清洗后存储: {}", current_mid_clean, stored_mid);
    
    if stored_mid != current_mid_clean {
        println!("机器码不匹配！");
        return Err("激活码与当前电脑不匹配".to_string());
    }
    println!("机器码匹配！");

    if let Some(exp) = payload.exp {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        println!("当前时间: {}，过期时间: {}", now, exp);
        if now > exp {
            println!("已过期！");
            return Err("激活码已过期".to_string());
        }
    }

    println!("--- 验证成功 ---");
    Ok(payload)
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
        "activated_at": chrono::Utc::now().to_rfc3339()
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
