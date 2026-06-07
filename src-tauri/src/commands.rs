use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use base64::Engine;
use serde::{Deserialize, Serialize};

use crate::database::*;
use crate::models::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(non_snake_case)]
pub struct AppConfig {
    customDataPath: Option<String>,
    eventName: String,
    theme: String,
    displayStyle: String,
    customFontCssName: Option<String>,
    eventDate: Option<String>,
    recentBooks: Vec<RecentBook>,
    unnamedIndex: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentBook {
    name: String,
    path: String,
    last_opened: String,
    theme: Option<String>,
    event_name: Option<String>,
    event_date: Option<String>,
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| format!("获取数据目录失败: {}", e))?;
    Ok(data_dir.join("app_config.json"))
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            customDataPath: None,
            eventName: String::new(),
            theme: "red".to_string(),
            displayStyle: "full".to_string(),
            customFontCssName: None,
            eventDate: None,
            recentBooks: Vec::new(),
            unnamedIndex: 1,
        }
    }
}

fn load_app_config(app: &AppHandle) -> Option<AppConfig> {
    let config_path = get_config_path(app).ok()?;
    if config_path.exists() {
        match std::fs::read_to_string(&config_path) {
            Ok(content) => {
                match serde_json::from_str(&content) {
                    Ok(config) => Some(config),
                    Err(e) => {
                        log::error!("解析配置文件失败: {}", e);
                        Some(AppConfig::default())
                    }
                }
            }
            Err(e) => {
                log::error!("读取配置文件失败: {}", e);
                Some(AppConfig::default())
            }
        }
    } else {
        Some(AppConfig::default())
    }
}

fn save_app_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path(app)?;
    
    // 确保数据目录存在
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("创建数据目录失败: {}", e))?;
        }
    }
    
    let content = serde_json::to_string_pretty(config).map_err(|e| format!("序列化配置失败: {}", e))?;
    std::fs::write(&config_path, content).map_err(|e| format!("保存配置失败: {}", e))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontInfoDto {
    pub name: String,
    pub css_name: String,
    pub is_default: bool,
}

// 清理字体名称，对于用 & 或其他分隔符连接的多个名称，只保留第一个
fn clean_font_name(name: &str) -> String {
    let mut clean = name.trim().to_string();
    
    // 移除扩展名和 (TrueType)/(OpenType) 等后缀
    if let Some(idx) = clean.find('(') {
        clean = clean[..idx].trim().to_string();
    }
    
    // 处理多种分隔符：&, &amp;, |, , 
    let separators = [" &amp; ", " & ", " | ", "|", ", "];
    for sep in separators.iter() {
        if clean.contains(sep) {
            if let Some(first) = clean.split(sep).next() {
                clean = first.trim().to_string();
            }
        }
    }
    
    clean
}

// 获取字体的 CSS 名称
// WebView2 只识别原始字体族名（如 SimSun、KaiTi），不识别中文别名
fn get_css_font_name(name: &str) -> String {
    // 中文字体名→英文字体名映射，确保 CSS 使用 WebView2 可识别的名称
    let cn_to_en: Vec<(&str, &str)> = vec![
        ("宋体", "SimSun"),
        ("黑体", "SimHei"),
        ("楷体", "KaiTi"),
        ("仿宋", "FangSong"),
        ("幼圆", "YouYuan"),
        ("隶书", "LiSu"),
        ("微软雅黑", "Microsoft YaHei"),
        ("微软正黑", "Microsoft JhengHei"),
        ("华文宋体", "STSong"),
        ("华文楷体", "STKaiti"),
        ("华文中宋", "STZhongsong"),
        ("华文行楷", "STXingkai"),
        ("华文新魏", "STXinwei"),
        ("华文琥珀", "STHupo"),
        ("华文彩云", "STCaiyun"),
        ("华文隶书", "STLiti"),
        ("等线", "DengXian"),
        ("方正舒体", "FZShuTi"),
        ("方正姚体", "FZYaoti"),
    ];

    for (cn_name, en_name) in &cn_to_en {
        if name == *cn_name {
            return en_name.to_string();
        }
    }

    name.to_string()
}

