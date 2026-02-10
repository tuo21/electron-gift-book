/**
 * 金额转大写工具函数
 * 将数字金额转换为中文大写金额
 */

// 数字对应的中文大写
const CN_NUMBERS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

// 单位
const CN_UNITS = [
  '',           // 个位
  '拾',         // 十位
  '佰',         // 百位
  '仟',         // 千位
];

// 大单位
const CN_BIG_UNITS = ['', '万', '亿', '万亿'];

/**
 * 将数字转换为中文大写金额
 * @param amount 数字金额
 * @returns 中文大写金额字符串
 */
export function numberToChinese(amount: number | string): string {
  // 转换为数字
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  // 验证输入
  if (isNaN(num) || num < 0) {
    return '';
  }

  // 处理最大值（万亿以下）
  if (num >= 1e16) {
    return '金额过大';
  }

  // 分离整数部分和小数部分
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  // 转换整数部分
  let result = integerToChinese(integerPart);

  // 添加"元"
  if (result === '') {
    result = '零元';
  } else {
    result += '元';
  }

  // 转换小数部分（角、分）
  if (decimalPart === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;

    if (jiao > 0) {
      result += CN_NUMBERS[jiao] + '角';
    } else if (integerPart > 0) {
      // 如果整数部分大于0且角为0，需要加"零"
      result += '零';
    }

    if (fen > 0) {
      result += CN_NUMBERS[fen] + '分';
    }
  }

  return result;
}

/**
 * 将整数部分转换为中文
 * @param num 整数
 * @returns 中文大写字符串
 */
function integerToChinese(num: number): string {
  if (num === 0) return '';

  let result = '';
  let bigUnitIndex = 0;

  while (num > 0) {
    const segment = num % 10000; // 每四位一段（个、万、亿）
    if (segment !== 0) {
      const segmentStr = segmentToChinese(segment);
      result = segmentStr + CN_BIG_UNITS[bigUnitIndex] + result;
    } else if (result !== '' && !result.startsWith('零')) {
      // 处理中间有零的情况
      result = '零' + result;
    }

    num = Math.floor(num / 10000);
    bigUnitIndex++;
  }

  // 清理多余的零
  result = result.replace(/零+/g, '零');
  result = result.replace(/零$/, '');

  return result;
}

/**
 * 将四位以内的数字转换为中文
 * @param num 0-9999的数字
 * @returns 中文大写字符串
 */
function segmentToChinese(num: number): string {
  if (num === 0) return '';

  let result = '';
  let zeroFlag = false;

  for (let i = 3; i >= 0; i--) {
    const divisor = Math.pow(10, i);
    const digit = Math.floor(num / divisor);

    if (digit > 0) {
      if (zeroFlag) {
        result += '零';
        zeroFlag = false;
      }
      result += CN_NUMBERS[digit] + CN_UNITS[i];
    } else if (result !== '') {
      zeroFlag = true;
    }

    num %= divisor;
  }

  return result;
}

/**
 * 格式化金额显示（添加千分位）
 * @param amount 金额
 * @returns 格式化后的字符串
 */
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 验证金额是否有效
 * @param amount 金额字符串
 * @returns 是否有效
 */
export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && num <= 999999999999.99;
}
