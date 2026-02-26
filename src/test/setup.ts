// 全局测试配置

import type { DatabaseAPI, AppAPI, ApiResponse, Record, RecordHistory, Statistics, PaginationResult } from '../types/database'

// 模拟 Electron API
if (typeof window !== 'undefined' && !window.db) {
  window.db = {
    getAllRecords: async () => ({ success: true, data: [] as Record[] }),
    getRecordsPaginated: async () => ({ 
      success: true, 
      data: { records: [] as Record[], page: 1, pageSize: 15, total: 0, totalPages: 0 } as PaginationResult<Record>
    }),
    getRecordPage: async () => ({ success: true, data: 1 }),
    getRecordById: async () => ({ success: true, data: undefined as unknown as Record }),
    insertRecord: async () => ({ success: true, data: { id: 1 } }),
    updateRecord: async () => ({ success: true } as ApiResponse),
    softDeleteRecord: async () => ({ success: true } as ApiResponse),
    searchRecords: async () => ({ success: true, data: [] as Record[] }),
    getRecordHistory: async () => ({ success: true, data: [] as RecordHistory[] }),
    getAllRecordHistory: async () => ({ success: true, data: [] as RecordHistory[] }),
    getStatistics: async () => ({ 
      success: true, 
      data: { totalCount: 0, totalAmount: 0, cashAmount: 0, wechatAmount: 0, internalAmount: 0 } as Statistics 
    }),
    batchInsertRecords: async () => ({ success: true, data: { count: 0 } }),
  } as DatabaseAPI
}

// 模拟其他全局对象
if (typeof window !== 'undefined' && !window.app) {
  window.app = {
    generatePDF: async () => ({ success: true, data: { filePath: '' } }),
  } as AppAPI
}

export {}