#[tauri::command]
pub async fn get_system_fonts_list() -> Result<Vec<FontInfoDto>, String> {
    let mut font_names = std::collections::HashSet::new();
    
    // 预定义常见中文字体，作为后备
    let common_fonts = vec![
        "演示春风楷",
        "KaiTi", "楷体",
        "SimSun", "宋体",
        "SimHei", "黑体",
        "Microsoft YaHei", "微软雅黑",
        "FangSong", "仿宋",
        "YouYuan", "幼圆",
        "LiSu", "隶书",
        "STSong", "华文宋体",
        "STKaiti", "华文楷体",
        "STZhongsong", "华文中宋",
        "STXingkai", "华文行楷",
        "STXinwei", "华文新魏",
        "STHupo", "华文琥珀",
        "STCaiyun", "华文彩云",
        "STLiti", "华文隶书",
        "DengXian", "等线",
        "FZShuTi", "方正舒体",
        "FZYaoti", "方正姚体",
        "Arial",
        "Times New Roman",
        "Calibri",
        "Consolas",
    ];
    
    // 先添加预定义字体
    for font in common_fonts {
        font_names.insert(font.to_string());
    }
    
    // 尝试从 Windows 注册表获取系统字体
    #[cfg(target_os = "windows")]
    {
        use winreg::RegKey;
        use winreg::enums::*;
        
        // 读取系统字体注册表
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        if let Ok(fonts_key) = hklm.open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts") {
            for (name, _) in fonts_key.enum_values().flatten() {
                let clean_name = clean_font_name(&name);
                if !clean_name.is_empty() {
                    font_names.insert(clean_name);
                }
            }
        }
        
        // 读取当前用户字体注册表
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(fonts_key) = hkcu.open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts") {
            for (name, _) in fonts_key.enum_values().flatten() {
                let clean_name = clean_font_name(&name);
                if !clean_name.is_empty() {
                    font_names.insert(clean_name);
                }
            }
        }
    }
    
    // 转换为 Vec 并排序
    let mut font_names_vec: Vec<String> = font_names.into_iter().collect();
    font_names_vec.sort();
    
    // 创建 FontInfoDto 列表
    let mut result: Vec<FontInfoDto> = font_names_vec
        .into_iter()
        .map(|name| {
            let css_name = get_css_font_name(&name);
            FontInfoDto {
                name: name.clone(),
                css_name,
                is_default: false,
            }
        })
        .collect();
    
    // 设置默认字体
    if let Some(pos) = result.iter().position(|f| f.name.contains("演示春风楷")) {
        let mut default_font = result.remove(pos);
        default_font.is_default = true;
        result.insert(0, default_font);
    } else if let Some(pos) = result.iter().position(|f| f.name.contains("KaiTi") || f.name.contains("楷体")) {
        let mut default_font = result.remove(pos);
        default_font.is_default = true;
        result.insert(0, default_font);
    } else if !result.is_empty() {
        result[0].is_default = true;
    }
    
    log::info!("返回系统字体 {} 个", result.len());
    Ok(result)
}

pub fn init_custom_data_path(app: &AppHandle) {
    if let Some(config) = load_app_config(app) {
        if let Some(path) = config.customDataPath {
            let path_buf = PathBuf::from(&path);
            if path_buf.exists() && path_buf.is_dir() {
                set_custom_data_dir(path_buf);
            }
        }
    }
}

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

async fn get_pool_connection() -> Result<sqlx::SqlitePool, String> {
    let pool = get_pool();
    let pool_guard = pool.read().await;
    pool_guard.clone().ok_or("数据库未初始化".to_string())
}

#[tauri::command]
pub async fn update_database_event_date(
    file_path: String,
    event_date: String,
) -> Result<ApiResponse<()>, String> {
    let temp_path = PathBuf::from(&file_path);
    if !temp_path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let db_url = format!("sqlite:{}", temp_path.to_string_lossy());
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;

    sqlx::query("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('event_date', ?)")
        .bind(&event_date)
        .execute(&pool)
        .await
        .map_err(|e| format!("更新事件日期失败: {}", e))?;

    log::info!("更新数据库事件日期: {}, 日期: {}", file_path, event_date);
    Ok(ApiResponse {
        success: true,
        data: None,
        error: None,
    })
}

#[tauri::command]
pub async fn get_database_theme(file_path: String) -> Result<String, String> {
    let temp_path = PathBuf::from(&file_path);
    if !temp_path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let db_url = format!("sqlite:{}", temp_path.to_string_lossy());
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;

    let theme: Option<String> = sqlx::query_scalar("SELECT Value FROM Settings WHERE Key = 'theme'")
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("读取主题失败: {}", e))?;

    Ok(theme.unwrap_or_else(|| "red".to_string()))
}

