import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStatisticsStore } from '../useStatisticsStore'

// 模拟数据库 API
const mockDb = {
  getStatistics: vi.fn(),
}

describe('useStatisticsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // @ts-ignore
    window.db = mockDb
  })

  it('should have initial state', () => {
    const store = useStatisticsStore()
    
    expect(store.statistics.totalCount).toBe(0)
    expect(store.statistics.totalAmount).toBe(0)
    expect(store.statistics.cashAmount).toBe(0)
    expect(store.statistics.wechatAmount).toBe(0)
    expect(store.statistics.internalAmount).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should load statistics successfully', async () => {
    const mockStats = {
      totalCount: 10,
      totalAmount: 5000,
      cashAmount: 3000,
      wechatAmount: 1500,
      internalAmount: 500,
    }
    
    mockDb.getStatistics.mockResolvedValue({
      success: true,
      data: mockStats,
    })

    const store = useStatisticsStore()
    await store.loadStatistics()

    expect(store.statistics.totalCount).toBe(10)
    expect(store.statistics.totalAmount).toBe(5000)
    expect(store.statistics.cashAmount).toBe(3000)
    expect(store.statistics.wechatAmount).toBe(1500)
    expect(store.statistics.internalAmount).toBe(500)
    expect(store.loading).toBe(false)
  })

  it('should handle statistics error', async () => {
    mockDb.getStatistics.mockResolvedValue({
      success: false,
      error: 'Failed to load statistics',
    })

    const store = useStatisticsStore()
    await store.loadStatistics()

    expect(store.error).toBe('Failed to load statistics')
    expect(store.loading).toBe(false)
  })

  it('should clear error', () => {
    const store = useStatisticsStore()
    store.error = 'Some error'
    store.clearError()
    expect(store.error).toBeNull()
  })
})
