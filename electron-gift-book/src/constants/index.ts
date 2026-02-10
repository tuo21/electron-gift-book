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

// 表单验证规则
export const validationRules = {
  guestName: {
    maxLength: 50,
    required: true,
  },
  amount: {
    min: 0,
    max: 99999999.99,
    decimalPlaces: 2,
  },
  remark: {
    maxLength: 200,
  },
  itemDescription: {
    maxLength: 100,
  },
} as const

// 日期格式化选项
export const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}

// 应用配置
export const appConfig = {
  name: '电子礼金簿',
  version: '1.0.0',
  defaultAppName: '电子礼金簿',
} as const
