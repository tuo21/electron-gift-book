import { describe, it, expect } from 'vitest'
import { getGanZhiYear, getZodiac, solarToLunar, getLunarDisplay } from '../lunarCalendar'

describe('lunarCalendar', () => {
  describe('getGanZhiYear', () => {
    it('should return correct gan zhi for year', () => {
      const result = getGanZhiYear(2024)
      expect(result).toContain('年')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should return different result for different years', () => {
      const result1 = getGanZhiYear(2024)
      const result2 = getGanZhiYear(2025)
      expect(result1).not.toBe(result2)
    })
  })

  describe('getZodiac', () => {
    it('should return zodiac for year', () => {
      const result = getZodiac(2024)
      expect(result).toContain('年')
      expect(result.length).toBe(2)
    })

    it('should return correct zodiac', () => {
      const result = getZodiac(2024)
      expect(result).toBe('龙年')
    })
  })

  describe('solarToLunar', () => {
    it('should convert solar to lunar', () => {
      const date = new Date(2024, 0, 1) // 2024-01-01
      const result = solarToLunar(date)
      
      expect(result).toHaveProperty('lunarYear')
      expect(result).toHaveProperty('lunarMonth')
      expect(result).toHaveProperty('lunarDay')
      expect(result).toHaveProperty('lunarMonthName')
      expect(result).toHaveProperty('lunarDayName')
      expect(result).toHaveProperty('ganZhi')
      expect(result).toHaveProperty('zodiac')
      expect(result).toHaveProperty('formattedDate')
    })

    it('should handle different dates', () => {
      const date1 = new Date(2024, 0, 1)
      const date2 = new Date(2024, 5, 15)
      
      const result1 = solarToLunar(date1)
      const result2 = solarToLunar(date2)
      
      expect(result1.formattedDate).not.toBe(result2.formattedDate)
    })
  })

  describe('getLunarDisplay', () => {
    it('should return lunar display object', () => {
      const result = getLunarDisplay()
      
      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('secondary')
      expect(typeof result.primary).toBe('string')
      expect(typeof result.secondary).toBe('string')
    })

    it('should return non-empty strings', () => {
      const result = getLunarDisplay()
      
      expect(result.primary.length).toBeGreaterThan(0)
      expect(result.secondary.length).toBeGreaterThan(0)
    })
  })
})
