import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecordsStore } from '../useRecordsStore'

// 模拟数据库 API
const mockDb = {
  getAllRecords: vi.fn(),
  getRecordsPaginated: vi.fn(),
  getRecordPage: vi.fn(),
  insertRecord: vi.fn(),
  updateRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
  searchRecords: vi.fn(),
  getAllRecordHistory: vi.fn(),
}

describe('useRecordsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // @ts-ignore
    window.db = mockDb
  })

  it('should have initial state', () => {
    const store = useRecordsStore()
    
    expect(store.records).toEqual([])
    expect(store.currentPage).toBe(1)
    expect(store.pageSize).toBe(15)
    expect(store.totalRecords).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should load records with pagination', async () => {
    const mockRecords = [
      { id: 1, guestName: '张三', amount: 100, amountChinese: '壹佰', paymentType: 0, isDeleted: 0 },
      { id: 2, guestName: '李四', amount: 200, amountChinese: '贰佰', paymentType: 1, isDeleted: 0 },
    ]
    
    mockDb.getRecordsPaginated.mockResolvedValue({
      success: true,
      data: {
        records: mockRecords,
        page: 1,
        pageSize: 15,
        total: 2,
        totalPages: 1,
      },
    })

    const store = useRecordsStore()
    await store.loadRecordsPaginated(1, 15)

    expect(mockDb.getRecordsPaginated).toHaveBeenCalledWith(1, 15)
    expect(store.records.length).toBe(2)
    expect(store.totalRecords).toBe(2)
    expect(store.currentPage).toBe(1)
  })

  it('should handle pagination error', async () => {
    mockDb.getRecordsPaginated.mockResolvedValue({
      success: false,
      error: 'Database error',
    })

    const store = useRecordsStore()
    await store.loadRecordsPaginated(1, 15)

    expect(store.error).toBe('Database error')
    expect(store.loading).toBe(false)
  })

  it('should find record page', async () => {
    mockDb.getRecordPage.mockResolvedValue({
      success: true,
      data: 3,
    })

    const store = useRecordsStore()
    const page = await store.findRecordPage(1)

    expect(mockDb.getRecordPage).toHaveBeenCalledWith(1, 15)
    expect(page).toBe(3)
  })

  it('should add new record', async () => {
    mockDb.insertRecord.mockResolvedValue({
      success: true,
      data: { id: 1 },
    })
    mockDb.getRecordsPaginated.mockResolvedValue({
      success: true,
      data: { records: [], page: 1, pageSize: 15, total: 1, totalPages: 1 },
    })

    const store = useRecordsStore()
    const newRecord = {
      guestName: '王五',
      amount: 500,
      amountChinese: '伍佰',
      paymentType: 0,
      remark: '',
      itemDescription: '',
      isDeleted: 0,
    }

    const id = await store.addRecord(newRecord)
    expect(id).toBe(1)
  })

  it('should update existing record', async () => {
    mockDb.updateRecord.mockResolvedValue({
      success: true,
    })
    mockDb.getRecordsPaginated.mockResolvedValue({
      success: true,
      data: { records: [], page: 1, pageSize: 15, total: 0, totalPages: 0 },
    })

    const store = useRecordsStore()
    const record = {
      id: 1,
      guestName: '王五更新',
      amount: 600,
      amountChinese: '陆佰',
      paymentType: 1,
      remark: '',
      itemDescription: '',
      isDeleted: 0,
    }

    await store.updateRecord(record)
    expect(mockDb.updateRecord).toHaveBeenCalled()
  })

  it('should delete record', async () => {
    mockDb.softDeleteRecord.mockResolvedValue({
      success: true,
    })
    mockDb.getRecordsPaginated.mockResolvedValue({
      success: true,
      data: { records: [], page: 1, pageSize: 15, total: 0, totalPages: 0 },
    })

    const store = useRecordsStore()
    await store.deleteRecord(1)

    expect(mockDb.softDeleteRecord).toHaveBeenCalledWith(1)
  })

  it('should search records', async () => {
    const mockResults = [
      { id: 1, guestName: '张三', amount: 100, amountChinese: '壹佰', paymentType: 0, isDeleted: 0 },
    ]
    
    mockDb.searchRecords.mockResolvedValue({
      success: true,
      data: mockResults,
    })

    const store = useRecordsStore()
    const results = await store.searchRecords('张三')

    expect(mockDb.searchRecords).toHaveBeenCalledWith('张三')
    expect(results.length).toBe(1)
  })

  it('should load edit history', async () => {
    const mockHistory = [
      { recordId: 1, guestName: '张三', operationType: 'UPDATE', updateTime: '2024-01-01' },
    ]
    
    mockDb.getAllRecordHistory.mockResolvedValue({
      success: true,
      data: mockHistory,
    })

    const store = useRecordsStore()
    await store.loadEditHistory()

    expect(store.editHistoryList.length).toBe(1)
  })

  it('should clear error', () => {
    const store = useRecordsStore()
    store.error = 'Some error'
    store.clearError()
    expect(store.error).toBeNull()
  })

  it('should calculate total pages', () => {
    const store = useRecordsStore()
    store.totalRecords = 30
    store.pageSize = 10
    expect(store.totalPages).toBe(3)
  })

  it('should check if has records', () => {
    const store = useRecordsStore()
    expect(store.hasRecords).toBe(false)
    
    store.records.push({ id: 1, guestName: '测试', amount: 100, paymentType: 0, isDeleted: 0 } as any)
    expect(store.hasRecords).toBe(true)
  })
})
