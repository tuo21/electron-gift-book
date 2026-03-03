use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use base64::Engine;

use crate::database::*;
use crate::models::*;

async fn get_pool_connection() -> Result<sqlx::SqlitePool, String> {
    let pool = get_pool();
    let pool_guard = pool.read().await;
    pool_guard.clone().ok_or("数据库未初始化".to_string())
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
        "SELECT HistoryId, RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, NewGuestName, NewAmount, NewItemDescription, NewPaymentType, NewRemark, OperationType, UpdateBy, UpdateTime, ChangeDesc FROM Records_History WHERE OperationType IN ('UPDATE', 'DELETE') ORDER BY UpdateTime DESC"
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

#[tauri::command]
pub async fn create_new_database(app: AppHandle, file_name: String) -> Result<String, String> {
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

    set_db_path(new_path.clone());
    set_pool(pool).await;

    Ok(new_path.to_string_lossy().to_string())
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
                    if let Ok(modified) = metadata.modified() {
                        let datetime: chrono::DateTime<chrono::Utc> = modified.into();
                        databases.push(RecentDatabase {
                            name: path
                                .file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default(),
                            path: path.to_string_lossy().to_string(),
                            last_opened: datetime.to_rfc3339(),
                        });
                    }
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
