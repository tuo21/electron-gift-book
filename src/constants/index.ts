/**
 * 电子礼金簿 - 共享常量定义
 * 集中管理所有枚举和常量，避免重复定义
 */

// 支付方式枚举
export enum PaymentType {
  CASH = 0,      // 现金
  WECHAT = 1,    // 微信
  INTERNAL = 2,  // 内收
}

// 支付方式显示映射
export const paymentTypeMap: Record<PaymentType, string> = {
  [PaymentType.CASH]: '现金',
  [PaymentType.WECHAT]: '微信',
  [PaymentType.INTERNAL]: '内收',
}

// 获取支付方式显示文本
export function getPaymentTypeText(type: PaymentType | number): string {
  return paymentTypeMap[type as PaymentType] || '未知'
}

// 页面大小选项
export const pageSizeOptions = [10, 15, 20, 50] as const

// 默认分页大小
export const DEFAULT_PAGE_SIZE = 15
