import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

// 数据库连接实例
let db: Database.Database | null = null

// 获取数据库文件路径
function getDbPath(): string {
  // 使用项目目录下的 data 文件夹存储数据库
  const dbDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  return path.join(dbDir, 'gift-book.db')
}

// 初始化数据库
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  console.log('Database path:', dbPath)

  db = new Database(dbPath)

  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 创建主记录表
  db.exec(`
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
      IsDeleted INTEGER DEFAULT 0
    )
  `)

  // 创建修改历史表
  db.exec(`
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
  `)

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_guestname ON Records(GuestName);
    CREATE INDEX IF NOT EXISTS idx_records_isdeleted ON Records(IsDeleted);
    CREATE INDEX IF NOT EXISTS idx_history_recordid ON Records_History(RecordId);
  `)

  // 数据库迁移：添加新列到 Records_History 表
  migrateHistoryTable(db)

  console.log('Database initialized successfully')
  return db
}

// 数据库迁移：为 Records_History 表添加新列
function migrateHistoryTable(db: Database.Database): void {
  try {
    // 检查并添加新列
    const columns = db.prepare(`PRAGMA table_info(Records_History)`).all() as { name: string }[]
    const columnNames = columns.map(col => col.name)

    if (!columnNames.includes('NewGuestName')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN NewGuestName TEXT`)
      console.log('Migration: Added NewGuestName column')
    }
    if (!columnNames.includes('NewAmount')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN NewAmount DECIMAL(10, 2)`)
      console.log('Migration: Added NewAmount column')
    }
    if (!columnNames.includes('NewItemDescription')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN NewItemDescription TEXT`)
      console.log('Migration: Added NewItemDescription column')
    }
    if (!columnNames.includes('NewPaymentType')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN NewPaymentType INTEGER`)
      console.log('Migration: Added NewPaymentType column')
    }
    if (!columnNames.includes('NewRemark')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN NewRemark TEXT`)
      console.log('Migration: Added NewRemark column')
    }
    if (!columnNames.includes('OperationType')) {
      db.exec(`ALTER TABLE Records_History ADD COLUMN OperationType TEXT DEFAULT 'UPDATE'`)
      console.log('Migration: Added OperationType column')
    }
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// 获取数据库实例
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// 关闭数据库连接
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

// 记录操作类型
export interface Record {
  Id?: number
  GuestName: string
  Amount: number
  AmountChinese?: string
  ItemDescription?: string
  PaymentType: number
  Remark?: string
  CreateTime?: string
  UpdateTime?: string
  IsDeleted?: number
}

export interface RecordHistory {
  HistoryId?: number
  RecordId: number
  GuestName: string
  Amount?: number
  ItemDescription?: string
  PaymentType?: number
  Remark?: string
  NewGuestName?: string
  NewAmount?: number
  NewItemDescription?: string
  NewPaymentType?: number
  NewRemark?: string
  OperationType?: string
  UpdateBy?: string
  UpdateTime?: string
  ChangeDesc?: string
}

// 插入记录
export function insertRecord(record: Record): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark)
    VALUES (@GuestName, @Amount, @AmountChinese, @ItemDescription, @PaymentType, @Remark)
  `)
  const result = stmt.run(record)
  return result.lastInsertRowid as number
}

// 更新记录
export function updateRecord(record: Record): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    UPDATE Records 
    SET GuestName = @GuestName, 
        Amount = @Amount, 
        AmountChinese = @AmountChinese,
        ItemDescription = @ItemDescription, 
        PaymentType = @PaymentType, 
        Remark = @Remark,
        UpdateTime = CURRENT_TIMESTAMP
    WHERE Id = @Id
  `)
  stmt.run(record)
}

// 软删除记录
export function softDeleteRecord(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    UPDATE Records SET IsDeleted = 1, UpdateTime = CURRENT_TIMESTAMP WHERE Id = ?
  `)
  stmt.run(id)
}

// 获取所有未删除的记录
export function getAllRecords(): Record[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM Records WHERE IsDeleted = 0 ORDER BY CreateTime DESC
  `)
  return stmt.all() as Record[]
}

// 根据ID获取记录
export function getRecordById(id: number): Record | undefined {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM Records WHERE Id = ? AND IsDeleted = 0
  `)
  return stmt.get(id) as Record | undefined
}

// 搜索记录
export function searchRecords(keyword: string): Record[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM Records 
    WHERE IsDeleted = 0 AND (GuestName LIKE ? OR Remark LIKE ? OR ItemDescription LIKE ?)
    ORDER BY CreateTime DESC
  `)
  const likeKeyword = `%${keyword}%`
  return stmt.all(likeKeyword, likeKeyword, likeKeyword) as Record[]
}

// 插入历史记录
export function insertHistory(history: RecordHistory): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO Records_History (
      RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark,
      NewGuestName, NewAmount, NewItemDescription, NewPaymentType, NewRemark,
      OperationType, UpdateBy, ChangeDesc
    )
    VALUES (
      @RecordId, @GuestName, @Amount, @ItemDescription, @PaymentType, @Remark,
      @NewGuestName, @NewAmount, @NewItemDescription, @NewPaymentType, @NewRemark,
      @OperationType, @UpdateBy, @ChangeDesc
    )
  `)
  stmt.run(history)
}

// 获取记录的历史
export function getRecordHistory(recordId: number): RecordHistory[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM Records_History WHERE RecordId = ? ORDER BY UpdateTime DESC
  `)
  return stmt.all(recordId) as RecordHistory[]
}

// 获取所有历史记录（用于修改记录弹窗）- 只返回UPDATE和DELETE类型的记录
export function getAllRecordHistory(): RecordHistory[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT 
      h.HistoryId as historyId,
      h.RecordId as recordId,
      h.GuestName as guestName,
      h.Amount as amount,
      h.ItemDescription as itemDescription,
      h.PaymentType as paymentType,
      h.Remark as remark,
      h.NewGuestName as newGuestName,
      h.NewAmount as newAmount,
      h.NewItemDescription as newItemDescription,
      h.NewPaymentType as newPaymentType,
      h.NewRemark as newRemark,
      h.OperationType as operationType,
      h.UpdateBy as updateBy,
      h.UpdateTime as updateTime,
      h.ChangeDesc as changeDesc
    FROM Records_History h
    WHERE h.OperationType IN ('UPDATE', 'DELETE')
    ORDER BY h.UpdateTime DESC
  `)
  return stmt.all() as RecordHistory[]
}

// 获取统计数据
export interface Statistics {
  totalCount: number
  totalAmount: number
  cashAmount: number
  wechatAmount: number
  internalAmount: number
}

export function getStatistics(): Statistics {
  const db = getDatabase()
  
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0
  `)
  const totalResult = totalStmt.get() as { count: number; total: number }

  const cashStmt = db.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 0
  `)
  const cashResult = cashStmt.get() as { total: number }

  const wechatStmt = db.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 1
  `)
  const wechatResult = wechatStmt.get() as { total: number }

  const internalStmt = db.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 2
  `)
  const internalResult = internalStmt.get() as { total: number }

  return {
    totalCount: totalResult.count,
    totalAmount: totalResult.total,
    cashAmount: cashResult.total,
    wechatAmount: wechatResult.total,
    internalAmount: internalResult.total
  }
}
