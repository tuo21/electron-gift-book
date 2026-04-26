/**
 * 金额转换工具
 * 将数字金额转换为中文大写
 */
export class AmountConverter {
  private static digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  private static units = ['', '拾', '佰', '仟'];
  private static bigUnits = ['', '万', '亿'];

  /**
   * 将数字金额转换为中文大写
   * @param amount 金额
   * @returns 中文大写金额
   */
  public static toChinese(amount: number | string): string {
    // 处理字符串输入
    if (typeof amount === 'string') {
      const num = parseFloat(amount);
      if (isNaN(num)) return '';
      amount = num;
    }
    
    // 处理特殊情况
    if (isNaN(amount)) return '';
    if (amount < 0) return '';
    if (amount > 1e15) return '金额过大';
    if (amount === 0) return '零元';
    
    let integerPart = Math.floor(amount);
    let decimalPart = Math.round((amount - integerPart) * 100);
    
    let result = '';
    
    // 处理整数部分
    if (integerPart > 0) {
      result = this.convertInteger(integerPart);
    }
    
    // 处理小数部分
    if (decimalPart > 0) {
      result += this.convertDecimal(decimalPart);
    } else {
      result += '元';
    }
    
    return result;
  }

  private static convertInteger(num: number): string {
    let result = '';
    let bigUnitIndex = 0;
    let prevSectionHadContent = false;
    
    while (num > 0) {
      const section = num % 10000;
      if (section > 0) {
        const sectionStr = this.convertSection(section);
        
        // 如果不是第一个section且前面有内容，需要添加零
        if (bigUnitIndex > 0 && prevSectionHadContent) {
          // 检查当前section的数值是否小于1000
          if (section < 1000) {
            result = '零' + result;
          }
        }
        
        result = sectionStr + this.bigUnits[bigUnitIndex] + result;
        prevSectionHadContent = true;
      } else {
        prevSectionHadContent = false;
      }
      
      num = Math.floor(num / 10000);
      bigUnitIndex++;
    }
    
    return result;
  }

  private static convertSection(num: number): string {
    let result = '';
    let unitIndex = 0;
    let zeroFlag = false;
    let hasNonZero = false;
    
    // 从低位到高位处理
    while (num > 0) {
      const digit = num % 10;
      if (digit === 0) {
        if (hasNonZero) {
          zeroFlag = true;
        }
      } else {
        if (zeroFlag) {
          result = '零' + result;
          zeroFlag = false;
        }
        result = this.digits[digit] + this.units[unitIndex] + result;
        hasNonZero = true;
      }
      num = Math.floor(num / 10);
      unitIndex++;
    }
    
    return result;
  }

  private static convertDecimal(num: number): string {
    if (num === 0) return '';
    
    const jiao = Math.floor(num / 10);
    const fen = num % 10;
    
    let result = '元';
    if (jiao > 0) {
      result += this.digits[jiao] + '角';
    }
    if (fen > 0) {
      result += this.digits[fen] + '分';
    }
    
    return result;
  }
}

// 导出函数别名
export const numberToChinese = (amount: number | string): string => AmountConverter.toChinese(amount);

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export const formatAmount = (amount: number | string): string => {
  if (typeof amount === 'string') {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    amount = num;
  }
  if (isNaN(amount)) return '0.00';
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * 验证金额是否有效
 * @param amount 金额
 * @returns 是否有效
 */
export const isValidAmount = (amount: number | string): boolean => {
  if (typeof amount === 'string') {
    const num = parseFloat(amount);
    if (isNaN(num)) return false;
    amount = num;
  }
  return !isNaN(amount) && amount >= 0 && amount <= 1e12;
};