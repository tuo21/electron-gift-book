use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    #[sqlx(rename = "Id")]
    pub id: Option<i64>,
    #[sqlx(rename = "GuestName")]
    pub guest_name: String,
    #[sqlx(rename = "Amount")]
    pub amount: i64,
    #[sqlx(rename = "AmountChinese")]
    pub amount_chinese: Option<String>,
    #[sqlx(rename = "ItemDescription")]
    pub item_description: Option<String>,
    #[sqlx(rename = "PaymentType")]
    pub payment_type: i32,
    #[sqlx(rename = "Remark")]
    pub remark: Option<String>,
    #[sqlx(rename = "CreateTime")]
    pub create_time: Option<String>,
    #[sqlx(rename = "UpdateTime")]
    pub update_time: Option<String>,
    #[sqlx(rename = "IsDeleted")]
    pub is_deleted: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RecordHistory {
    #[sqlx(rename = "HistoryId")]
    pub history_id: Option<i64>,
    #[sqlx(rename = "RecordId")]
    pub record_id: i64,
    #[sqlx(rename = "GuestName")]
    pub guest_name: String,
    #[sqlx(rename = "Amount")]
    pub amount: Option<i64>,
    #[sqlx(rename = "ItemDescription")]
    pub item_description: Option<String>,
    #[sqlx(rename = "PaymentType")]
    pub payment_type: Option<i32>,
    #[sqlx(rename = "Remark")]
    pub remark: Option<String>,
    #[sqlx(rename = "NewGuestName")]
    pub new_guest_name: Option<String>,
    #[sqlx(rename = "NewAmount")]
    pub new_amount: Option<i64>,
    #[sqlx(rename = "NewItemDescription")]
    pub new_item_description: Option<String>,
    #[sqlx(rename = "NewPaymentType")]
    pub new_payment_type: Option<i32>,
    #[sqlx(rename = "NewRemark")]
    pub new_remark: Option<String>,
    #[sqlx(rename = "OperationType")]
    pub operation_type: Option<String>,
    #[sqlx(rename = "UpdateBy")]
    pub update_by: Option<String>,
    #[sqlx(rename = "UpdateTime")]
    pub update_time: Option<String>,
    #[sqlx(rename = "ChangeDesc")]
    pub change_desc: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Statistics {
    pub total_count: i64,
    pub total_amount: i64,
    pub cash_amount: i64,
    pub wechat_amount: i64,
    pub internal_amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationResult<T> {
    pub records: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    #[allow(dead_code)]
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    #[allow(dead_code)]
    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentDatabase {
    pub name: String,
    pub path: String,
    pub last_opened: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub headers: Vec<String>,
    pub data: Vec<Vec<serde_json::Value>>,
    pub total_rows: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfGenerateRequest {
    pub records: Vec<Record>,
    pub app_name: String,
    pub export_date: String,
    pub filename: String,
    pub theme: Option<String>,
}
