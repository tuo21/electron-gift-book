use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use std::sync::Arc;
use tokio::sync::RwLock;

// 重新导出 sqlx 类型，使用 tauri-plugin-sql 中的 sqlx
pub use sqlx::sqlite::SqlitePool;
use sqlx::Row;

static DB_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
static CUSTOM_DATA_DIR: Mutex<Option<PathBuf>> = Mutex::new(None);

lazy_static::lazy_static! {
    static ref DB_POOL: Arc<RwLock<Option<SqlitePool>>> = Arc::new(RwLock::new(None));
}

// 获取数据目录（优先使用自定义路径）
pub fn get_data_dir(app: &tauri::AppHandle) -> PathBuf {
    let custom_dir = CUSTOM_DATA_DIR.lock().unwrap();
    if let Some(dir) = &*custom_dir {
        return dir.clone();
    }
    app.path().app_data_dir().expect("Failed to get app data dir")
}

// 设置自定义数据路径
pub fn set_custom_data_dir(path: PathBuf) {
    let mut custom_dir = CUSTOM_DATA_DIR.lock().unwrap();
    *custom_dir = Some(path);
}

// 获取自定义数据路径
pub fn get_custom_data_dir() -> Option<PathBuf> {
    let custom_dir = CUSTOM_DATA_DIR.lock().unwrap();
    custom_dir.clone()
}

pub fn set_db_path(path: PathBuf) {
    let mut db_path = DB_PATH.lock().unwrap();
    *db_path = Some(path);
}

pub fn get_db_path() -> Option<PathBuf> {
    let db_path = DB_PATH.lock().unwrap();
    db_path.clone()
}

pub fn clear_db_path() {
    let mut db_path = DB_PATH.lock().unwrap();
    *db_path = None;
}

pub fn get_pool() -> Arc<RwLock<Option<SqlitePool>>> {
    DB_POOL.clone()
}

pub async fn set_pool(pool: SqlitePool) {
    let mut db_pool = DB_POOL.write().await;
    *db_pool = Some(pool);
}

pub async fn clear_pool() {
    let mut db_pool = DB_POOL.write().await;
    // 如果存在连接池，先关闭它
    if let Some(pool) = db_pool.take() {
        pool.close().await;
    }
}

pub fn get_create_tables_sql() -> Vec<&'static str> {
    vec![
        r#"
        CREATE TABLE IF NOT EXISTS Records (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            GuestName TEXT NOT NULL,
            Amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            AmountChinese TEXT,
            ItemDescription TEXT,
            PaymentType INTEGER DEFAULT 0,
            Remark TEXT,
            CreateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
            UpdateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
            IsDeleted INTEGER DEFAULT 0,
            GroupId INTEGER,
            GroupRole TEXT,
            GroupTotal DECIMAL(10, 2),
            GroupExpense DECIMAL(10, 2),
            GroupBalance DECIMAL(10, 2),
            GroupExpenseDetail TEXT
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS Records_History (
            HistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
            RecordId INTEGER NOT NULL,
            GuestName TEXT NOT NULL,
            Amount DECIMAL(10, 2),
            ItemDescription TEXT,
            PaymentType INTEGER,
            Remark TEXT,
            NewGuestName TEXT,
            NewAmount DECIMAL(10, 2),
            NewItemDescription TEXT,
            NewPaymentType INTEGER,
            NewRemark TEXT,
            OperationType TEXT DEFAULT 'UPDATE',
            UpdateBy TEXT DEFAULT 'System',
            UpdateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
            ChangeDesc TEXT,
            FOREIGN KEY (RecordId) REFERENCES Records(Id)
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS Settings (
            Key TEXT PRIMARY KEY,
            Value TEXT NOT NULL
        )
        "#,
        "CREATE INDEX IF NOT EXISTS idx_records_guestname ON Records(GuestName)",
        "CREATE INDEX IF NOT EXISTS idx_records_isdeleted ON Records(IsDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_history_recordid ON Records_History(RecordId)",
    ]
}

pub async fn migrate_database(pool: &SqlitePool) -> Result<(), String> {
    let rows = sqlx::query("PRAGMA table_info(Records)")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("查询表结构失败: {}", e))?;

    let mut column_names = Vec::new();
    for row in rows {
        if let Ok(name) = row.try_get::<String, _>("name") {
            column_names.push(name);
        } else if let Ok(name) = row.try_get::<String, _>(1) {
            column_names.push(name);
        }
    }

    let migrations = vec![
        ("GroupId", "ALTER TABLE Records ADD COLUMN GroupId INTEGER"),
        ("GroupRole", "ALTER TABLE Records ADD COLUMN GroupRole TEXT"),
        ("GroupTotal", "ALTER TABLE Records ADD COLUMN GroupTotal DECIMAL(10, 2)"),
        ("GroupExpense", "ALTER TABLE Records ADD COLUMN GroupExpense DECIMAL(10, 2)"),
        ("GroupBalance", "ALTER TABLE Records ADD COLUMN GroupBalance DECIMAL(10, 2)"),
        ("GroupExpenseDetail", "ALTER TABLE Records ADD COLUMN GroupExpenseDetail TEXT"),
    ];

    for (name, sql) in migrations {
        if !column_names.contains(&name.to_string()) {
            sqlx::query(sql)
                .execute(pool)
                .await
                .map_err(|e| format!("添加列 {} 失败: {}", name, e))?;
        }
    }

    Ok(())
}
