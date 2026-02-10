import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Database from "better-sqlite3";
let db = null;
let currentDbPath = "";
function getDefaultDbPath() {
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, "gift-book.db");
}
function initDatabase(dbPath) {
  if (db && currentDbPath === (dbPath || getDefaultDbPath())) {
    return db;
  }
  if (db) {
    db.close();
    db = null;
  }
  currentDbPath = dbPath || getDefaultDbPath();
  console.log("Database path:", currentDbPath);
  const dbDir = path.dirname(currentDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(currentDbPath);
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
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_guestname ON Records(GuestName);
    CREATE INDEX IF NOT EXISTS idx_records_isdeleted ON Records(IsDeleted);
    CREATE INDEX IF NOT EXISTS idx_history_recordid ON Records_History(RecordId);
  `);
  migrateHistoryTable(db);
  console.log("Database initialized successfully");
  return db;
}
function migrateHistoryTable(db2) {
  try {
    const columns = db2.prepare(`PRAGMA table_info(Records_History)`).all();
    const columnNames = columns.map((col) => col.name);
    if (!columnNames.includes("NewGuestName")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN NewGuestName TEXT`);
      console.log("Migration: Added NewGuestName column");
    }
    if (!columnNames.includes("NewAmount")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN NewAmount DECIMAL(10, 2)`);
      console.log("Migration: Added NewAmount column");
    }
    if (!columnNames.includes("NewItemDescription")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN NewItemDescription TEXT`);
      console.log("Migration: Added NewItemDescription column");
    }
    if (!columnNames.includes("NewPaymentType")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN NewPaymentType INTEGER`);
      console.log("Migration: Added NewPaymentType column");
    }
    if (!columnNames.includes("NewRemark")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN NewRemark TEXT`);
      console.log("Migration: Added NewRemark column");
    }
    if (!columnNames.includes("OperationType")) {
      db2.exec(`ALTER TABLE Records_History ADD COLUMN OperationType TEXT DEFAULT 'UPDATE'`);
      console.log("Migration: Added OperationType column");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
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
function getCurrentDbPath() {
  return currentDbPath;
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
function getAllRecordHistory() {
  const db2 = getDatabase();
  const stmt = db2.prepare(`
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
  `);
  return stmt.all();
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
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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
    icon: path.join(process.env.VITE_PUBLIC, "images", "logo.png"),
    width: 1445,
    height: 950,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL).catch((error) => {
      console.error("Failed to load URL:", error);
    });
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html")).catch((error) => {
      console.error("Failed to load file:", error);
    });
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
    const db2 = getDatabase();
    try {
      const transaction = db2.transaction(() => {
        const oldRecord = getRecordById(record.Id);
        if (oldRecord) {
          insertHistory({
            RecordId: record.Id,
            GuestName: oldRecord.GuestName,
            Amount: oldRecord.Amount,
            ItemDescription: oldRecord.ItemDescription,
            PaymentType: oldRecord.PaymentType,
            Remark: oldRecord.Remark,
            NewGuestName: record.GuestName,
            NewAmount: record.Amount,
            NewItemDescription: record.ItemDescription,
            NewPaymentType: record.PaymentType,
            NewRemark: record.Remark,
            OperationType: "UPDATE",
            UpdateBy: "System",
            ChangeDesc: "更新记录"
          });
        }
        updateRecord(record);
      });
      transaction();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("db:softDeleteRecord", (_, id) => {
    const db2 = getDatabase();
    try {
      const transaction = db2.transaction(() => {
        const oldRecord = getRecordById(id);
        if (oldRecord) {
          insertHistory({
            RecordId: id,
            GuestName: oldRecord.GuestName,
            Amount: oldRecord.Amount,
            ItemDescription: oldRecord.ItemDescription,
            PaymentType: oldRecord.PaymentType,
            Remark: oldRecord.Remark,
            NewGuestName: null,
            NewAmount: null,
            NewItemDescription: null,
            NewPaymentType: null,
            NewRemark: null,
            OperationType: "DELETE",
            UpdateBy: "System",
            ChangeDesc: "删除记录"
          });
        }
        softDeleteRecord(id);
      });
      transaction();
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
  ipcMain.handle("db:getAllRecordHistory", () => {
    try {
      return { success: true, data: getAllRecordHistory() };
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
  ipcMain.handle("app:generatePDF", async (_, data) => {
    try {
      const serializableData = {
        ...data,
        records: data.records.map((record) => ({
          guestName: record.guestName,
          amount: record.amount,
          amountChinese: record.amountChinese,
          itemDescription: record.itemDescription,
          paymentType: record.paymentType,
          remark: record.remark
        }))
      };
      const printWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("打印页面加载超时"));
        }, 1e4);
        ipcMain.once("print-window-loaded", () => {
          try {
            printWindow.webContents.send("render-giftbook", serializableData);
          } catch (error) {
            console.error("发送数据到打印窗口失败:", error);
            reject(new Error("发送数据到打印窗口失败: " + error.message));
          }
        });
        ipcMain.once("print-ready", () => {
          clearTimeout(timeout);
          resolve();
        });
        const printPagePath = path.join(process.env.VITE_PUBLIC, "print.html");
        printWindow.loadFile(printPagePath).catch(reject);
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const pdfBuffer = await printWindow.webContents.printToPDF({
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        },
        printBackground: true,
        landscape: true,
        pageSize: "A4"
      });
      printWindow.close();
      const { filePath } = await dialog.showSaveDialog({
        title: "保存 PDF",
        defaultPath: `礼金簿_${serializableData.exportDate.replace(/[年月日]/g, "")}.pdf`,
        filters: [
          { name: "PDF 文件", extensions: ["pdf"] }
        ]
      });
      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, filePath };
      } else {
        return { success: false, error: "用户取消保存" };
      }
    } catch (error) {
      console.error("生成 PDF 失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:openDatabaseFile", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "选择礼金簿数据文件",
        defaultPath: dataDir,
        filters: [
          { name: "数据库文件", extensions: ["db"] },
          { name: "所有文件", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      if (filePaths && filePaths.length > 0) {
        return { success: true, filePath: filePaths[0] };
      } else {
        return { success: false, error: "用户取消选择" };
      }
    } catch (error) {
      console.error("打开文件对话框失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:createNewDatabase", async (_, fileName) => {
    try {
      const newDbPath = path.join(dataDir, fileName);
      let finalPath = newDbPath;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        finalPath = path.join(dataDir, `${base}_${counter}${ext}`);
        counter++;
      }
      initDatabase(finalPath);
      return { success: true, filePath: finalPath };
    } catch (error) {
      console.error("创建新数据库失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:switchDatabase", async (_, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: "数据库文件不存在" };
      }
      initDatabase(filePath);
      return { success: true };
    } catch (error) {
      console.error("切换数据库失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:saveCurrentDatabase", async (_, fileName) => {
    try {
      const dbPath = getCurrentDbPath();
      if (!dbPath || !fs.existsSync(dbPath)) {
        return { success: false, error: "当前没有可保存的数据" };
      }
      const newPath = path.join(dataDir, fileName);
      if (newPath !== dbPath) {
        let finalPath = newPath;
        let counter = 1;
        while (fs.existsSync(finalPath)) {
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          finalPath = path.join(dataDir, `${base}_${counter}${ext}`);
          counter++;
        }
        closeDatabase();
        fs.renameSync(dbPath, finalPath);
        initDatabase(finalPath);
        return { success: true, filePath: finalPath };
      }
      return { success: true, filePath: dbPath };
    } catch (error) {
      console.error("保存数据库失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:getRecentDatabases", async () => {
    try {
      const files = fs.readdirSync(dataDir);
      const dbFiles = files.filter((file) => file.endsWith(".db")).map((file) => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: path.basename(file, ".db"),
          path: filePath,
          lastOpened: stats.mtime.toISOString()
        };
      }).sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime());
      return { success: true, recentDatabases: dbFiles };
    } catch (error) {
      console.error("获取最近数据库列表失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:deleteDatabase", async (_, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: "数据库文件不存在" };
      }
      const currentDbPath2 = getCurrentDbPath();
      if (currentDbPath2 === filePath) {
        closeDatabase();
      }
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (error) {
      console.error("删除数据库失败:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("electron:openImportFile", async () => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "选择要导入的 Excel 文件",
        defaultPath: dataDir,
        filters: [
          { name: "Excel 文件", extensions: ["xlsx", "xls"] },
          { name: "所有文件", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });
      if (filePaths && filePaths.length > 0) {
        return { success: true, filePath: filePaths[0] };
      } else {
        return { success: false, error: "用户取消选择" };
      }
    } catch (error) {
      console.error("打开导入文件对话框失败:", error);
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
