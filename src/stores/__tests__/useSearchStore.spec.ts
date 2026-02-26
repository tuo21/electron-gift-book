import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSearchStore } from '../useSearchStore'

// 模拟数据库 API
const mockDb = {
  searchRecords: vi.fn(),
}

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // @ts-ignore
    window.db = mockDb
  })

  it('should have initial state', () => {
    const store = useSearchStore()
    
    expect(store.keyword).toBe('')
    expect(store.results).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.isSearching).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should set keyword', () => {
    const store = useSearchStore()
    store.setKeyword('测试')
    expect(store.keyword).toBe('测试')
  })

  it('should search with keyword', async () => {
    const mockResults = [
      { id: 1, guestName: '张三', amount: 100, amountChinese: '壹佰', paymentType: 0, isDeleted: 0 },
      { id: 2, guestName: '张三丰', amount: 200, amountChinese: '贰佰', paymentType: 1, isDeleted: 0 },
    ]
    
    mockDb.searchRecords.mockResolvedValue({
      success: true,
      data: mockResults,
    })

    const store = useSearchStore()
    await store.search('张三')

    expect(store.keyword).toBe('张三')
    expect(store.results.length).toBe(2)
    expect(store.isSearching).toBe(false)
  })

  it('should perform search with empty keyword', async () => {
    const store = useSearchStore()
    store.keyword = ''
    await store.performSearch()

    expect(store.results).toEqual([])
  })

  it('should handle search error', async () => {
    mockDb.searchRecords.mockResolvedValue({
      success: false,
      error: 'Search failed',
    })

    const store = useSearchStore()
    store.keyword = '测试'
    await store.performSearch()

    expect(store.error).toBe('Search failed')
    expect(store.results).toEqual([])
    expect(store.isSearching).toBe(false)
  })

  it('should clear search', () => {
    const store = useSearchStore()
    store.keyword = '测试'
    store.results = [{ id: 1, guestName: '测试', amount: 100, paymentType: 0, isDeleted: 0 }] as any
    store.isSearching = true
    store.error = 'Error'
    
    store.clearSearch()

    expect(store.keyword).toBe('')
    expect(store.results).toEqual([])
    expect(store.isSearching).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should clear error', () => {
    const store = useSearchStore()
    store.error = 'Some error'
    store.clearError()
    expect(store.error).toBeNull()
  })
})
