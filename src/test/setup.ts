// 全局测试配置

// 模拟 window.db - 使用 any 类型避免类型错误
declare global {
  interface Window {
    db?: any
    app?: any
  }
}

// 模拟 Electron API
if (typeof window !== 'undefined' && !window.db) {
  window.db = {
    getAllRecords: async () => ({ success: true, data: [] }),
    getRecordsPaginated: async () => ({ success: true, data: { records: [], page: 1, pageSize: 15, total: 0, totalPages: 0 } }),
    getRecordPage: async () => ({ success: true, data: 1 }),
    getRecordById: async () => ({ success: true, data: null }),
    insertRecord: async () => ({ success: true, data: { id: 1 } }),
    updateRecord: async () => ({ success: true }),
    softDeleteRecord: async () => ({ success: true }),
    searchRecords: async () => ({ success: true, data: [] }),
    getAllRecordHistory: async () => ({ success: true, data: [] }),
    getStatistics: async () => ({ success: true, data: { totalCount: 0, totalAmount: 0, cashAmount: 0, wechatAmount: 0, internalAmount: 0 } }),
  }
}

// 模拟其他全局对象
if (typeof window !== 'undefined' && !window.app) {
  window.app = {
    generatePDF: async () => ({ success: true }),
    showSaveDialog: async () => ({ filePath: '' }),
    showMessageBox: async () => ({ response: 0 }),
    showOpenDialog: async () => ({ filePaths: [] }),
  }
}

export {}