#[tauri::command]
pub async fn update_database_theme(
    file_path: String,
    theme: String,
) -> Result<ApiResponse<()>, String> {
    let temp_path = PathBuf::from(&file_path);
    if !temp_path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let db_url = format!("sqlite:{}", temp_path.to_string_lossy());
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;

    sqlx::query("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('theme', ?)")
        .bind(&theme)
        .execute(&pool)
        .await
        .map_err(|e| format!("更新主题失败: {}", e))?;

    log::info!("更新数据库主题: {}, 主题: {}", file_path, theme);
    Ok(ApiResponse {
        success: true,
        data: None,
        error: None,
    })
}

#[tauri::command]
pub async fn rename_database(
    old_path: String,
    new_file_name: String,
) -> Result<String, String> {
    let path = PathBuf::from(&old_path);
    if !path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let dir = path.parent().ok_or("无法获取父目录")?;
    let new_path = dir.join(format!("{}.db", new_file_name));

    if new_path.exists() {
        return Err("目标文件已存在".to_string());
    }

    // 如果当前连接池正连接在此文件上，需要先关闭连接池
    if let Some(current_path) = get_db_path() {
        if current_path == path {
            clear_pool().await;
            log::info!("关闭当前数据库连接池以便重命名");
        }
    }

    std::fs::rename(&path, &new_path)
        .map_err(|e| format!("重命名失败: {}", e))?;

    log::info!("重命名数据库: {} -> {}", old_path, new_path.to_string_lossy());
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_all_records() -> Result<Vec<Record>, String> {
    let pool = get_pool_connection().await?;
    let result: Result<Vec<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted FROM Records WHERE IsDeleted = 0 ORDER BY CreateTime ASC, Id ASC"
    )
    .fetch_all(&pool)
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_records_paginated(
    page: i32,
    page_size: i32,
) -> Result<PaginationResult<Record>, String> {
    let pool = get_pool_connection().await?;
    let valid_page = page.max(1);
    let valid_page_size = page_size.max(1);
    let offset = (valid_page - 1) * valid_page_size;

    let total_result: Result<(i64,), sqlx::Error> = sqlx::query_as(
        "SELECT COUNT(*) FROM Records WHERE IsDeleted = 0"
    )
    .fetch_one(&pool)
    .await;

    let total = total_result.map_err(|e| e.to_string())?.0;
    let total_pages = ((total as f64) / (valid_page_size as f64)).ceil() as i32;

    let records_result: Result<Vec<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted 
         FROM Records 
         WHERE IsDeleted = 0 
         ORDER BY CreateTime DESC, Id DESC 
         LIMIT ? OFFSET ?"
    )
    .bind(valid_page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    records_result
        .map(|records| PaginationResult {
            records,
            total,
            page: valid_page,
            page_size: valid_page_size,
            total_pages,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_record_page(
    record_id: i64,
    page_size: i32,
) -> Result<Option<i32>, String> {
    let pool = get_pool_connection().await?;
    let record_result: Result<Option<(String, i32)>, sqlx::Error> = sqlx::query_as(
        "SELECT CreateTime, IsDeleted FROM Records WHERE Id = ?"
    )
    .bind(record_id)
    .fetch_optional(&pool)
    .await;

    match record_result {
        Ok(Some((create_time, is_deleted))) => {
            if is_deleted == 1 {
                return Ok(None);
            }

            let position_result: Result<(i64,), sqlx::Error> = sqlx::query_as(
                "SELECT COUNT(*) FROM Records WHERE IsDeleted = 0 AND (CreateTime < ? OR (CreateTime = ? AND Id < ?))"
            )
            .bind(&create_time)
            .bind(&create_time)
            .bind(record_id)
            .fetch_one(&pool)
            .await;

            match position_result {
                Ok(position) => {
                    let page = (position.0 / page_size as i64) + 1;
                    Ok(Some(page as i32))
                }
                Err(e) => Err(e.to_string()),
            }
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_record_by_id(id: i64) -> Result<Option<Record>, String> {
    let pool = get_pool_connection().await?;
    let result: Result<Option<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted FROM Records WHERE Id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_records(keyword: String) -> Result<Vec<Record>, String> {
    let pool = get_pool_connection().await?;
    let like_keyword = format!("%{}%", keyword);

    let result: Result<Vec<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted 
         FROM Records 
         WHERE IsDeleted = 0 AND (GuestName LIKE ? OR Remark LIKE ? OR ItemDescription LIKE ?)
         ORDER BY CreateTime DESC, Id DESC"
    )
    .bind(&like_keyword)
    .bind(&like_keyword)
    .bind(&like_keyword)
    .fetch_all(&pool)
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn insert_record(record: Record) -> Result<i64, String> {
    let pool = get_pool_connection().await?;
    let result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&record.guest_name)
    .bind(record.amount)
    .bind(&record.amount_chinese)
    .bind(&record.item_description)
    .bind(record.payment_type)
    .bind(&record.remark)
    .execute(&pool)
    .await;

    result.map(|r| r.last_insert_rowid()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_record(record: Record) -> Result<(), String> {
    let pool = get_pool_connection().await?;
    let record_id = match record.id {
        Some(id) => id,
        None => return Err("Record ID is required".to_string()),
    };

    let old_record_result: Result<Option<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted FROM Records WHERE Id = ?"
    )
    .bind(record_id)
    .fetch_optional(&pool)
    .await;

    let old_record = match old_record_result {
        Ok(Some(r)) => r,
        Ok(None) => return Err("Record not found".to_string()),
        Err(e) => return Err(e.to_string()),
    };

    let history_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "INSERT INTO Records_History (RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, NewGuestName, NewAmount, NewItemDescription, NewPaymentType, NewRemark, OperationType, UpdateBy, ChangeDesc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(record_id)
    .bind(&old_record.guest_name)
    .bind(old_record.amount)
    .bind(&old_record.item_description)
    .bind(old_record.payment_type)
    .bind(&old_record.remark)
    .bind(&record.guest_name)
    .bind(record.amount)
    .bind(&record.item_description)
    .bind(record.payment_type)
    .bind(&record.remark)
    .bind("UPDATE")
    .bind("System")
    .bind("更新记录")
    .execute(&pool)
    .await;

    if let Err(e) = history_result {
        return Err(e.to_string());
    }

    let update_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "UPDATE Records SET GuestName = ?, Amount = ?, AmountChinese = ?, ItemDescription = ?, PaymentType = ?, Remark = ?, UpdateTime = CURRENT_TIMESTAMP WHERE Id = ?"
    )
    .bind(&record.guest_name)
    .bind(record.amount)
    .bind(&record.amount_chinese)
    .bind(&record.item_description)
    .bind(record.payment_type)
    .bind(&record.remark)
    .bind(record_id)
    .execute(&pool)
    .await;

    update_result.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn soft_delete_record(id: i64) -> Result<(), String> {
    let pool = get_pool_connection().await?;
    let old_record_result: Result<Option<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted FROM Records WHERE Id = ?"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let old_record = match old_record_result {
        Ok(Some(r)) => r,
        Ok(None) => return Err("Record not found".to_string()),
        Err(e) => return Err(e.to_string()),
    };

    let history_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "INSERT INTO Records_History (RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, OperationType, UpdateBy, ChangeDesc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id)
    .bind(&old_record.guest_name)
    .bind(old_record.amount)
    .bind(&old_record.item_description)
    .bind(old_record.payment_type)
    .bind(&old_record.remark)
    .bind("DELETE")
    .bind("System")
    .bind("删除记录")
    .execute(&pool)
    .await;

    if let Err(e) = history_result {
        return Err(e.to_string());
    }

    let delete_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "UPDATE Records SET IsDeleted = 1, UpdateTime = CURRENT_TIMESTAMP WHERE Id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await;

    delete_result.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_deleted_record(history: RecordHistory) -> Result<i64, String> {
    let pool = get_pool_connection().await?;
    
    // 使用历史记录中的原数据创建新记录
    // 新记录的创建时间为当前时间，使其显示在列表最后
    let insert_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&history.guest_name)
    .bind(history.amount.unwrap_or(0))
    .bind("") // AmountChinese 会在数据库触发器中自动计算
    .bind(&history.item_description)
    .bind(history.payment_type.unwrap_or(0))
    .bind(&history.remark)
    .execute(&pool)
    .await;

    let new_record_id = match insert_result {
        Ok(result) => result.last_insert_rowid(),
        Err(e) => return Err(e.to_string()),
    };

    // 添加历史记录，标记为还原操作
    let history_result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
        "INSERT INTO Records_History (RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, OperationType, UpdateBy, ChangeDesc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(new_record_id)
    .bind(&history.guest_name)
    .bind(history.amount)
    .bind(&history.item_description)
    .bind(history.payment_type)
    .bind(&history.remark)
    .bind("RESTORE")
    .bind("System")
    .bind("还原已删除记录")
    .execute(&pool)
    .await;

    if let Err(e) = history_result {
        return Err(e.to_string());
    }

    Ok(new_record_id)
}

#[tauri::command]
pub async fn get_record_history(record_id: i64) -> Result<Vec<RecordHistory>, String> {
    let pool = get_pool_connection().await?;
    let result: Result<Vec<RecordHistory>, sqlx::Error> = sqlx::query_as(
        "SELECT HistoryId, RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, NewGuestName, NewAmount, NewItemDescription, NewPaymentType, NewRemark, OperationType, UpdateBy, UpdateTime, ChangeDesc FROM Records_History WHERE RecordId = ? ORDER BY UpdateTime DESC"
    )
    .bind(record_id)
    .fetch_all(&pool)
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_record_history() -> Result<Vec<RecordHistory>, String> {
    let pool = get_pool_connection().await?;
    let result: Result<Vec<RecordHistory>, sqlx::Error> = sqlx::query_as(
        "SELECT HistoryId, RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, NewGuestName, NewAmount, NewItemDescription, NewPaymentType, NewRemark, OperationType, UpdateBy, UpdateTime, ChangeDesc FROM Records_History WHERE OperationType IN ('UPDATE', 'DELETE', 'RESTORE') ORDER BY UpdateTime DESC"
    )
    .fetch_all(&pool)
    .await;

    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_statistics() -> Result<Statistics, String> {
    let pool = get_pool_connection().await?;
    let result: Result<(i64, i64, i64, i64, i64), sqlx::Error> = sqlx::query_as(
        "SELECT COUNT(*) as count, COALESCE(SUM(Amount), 0) as total, COALESCE(SUM(CASE WHEN PaymentType = 0 THEN Amount ELSE 0 END), 0) as cash, COALESCE(SUM(CASE WHEN PaymentType = 1 THEN Amount ELSE 0 END), 0) as wechat, COALESCE(SUM(CASE WHEN PaymentType = 2 THEN Amount ELSE 0 END), 0) as internal FROM Records WHERE IsDeleted = 0"
    )
    .fetch_one(&pool)
    .await;

    result
        .map(|stats| Statistics {
            total_count: stats.0,
            total_amount: stats.1,
            cash_amount: stats.2,
            wechat_amount: stats.3,
            internal_amount: stats.4,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn batch_insert_records(records: Vec<Record>) -> Result<i32, String> {
    let pool = get_pool_connection().await?;
    let mut count = 0;

    for record in records {
        let result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = sqlx::query(
            "INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&record.guest_name)
        .bind(record.amount)
        .bind(&record.amount_chinese)
        .bind(&record.item_description)
        .bind(record.payment_type)
        .bind(&record.remark)
        .bind(&record.create_time)
        .execute(&pool)
        .await;

        if result.is_ok() {
            count += 1;
        }
    }

    Ok(count)
}

#[tauri::command]
pub async fn open_database_file(app: AppHandle) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("数据库文件", &["db"])
        .set_title("选择礼金簿数据文件")
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("用户取消选择".to_string()),
    }
}

// 允许 Tauri 命令参数使用 camelCase 命名（与前端一致）
#[allow(non_snake_case)]
#[tauri::command]
pub async fn create_new_database(app: AppHandle, file_name: String, theme: Option<String>, eventName: Option<String>, eventDate: Option<String>) -> Result<String, String> {
    let data_dir = get_data_dir(&app);

    if !data_dir.exists() {
        if let Err(e) = std::fs::create_dir_all(&data_dir) {
            return Err(format!("创建目录失败: {}", e));
        }
    }

    let mut new_path = data_dir.join(&file_name);
    let mut counter = 1;

    while new_path.exists() {
        let ext = PathBuf::from(&file_name)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();
        let stem = PathBuf::from(&file_name)
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| file_name.clone());

        let new_name = if ext.is_empty() {
            format!("{}_{}", stem, counter)
        } else {
            format!("{}_{}.{}", stem, counter, ext)
        };
        new_path = data_dir.join(new_name);
        counter += 1;
    }

    let path_str = new_path.to_string_lossy();
    let db_url = format!("sqlite:{}?mode=rwc", path_str);
    
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {} (路径: {})", e, path_str))?;

    let create_tables_sql = get_create_tables_sql();
    for sql in create_tables_sql {
        sqlx::query(sql)
            .execute(&pool)
            .await
            .map_err(|e| format!("创建表失败: {}", e))?;
    }

    // 保存 event_name 和 event_date 到 Settings 表
    if let Some(name) = eventName {
        sqlx::query("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('event_name', ?)")
            .bind(&name)
            .execute(&pool)
            .await
            .map_err(|e| format!("保存 event_name 失败: {}", e))?;
    }
    if let Some(date) = eventDate {
        sqlx::query("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('event_date', ?)")
            .bind(&date)
            .execute(&pool)
            .await
            .map_err(|e| format!("保存 event_date 失败: {}", e))?;
    }
    if let Some(t) = theme {
        sqlx::query("INSERT OR REPLACE INTO Settings (Key, Value) VALUES ('theme', ?)")
            .bind(&t)
            .execute(&pool)
            .await
            .map_err(|e| format!("保存 theme 失败: {}", e))?;
    }

    set_db_path(new_path.clone());
    set_pool(pool).await;

    Ok(new_path.to_string_lossy().to_string())
}

// 从数据库文件中读取 event_name, event_date 和 theme
async fn read_database_event_info(db_path: &str) -> (Option<String>, Option<String>, Option<String>) {
    let db_url = format!("sqlite:{}?mode=ro", db_path);
    
    match sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await
    {
        Ok(pool) => {
            let event_name = sqlx::query_scalar::<_, String>(
                "SELECT Value FROM Settings WHERE Key = 'event_name'"
            )
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();
            
            let event_date = sqlx::query_scalar::<_, String>(
                "SELECT Value FROM Settings WHERE Key = 'event_date'"
            )
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();

            let theme = sqlx::query_scalar::<_, String>(
                "SELECT Value FROM Settings WHERE Key = 'theme'"
            )
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();
            
            pool.close().await;
            (event_name, event_date, theme)
        }
        Err(_) => (None, None, None),
    }
}

#[tauri::command]
pub async fn get_data_path(_app: AppHandle) -> Result<String, String> {
    let custom_dir = get_custom_data_dir();
    match custom_dir {
        Some(dir) => Ok(dir.to_string_lossy().to_string()),
        None => Ok("default".to_string()),
    }
}

#[tauri::command]
pub async fn get_default_data_path(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| format!("获取默认数据目录失败: {}", e))?;
    Ok(data_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn select_data_folder(app: AppHandle) -> Result<String, String> {
    let folder_path = app
        .dialog()
        .file()
        .set_title("选择数据存储文件夹")
        .blocking_pick_folder();

    match folder_path {
        Some(path) => Ok(path.to_string()),
        None => Err("用户取消选择".to_string()),
    }
}

#[tauri::command]
pub async fn set_custom_data_path(app: AppHandle, path: String, migrate: bool) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err("选择的文件夹不存在".to_string());
    }
    
    if !path_buf.is_dir() {
        return Err("选择的不是文件夹".to_string());
    }
    
    // 获取旧数据目录（在设置新路径之前）
    let old_data_dir = get_data_dir(&app);
    
    // 设置自定义数据目录
    crate::database::set_custom_data_dir(path_buf.clone());
    
    // 持久化自定义路径到配置文件
    let mut config = load_app_config(&app).unwrap_or_default();
    config.customDataPath = Some(path_buf.to_string_lossy().to_string());
    save_app_config(&app, &config)?;
    
    // 确保目录存在
    if !path_buf.exists() {
        std::fs::create_dir_all(&path_buf)
            .map_err(|e| format!("创建文件夹失败: {}", e))?;
    }
    
    // 如果需要迁移，迁移旧目录下所有 .db 文件到新目录
    if migrate && old_data_dir.exists() && old_data_dir != path_buf {
        if let Ok(entries) = std::fs::read_dir(&old_data_dir) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                if file_path.extension().map(|e| e == "db").unwrap_or(false) {
                    let file_name = entry.file_name();
                    let new_path = path_buf.join(&file_name);
                    
                    // 如果新目录中已存在同名文件，跳过
                    if new_path.exists() {
                        log::warn!("目标目录已存在文件: {:?}，跳过迁移", file_name);
                        continue;
                    }
                    
                    // 复制文件到新目录
                    if let Err(e) = std::fs::copy(&file_path, &new_path) {
                        log::error!("复制文件 {:?} 失败: {}", file_path, e);
                        continue;
                    }
                    log::info!("迁移文件: {:?} -> {:?}", file_path, new_path);
                }
            }
        }
        
        // 更新当前数据库路径到新位置
        if let Some(current_path) = get_db_path() {
            let current_file_name = current_path.file_name();
            if let Some(file_name) = current_file_name {
                let new_db_path = path_buf.join(file_name);
                if new_db_path.exists() && new_db_path != current_path {
                    // 关闭当前数据库连接
                    clear_pool().await;
                    
                    // 重新连接到新位置的数据库
                    let db_url = format!("sqlite:{}", new_db_path.to_string_lossy());
                    let pool = sqlx::sqlite::SqlitePoolOptions::new()
                        .connect(&db_url)
                        .await
                        .map_err(|e| format!("重新连接数据库失败: {}", e))?;
                    
                    set_db_path(new_db_path.clone());
                    set_pool(pool).await;
                    
                    log::info!("数据库路径已更新: {:?} -> {:?}", current_path, new_db_path);
                }
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn switch_database(_app: AppHandle, file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let db_url = format!("sqlite:{}", path.to_string_lossy());
    
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;

    set_db_path(path);
    set_pool(pool).await;

    Ok(())
}

#[tauri::command]
pub async fn save_current_database(app: AppHandle, file_name: String) -> Result<String, String> {
    let current_path = match get_db_path() {
        Some(p) => p,
        None => return Err("当前没有可保存的数据".to_string()),
    };

    if !current_path.exists() {
        return Err("当前数据库文件不存在".to_string());
    }

    let data_dir = get_data_dir(&app);
    let mut new_path = data_dir.join(&file_name);

    if new_path != current_path {
        let mut counter = 1;
        while new_path.exists() {
            let ext = PathBuf::from(&file_name)
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();
            let stem = PathBuf::from(&file_name)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| file_name.clone());

            let new_name = if ext.is_empty() {
                format!("{}_{}", stem, counter)
            } else {
                format!("{}_{}.{}", stem, counter, ext)
            };
            new_path = data_dir.join(new_name);
            counter += 1;
        }

        clear_pool().await;

        if let Err(e) = std::fs::rename(&current_path, &new_path) {
            return Err(format!("重命名失败: {}", e));
        }

        let db_url = format!("sqlite:{}", new_path.to_string_lossy());
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .connect(&db_url)
            .await
            .map_err(|e| format!("重新连接数据库失败: {}", e))?;

        set_db_path(new_path.clone());
        set_pool(pool).await;
    }

    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_recent_databases(app: AppHandle) -> Result<Vec<RecentDatabase>, String> {
    let data_dir = get_data_dir(&app);

    if !data_dir.exists() {
        return Ok(vec![]);
    }

    let mut databases = vec![];

    if let Ok(entries) = std::fs::read_dir(&data_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "db").unwrap_or(false) {
                if let Ok(metadata) = entry.metadata() {
                    let created = metadata.created().unwrap_or_else(|_| metadata.modified().unwrap_or(std::time::SystemTime::now()));
                    let modified = metadata.modified().unwrap_or(std::time::SystemTime::now());
                    
                    let created_datetime: chrono::DateTime<chrono::Utc> = created.into();
                    let modified_datetime: chrono::DateTime<chrono::Utc> = modified.into();
                    let path_str = path.to_string_lossy().to_string();
                    
                    // 从数据库文件中读取 event_name, event_date 和 theme
                    let (event_name, event_date, theme) = read_database_event_info(&path_str).await;
                    
                    databases.push(RecentDatabase {
                        name: path
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default(),
                        path: path_str,
                        created_at: created_datetime.to_rfc3339(),
                        last_modified: modified_datetime.to_rfc3339(),
                        last_opened: modified_datetime.to_rfc3339(),
                        theme,
                        event_name,
                        event_date,
                    });
                }
            }
        }
    }

    databases.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));

    Ok(databases)
}

#[tauri::command]
pub async fn delete_database(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err("数据库文件不存在".to_string());
    }

    let current_path = get_db_path();
    if current_path.as_ref() == Some(&path) {
        clear_pool().await;
        clear_db_path();
    }

    if let Err(e) = std::fs::remove_file(&path) {
        return Err(format!("删除失败: {}", e));
    }

    Ok(())
}

#[tauri::command]
pub async fn open_import_file(app: AppHandle) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Excel 文件", &["xlsx", "xls"])
        .set_title("选择要导入的 Excel 文件")
        .blocking_pick_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("用户取消选择".to_string()),
    }
}

#[tauri::command]
pub async fn parse_import_file(file_path: String) -> Result<ImportResult, String> {
    use calamine::{Reader, Xlsx, open_workbook, Data};
    
    let path = PathBuf::from(&file_path);

    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let mut workbook: Xlsx<_> = open_workbook(&path)
        .map_err(|e| format!("无法打开Excel文件: {}", e))?;

    let sheet_name = workbook.sheet_names().get(0)
        .ok_or("Excel文件中没有工作表")?
        .to_string();

    let range = workbook.worksheet_range(&sheet_name)
        .map_err(|e| format!("无法读取工作表: {}", e))?;

    let mut headers = Vec::new();
    let mut data = Vec::new();
    let mut total_rows = 0;

    let rows: Vec<_> = range.rows().collect();
    
    if rows.is_empty() {
        return Err("Excel文件为空".to_string());
    }

    for (row_idx, row) in rows.iter().enumerate() {
        if row_idx == 0 {
            for cell in row.iter() {
                let header = match cell {
                    Data::String(s) => s.to_string(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    _ => String::new(),
                };
                headers.push(header);
            }
        } else {
            let mut row_data = Vec::new();
            for cell in row.iter() {
                let value = match cell {
                    Data::String(s) => serde_json::Value::String(s.to_string()),
                    Data::Float(f) => serde_json::Value::Number(
                        serde_json::Number::from_f64(*f).unwrap_or_else(|| serde_json::Number::from(0))
                    ),
                    Data::Int(i) => serde_json::Value::Number(serde_json::Number::from(*i)),
                    Data::Bool(b) => serde_json::Value::Bool(*b),
                    Data::DateTime(dt) => serde_json::Value::String(dt.to_string()),
                    _ => serde_json::Value::Null,
                };
                row_data.push(value);
            }
            if !row_data.is_empty() {
                data.push(row_data);
                total_rows += 1;
            }
        }
    }

    Ok(ImportResult {
        headers,
        data,
        total_rows,
    })
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    filename: String,
    extensions: Vec<String>,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("文件", &extensions.iter().map(|s| s.as_str()).collect::<Vec<_>>())
        .set_title("保存文件")
        .blocking_save_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("用户取消保存".to_string()),
    }
}

#[tauri::command]
pub async fn generate_pdf(
    _app: AppHandle,
    _request: PdfGenerateRequest,
) -> Result<String, String> {
    // PDF 生成由前端 HTML 渲染实现，Rust 端只提供保存对话框
    // 前端会使用 window.print() 或 html2canvas 等方式生成 PDF
    Err("PDF 生成功能请使用浏览器打印功能".to_string())
}

#[tauri::command]
pub async fn get_system_font(font_name: String) -> Result<String, String> {
    use std::path::Path;

    let fonts_dir = Path::new("C:\\Windows\\Fonts");

    // 根据字体名称查找对应的字体文件
    // 优先使用 .ttf 格式，因为 jsPDF 对 .ttc 格式支持不好
    let font_files: Vec<&str> = match font_name.as_str() {
        "simsun" => vec!["simsunb.ttf", "simsun.ttc"],
        "simkai" => vec!["simkai.ttf", "simkai.ttc"],
        _ => return Err(format!("不支持的字体名称: {}", font_name)),
    };

    // 尝试查找并读取字体文件
    for font_file in font_files {
        let font_path = fonts_dir.join(font_file);
        if font_path.exists() {
            match std::fs::read(&font_path) {
                Ok(font_data) => {
                    // 将字体数据转为 Base64
                    let base64_data = base64::prelude::BASE64_STANDARD.encode(font_data);
                    log::info!("成功加载系统字体: {}", font_file);
                    return Ok(base64_data);
                }
                Err(e) => {
                    log::warn!("读取字体文件失败 {}: {}", font_file, e);
                    continue;
                }
            }
        }
    }

    Err(format!("未找到系统字体: {}", font_name))
}

#[tauri::command]
pub async fn open_path_in_explorer(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    
    if !path_buf.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    
    #[cfg(target_os = "windows")]
    {
        if path_buf.is_dir() {
            // 打开目录
            std::process::Command::new("explorer")
                .arg(&path)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("打开资源管理器失败: {}", e))?;
        } else {
            // 打开文件所在目录并选中文件
            std::process::Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("打开资源管理器失败: {}", e))?;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开 Finder 失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    
    Ok(())
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
    let config = load_app_config(&app).unwrap_or_default();
    Ok(config)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn update_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    save_app_config(&app, &config)?;
    Ok(())
}

#[allow(dead_code)]
#[tauri::command]
pub async fn reset_app_config(app: AppHandle) -> Result<(), String> {
    let config = AppConfig::default();
    save_app_config(&app, &config)?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_records_by_path(path: String) -> Result<Vec<Record>, String> {
    use std::path::Path;
    let db_path = Path::new(&path);
    if !db_path.exists() {
        return Err(format!("数据库文件不存在: {}", path));
    }
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .connect(&db_url)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;
    let result: Result<Vec<Record>, sqlx::Error> = sqlx::query_as(
        "SELECT Id, GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark, CreateTime, UpdateTime, IsDeleted FROM Records WHERE IsDeleted = 0 ORDER BY CreateTime ASC, Id ASC"
    )
    .fetch_all(&pool)
    .await;
    pool.close().await;
    result.map_err(|e| e.to_string())
}

