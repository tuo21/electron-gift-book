/**
 * 农历日期转换工具
 * 支持1900-2100年的农历转换
 */

// 农历数据表（1900-2100年）
// 每个元素为16进制，表示该年的农历信息
// 高4位为闰月，低12位为每月天数（1为大月30天，0为小月29天）
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
];

// 天干
const heavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 生肖
const zodiacAnimals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// 农历月份
const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
// 农历日期
const lunarDays = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 获取农历年份的天干地支
 * @param year 农历年
 * @returns 干支纪年，如"甲子年"
 */
export function getGanZhiYear(year: number): string {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return heavenlyStems[stemIndex] + earthlyBranches[branchIndex] + '年';
}

/**
 * 获取生肖
 * @param year 农历年
 * @returns 生肖，如"鼠年"
 */
export function getZodiac(year: number): string {
  const index = (year - 4) % 12;
  return zodiacAnimals[index] + '年';
}

/**
 * 阳历转农历
 * @param date 阳历日期
 * @returns 农历日期信息
 */
export function solarToLunar(date: Date): {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  isLeap: boolean;
  lunarMonthName: string;
  lunarDayName: string;
  ganZhi: string;
  zodiac: string;
  formattedDate: string;
} {
  // 计算从1900年1月31日（农历1900年正月初一）到目标日期的天数
  let offset = Math.floor((date.getTime() - new Date(1900, 0, 31).getTime()) / 86400000);
  
  let lunarYear = 1900;
  let daysInYear = 0;
  
  // 计算农历年
  for (let i = 1900; i < 2100 && offset > 0; i++) {
    daysInYear = getLunarYearDays(i);
    offset -= daysInYear;
    lunarYear++;
  }
  
  if (offset < 0) {
    offset += daysInYear;
    lunarYear--;
  }
  
  // 获取该年的农历信息
  const yearInfo = lunarInfo[lunarYear - 1900];
  const leapMonth = yearInfo & 0xf; // 闰月
  
  let lunarMonth = 1;
  let isLeap = false;
  let daysInMonth = 0;
  
  // 计算农历月
  for (let i = 1; i < 13 && offset > 0; i++) {
    // 判断是否有闰月
    if (leapMonth > 0 && i === leapMonth + 1 && !isLeap) {
      i--;
      isLeap = true;
      daysInMonth = getLeapDays(lunarYear);
    } else {
      isLeap = false;
      daysInMonth = getMonthDays(lunarYear, i);
    }
    
    offset -= daysInMonth;
    if (!isLeap) lunarMonth++;
  }
  
  if (offset === 0 && leapMonth > 0 && lunarMonth === leapMonth + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      lunarMonth--;
    }
  }
  
  if (offset < 0) {
    offset += daysInMonth;
    if (isLeap) isLeap = false;
    else lunarMonth--;
  }
  
  const lunarDay = offset + 1;
  
  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
    lunarMonthName: (isLeap ? '闰' : '') + lunarMonths[lunarMonth - 1] + '月',
    lunarDayName: lunarDays[lunarDay - 1],
    ganZhi: getGanZhiYear(lunarYear),
    zodiac: getZodiac(lunarYear),
    formattedDate: (isLeap ? '闰' : '') + lunarMonths[lunarMonth - 1] + '月' + lunarDays[lunarDay - 1]
  };
}

/**
 * 获取农历年的总天数
 */
function getLunarYearDays(year: number): number {
  let sum = 348;
  const info = lunarInfo[year - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + getLeapDays(year);
}

/**
 * 获取闰月的天数
 */
function getLeapDays(year: number): number {
  const info = lunarInfo[year - 1900];
  if (getLeapMonth(year)) {
    return (info & 0x10000) ? 30 : 29;
  }
  return 0;
}

/**
 * 获取闰月月份，0表示无闰月
 */
function getLeapMonth(year: number): number {
  return lunarInfo[year - 1900] & 0xf;
}

/**
 * 获取农历某月的天数
 */
function getMonthDays(year: number, month: number): number {
  const info = lunarInfo[year - 1900];
  return (info & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 获取当前农历日期显示格式
 * 第一排：农历日期（如腊月十二）
 * 第二排：干支纪年 + 阳历日期（小字号）
 */
export function getLunarDisplay(): {
  primary: string;      // 主要显示：腊月十二
  secondary: string;    // 次要显示：甲子年 2026-01-22
} {
  const now = new Date();
  const lunar = solarToLunar(now);
  const solarDate = now.toISOString().split('T')[0];
  
  return {
    primary: lunar.lunarMonthName + lunar.lunarDayName,
    secondary: `${lunar.ganZhi} ${solarDate}`
  };
}
