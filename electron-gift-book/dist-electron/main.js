import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
let db = null;
function getDbPath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "gift-book.db");
}
function initDatabase() {
  if (db) return db;
  const dbPath = getDbPath();
  console.log("Database path:", dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
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
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS Records_History (
      HistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
      RecordId INTEGER NOT NULL,
      GuestName TEXT NOT NULL,
      Amount DECIMAL(10, 2),
      ItemDescription TEXT,
      PaymentType INTEGER,
      Remark TEXT,
      UpdateBy TEXT DEFAULT 'System',
      UpdateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      ChangeDesc TEXT,
      FOREIGN KEY (RecordId) REFERENCES Records(Id)
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_guestname ON Records(GuestName);
    CREATE INDEX IF NOT EXISTS idx_records_isdeleted ON Records(IsDeleted);
    CREATE INDEX IF NOT EXISTS idx_history_recordid ON Records_History(RecordId);
  `);
  console.log("Database initialized successfully");
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log("Database connection closed");
  }
}
function insertRecord(record) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO Records (GuestName, Amount, AmountChinese, ItemDescription, PaymentType, Remark)
    VALUES (@GuestName, @Amount, @AmountChinese, @ItemDescription, @PaymentType, @Remark)
  `);
  const result = stmt.run(record);
  return result.lastInsertRowid;
}
function updateRecord(record) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    UPDATE Records 
    SET GuestName = @GuestName, 
        Amount = @Amount, 
        AmountChinese = @AmountChinese,
        ItemDescription = @ItemDescription, 
        PaymentType = @PaymentType, 
        Remark = @Remark,
        UpdateTime = CURRENT_TIMESTAMP
    WHERE Id = @Id
  `);
  stmt.run(record);
}
function softDeleteRecord(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    UPDATE Records SET IsDeleted = 1, UpdateTime = CURRENT_TIMESTAMP WHERE Id = ?
  `);
  stmt.run(id);
}
function getAllRecords() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM Records WHERE IsDeleted = 0 ORDER BY CreateTime DESC
  `);
  return stmt.all();
}
function getRecordById(id) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM Records WHERE Id = ? AND IsDeleted = 0
  `);
  return stmt.get(id);
}
function searchRecords(keyword) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM Records 
    WHERE IsDeleted = 0 AND (GuestName LIKE ? OR Remark LIKE ? OR ItemDescription LIKE ?)
    ORDER BY CreateTime DESC
  `);
  const likeKeyword = `%${keyword}%`;
  return stmt.all(likeKeyword, likeKeyword, likeKeyword);
}
function insertHistory(history) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    INSERT INTO Records_History (RecordId, GuestName, Amount, ItemDescription, PaymentType, Remark, UpdateBy, ChangeDesc)
    VALUES (@RecordId, @GuestName, @Amount, @ItemDescription, @PaymentType, @Remark, @UpdateBy, @ChangeDesc)
  `);
  stmt.run(history);
}
function getRecordHistory(recordId) {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
    SELECT * FROM Records_History WHERE RecordId = ? ORDER BY UpdateTime DESC
  `);
  return stmt.all(recordId);
}
function getStatistics() {
  const db2 = getDatabase();
  const totalStmt = db2.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0
  `);
  const totalResult = totalStmt.get();
  const cashStmt = db2.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 0
  `);
  const cashResult = cashStmt.get();
  const wechatStmt = db2.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 1
  `);
  const wechatResult = wechatStmt.get();
  const internalStmt = db2.prepare(`
    SELECT COALESCE(SUM(Amount), 0) as total 
    FROM Records 
    WHERE IsDeleted = 0 AND PaymentType = 2
  `);
  const internalResult = internalStmt.get();
  return {
    totalCount: totalResult.count,
    totalAmount: totalResult.total,
    cashAmount: cashResult.total,
    wechatAmount: wechatResult.total,
    internalAmount: internalResult.total
  };
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function setupIpcHandlers() {
  ipcMain.handle("db:getAllRecords", () => {
    try {
      return { success: true, data: getAllRecords() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:getRecordById", (_, id) => {
    try {
      return { success: true, data: getRecordById(id) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:searchRecords", (_, keyword) => {
    try {
      return { success: true, data: searchRecords(keyword) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:insertRecord", (_, record) => {
    try {
      const id = insertRecord(record);
      return { success: true, data: { id } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:updateRecord", (_, record) => {
    try {
      const oldRecord = getRecordById(record.Id);
      if (oldRecord) {
        insertHistory({
          RecordId: record.Id,
          GuestName: oldRecord.GuestName,
          Amount: oldRecord.Amount,
          ItemDescription: oldRecord.ItemDescription,
          PaymentType: oldRecord.PaymentType,
          Remark: oldRecord.Remark,
          ChangeDesc: "更新记录"
        });
      }
      updateRecord(record);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:softDeleteRecord", (_, id) => {
    try {
      const oldRecord = getRecordById(id);
      if (oldRecord) {
        insertHistory({
          RecordId: id,
          GuestName: oldRecord.GuestName,
          Amount: oldRecord.Amount,
          ItemDescription: oldRecord.ItemDescription,
          PaymentType: oldRecord.PaymentType,
          Remark: oldRecord.Remark,
          ChangeDesc: "删除记录"
        });
      }
      softDeleteRecord(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:getRecordHistory", (_, recordId) => {
    try {
      return { success: true, data: getRecordHistory(recordId) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:getStatistics", () => {
    try {
      return { success: true, data: getStatistics() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDatabase();
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  try {
    initDatabase();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
  setupIpcHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
//# sourceMappingURL=main.js.map
