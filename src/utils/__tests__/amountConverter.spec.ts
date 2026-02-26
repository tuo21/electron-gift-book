import { describe, it, expect } from 'vitest'
import { numberToChinese, formatAmount, isValidAmount } from '../amountConverter'

describe('amountConverter', () => {
  describe('numberToChinese', () => {
    it('should convert 0 to Chinese', () => {
      expect(numberToChinese(0)).toBe('零元')
    })

    it('should convert simple integer', () => {
      expect(numberToChinese(100)).toBe('壹佰元')
    })

    it('should convert number with jiao', () => {
      expect(numberToChinese(10.5)).toBe('壹拾元伍角')
    })

    it('should convert number with fen', () => {
      expect(numberToChinese(1.23)).toBe('壹元贰角叁分')
    })

    it('should handle large numbers', () => {
      expect(numberToChinese(10000)).toContain('万')
    })

    it('should return empty string for negative numbers', () => {
      expect(numberToChinese(-1)).toBe('')
    })

    it('should return empty string for NaN', () => {
      expect(numberToChinese(NaN)).toBe('')
    })

    it('should return error message for too large numbers', () => {
      expect(numberToChinese(1e16)).toBe('金额过大')
    })

    it('should handle string input', () => {
      expect(numberToChinese('100')).toBe('壹佰元')
    })
  })

  describe('formatAmount', () => {
    it('should format integer with thousand separators', () => {
      expect(formatAmount(1000)).toBe('1,000.00')
    })

    it('should format decimal correctly', () => {
      expect(formatAmount(1234.56)).toBe('1,234.56')
    })

    it('should handle string input', () => {
      expect(formatAmount('1000')).toBe('1,000.00')
    })

    it('should return 0.00 for NaN', () => {
      expect(formatAmount(NaN)).toBe('0.00')
    })

    it('should handle zero', () => {
      expect(formatAmount(0)).toBe('0.00')
    })
  })

  describe('isValidAmount', () => {
    it('should return true for valid amount', () => {
      expect(isValidAmount('100')).toBe(true)
    })

    it('should return true for zero', () => {
      expect(isValidAmount('0')).toBe(true)
    })

    it('should return false for negative', () => {
      expect(isValidAmount('-10')).toBe(false)
    })

    it('should return false for NaN', () => {
      expect(isValidAmount('abc')).toBe(false)
    })

    it('should return false for amount exceeding limit', () => {
      expect(isValidAmount('1000000000000')).toBe(false)
    })

    it('should return true for decimal', () => {
      expect(isValidAmount('10.5')).toBe(true)
    })
  })
})
