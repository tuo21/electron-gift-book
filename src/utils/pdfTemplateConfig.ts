/**
 * PDF 模板配置文件（A4 横版精确版）
 * 
 * 页面尺寸：A4 横版 (297mm × 210mm)
 * 分辨率：300 DPI
 * 像素尺寸：3508px × 2480px
 * 
 * 坐标系统：
 * - 原点 (0, 0)：页面左上角
 * - X 轴：从左到右递增
 * - Y 轴：从上到下递增
 */

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Region {
  left: number
  top: number
  width: number
  height: number
}

export interface TextStyle {
  fontSize: number
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  color: string
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  fontFamily: string
}

export interface PDFTemplateConfig {
  pageSize: Size
  dpi: number
  
  // 封面配置
  cover: {
    // 背景模板图片
    backgroundImage: string
    // 文字区域
    textArea: Region
    // 标题样式
    title: {
      region: Region
      style: TextStyle
      content: string // 动态替换：{appName}
    }
    // 日期样式
    date: {
      region: Region
      style: TextStyle
      content: string // 动态替换：{date}
    }
  }
  
  // 内容页配置
  content: {
    backgroundImage: string
    // 页眉
    header: {
      region: Region
      name: {
        region: Region
        style: TextStyle
      }
      date: {
        region: Region
        style: TextStyle
      }
    }
    // 列表区域
    list: {
      region: Region
      // 每列的配置
      column: {
        width: number
        height: number
        gap: number
        columnsPerPage: number
        // 列内各元素的相对位置（相对于列区域）
        elements: {
          name: Region
          remark: Region
          amount: Region
          payment: Region
        }
        // 元素样式
        styles: {
          name: TextStyle
          remark: TextStyle
          amount: TextStyle
          itemDescription: TextStyle
          payment: TextStyle
          amountNumber: TextStyle
        }
      }
    }
    // 页脚
    footer: {
      region: Region
      recordCount: {
        region: Region
        style: TextStyle
      }
      pageInfo: {
        region: Region
        style: TextStyle
      }
      pageSubtotal: {
        region: Region
        style: TextStyle
      }
    }
  }
  
  // 统计页配置
  statistics: {
    backgroundImage: string
    header: {
      region: Region
    }
    title: {
      region: Region
      style: TextStyle
      content: string
    }
    content: {
      region: Region
      items: Array<{
        label: string
        value: string
        region: Region
        style: TextStyle
      }>
    }
    footer: {
      region: Region
    }
  }
  
  // 封底配置
  backCover: {
    backgroundImage: string
    text1: {
      region: Region
      style: TextStyle
      content: string
    }
    text2: {
      region: Region
      style: TextStyle
      content: string
    }
  }
  
  // 主题颜色
  themeColors: {
    red: ThemeColors
    gray: ThemeColors
  }
}

export interface ThemeColors {
  primary: string
  accent: string
  text: string
  paper: string
  border: string
}

// A4 横版尺寸 (297mm × 210mm) @ 300 DPI
const A4_WIDTH_MM = 297
const A4_HEIGHT_MM = 210
const DPI = 300
const MM_TO_PX = DPI / 25.4

// 计算 A4 像素尺寸
const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX) // 3508px
const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * MM_TO_PX) // 2480px

// 缩放系数（从设计稿 300 DPI 到实际渲染）
const SCALE = 1.0

/**
 * PDF 模板配置 - 基于实际测量数据
 */
export const PDF_TEMPLATE_CONFIG: PDFTemplateConfig = {
  pageSize: {
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX
  },
  dpi: DPI,
  
  // ========== 封面配置 ==========
  cover: {
    backgroundImage: '/templates/{theme}/cover.jpg',
    textArea: {
      left: Math.round(251 * SCALE),
      top: Math.round(461 * SCALE),
      width: Math.round(341 * SCALE),
      height: Math.round(77 * SCALE)
    },
    title: {
      region: {
        left: Math.round(251 * SCALE),
        top: Math.round(461 * SCALE),
        width: Math.round(341 * SCALE),
        height: Math.round(40 * SCALE)
      },
      style: {
        fontSize: Math.round(24 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 34.49 * SCALE,
        color: 'rgba(255, 102, 102, 1)',
        textAlign: 'center',
        verticalAlign: 'top',
        fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
      },
      content: '{appName}'
    },
    date: {
      region: {
        left: Math.round(251 * SCALE),
        top: Math.round(501 * SCALE),
        width: Math.round(341 * SCALE),
        height: Math.round(37 * SCALE)
      },
      style: {
        fontSize: Math.round(14 * SCALE),
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: 20 * SCALE,
        color: 'rgba(255, 102, 102, 1)',
        textAlign: 'center',
        verticalAlign: 'top',
        fontFamily: 'SimSun, STSong, serif'
      },
      content: '{date}'
    }
  },
  
  // ========== 内容页配置 ==========
  content: {
    backgroundImage: '/templates/{theme}/content.jpg',
    header: {
      region: {
        left: Math.round(41 * SCALE),
        top: Math.round(21 * SCALE),
        width: Math.round(760 * SCALE),
        height: Math.round(35 * SCALE)
      },
      name: {
        region: {
          left: 0,
          top: 0,
          width: Math.round(120 * SCALE),
          height: Math.round(35 * SCALE)
        },
        style: {
          fontSize: Math.round(24 * SCALE),
          fontWeight: 900,
          letterSpacing: 0,
          lineHeight: 34.49 * SCALE,
          color: 'rgba(255, 102, 102, 1)',
          textAlign: 'left',
          verticalAlign: 'top',
          fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
        }
      },
      date: {
        region: {
          left: Math.round(633 * SCALE),
          top: Math.round(2.5 * SCALE),
          width: Math.round(127 * SCALE),
          height: Math.round(30 * SCALE)
        },
        style: {
          fontSize: Math.round(13 * SCALE),
          fontWeight: 300,
          letterSpacing: 0,
          lineHeight: 30 * SCALE,
          color: 'rgba(0, 0, 0, 1)',
          textAlign: 'left',
          verticalAlign: 'top',
          fontFamily: 'SimSun, STSong, serif'
        }
      }
    },
    list: {
      region: {
        left: Math.round(41 * SCALE),
        top: Math.round(98 * SCALE),
        width: Math.round(760 * SCALE),
        height: Math.round(401 * SCALE)
      },
      column: {
        width: Math.round(46 * SCALE),
        height: Math.round(401 * SCALE),
        gap: Math.round(5 * SCALE),
        columnsPerPage: 15,
        elements: {
          name: {
            left: 0,
            top: 0,
            width: Math.round(46 * SCALE),
            height: Math.round(139 * SCALE)
          },
          remark: {
            left: 0,
            top: Math.round(139 * SCALE),
            width: Math.round(46 * SCALE),
            height: Math.round(19 * SCALE)
          },
          amount: {
            left: 0,
            top: Math.round(218 * SCALE),
            width: Math.round(46 * SCALE),
            height: Math.round(153 * SCALE)
          },
          payment: {
            left: 0,
            top: Math.round(371 * SCALE),
            width: Math.round(46 * SCALE),
            height: Math.round(30 * SCALE)
          }
        },
        styles: {
          name: {
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: 10,
            lineHeight: 120,
            color: 'inherit',
            textAlign: 'center',
            verticalAlign: 'top',
            fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
          },
          remark: {
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: 0,
            lineHeight: 40,
            color: '#666666',
            textAlign: 'center',
            verticalAlign: 'middle',
            fontFamily: 'KaiTi, STKaiti, serif'
          },
          amount: {
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: 8,
            lineHeight: 120,
            color: 'inherit',
            textAlign: 'center',
            verticalAlign: 'top',
            fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
          },
          itemDescription: {
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: 2,
            lineHeight: 50,
            color: '#666666',
            textAlign: 'center',
            verticalAlign: 'top',
            fontFamily: 'KaiTi, STKaiti, serif'
          },
          payment: {
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 0,
            lineHeight: 35,
            color: '#c44a3d',
            textAlign: 'center',
            verticalAlign: 'middle',
            fontFamily: 'SimSun, STSong, serif'
          },
          amountNumber: {
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: 0,
            lineHeight: 35,
            color: '#666666',
            textAlign: 'center',
            verticalAlign: 'middle',
            fontFamily: 'SimSun, STSong, serif'
          }
        }
      }
    },
    footer: {
      region: {
        left: Math.round(41 * SCALE),
        top: Math.round(518 * SCALE),
        width: Math.round(760 * SCALE),
        height: Math.round(30 * SCALE)
      },
      recordCount: {
        region: {
          left: 0,
          top: 0,
          width: Math.round(80 * SCALE),
          height: Math.round(30 * SCALE)
        },
        style: {
          fontSize: 52,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 60,
          color: '#333333',
          textAlign: 'left',
          verticalAlign: 'middle',
          fontFamily: 'SimSun, STSong, serif'
        }
      },
      pageInfo: {
        region: {
          left: Math.round(306.5 * SCALE),
          top: 0,
          width: Math.round(97 * SCALE),
          height: Math.round(30 * SCALE)
        },
        style: {
          fontSize: 52,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 60,
          color: '#333333',
          textAlign: 'center',
          verticalAlign: 'middle',
          fontFamily: 'SimSun, STSong, serif'
        }
      },
      pageSubtotal: {
        region: {
          left: Math.round(630 * SCALE),
          top: 0,
          width: Math.round(130 * SCALE),
          height: Math.round(30 * SCALE)
        },
        style: {
          fontSize: 52,
          fontWeight: 400,
          letterSpacing: 0,
          lineHeight: 60,
          color: '#333333',
          textAlign: 'right',
          verticalAlign: 'middle',
          fontFamily: 'SimSun, STSong, serif'
        }
      }
    }
  },
  
  // ========== 统计页配置 ==========
  statistics: {
    backgroundImage: '/templates/{theme}/statistics.jpg',
    header: {
      region: {
        left: Math.round(37 * SCALE),
        top: Math.round(21 * SCALE),
        width: Math.round(760 * SCALE),
        height: Math.round(35 * SCALE)
      }
    },
    title: {
      region: {
        left: Math.round(361 * SCALE),
        top: Math.round(137 * SCALE),
        width: Math.round(120 * SCALE),
        height: Math.round(35 * SCALE)
      },
      style: {
        fontSize: Math.round(18 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 35 * SCALE,
        color: 'rgba(255, 102, 102, 1)',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontFamily: 'SimSun, STSong, serif'
      },
      content: '礼金簿统计'
    },
    content: {
      region: {
        left: Math.round(270 * SCALE),
        top: Math.round(193 * SCALE),
        width: Math.round(302 * SCALE),
        height: Math.round(230 * SCALE)
      },
      items: []
    },
    footer: {
      region: {
        left: Math.round(37 * SCALE),
        top: Math.round(518 * SCALE),
        width: Math.round(760 * SCALE),
        height: Math.round(30 * SCALE)
      }
    }
  },
  
  // ========== 封底配置 ==========
  backCover: {
    backgroundImage: '/templates/{theme}/backcover.jpg',
    text1: {
      region: {
        left: Math.round(307 * SCALE),
        top: Math.round(263 * SCALE),
        width: Math.round(228 * SCALE),
        height: Math.round(35 * SCALE)
      },
      style: {
        fontSize: Math.round(24 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 34.49 * SCALE,
        color: 'rgba(255, 211, 145, 1)',
        textAlign: 'center',
        verticalAlign: 'top',
        fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
      },
      content: '做一款好用的电子礼金簿'
    },
    text2: {
      region: {
        left: Math.round(364 * SCALE),
        top: Math.round(310 * SCALE),
        width: Math.round(200 * SCALE),
        height: Math.round(29 * SCALE)
      },
      style: {
        fontSize: Math.round(20 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 28.74 * SCALE,
        color: 'rgba(255, 211, 145, 1)',
        textAlign: 'center',
        verticalAlign: 'top',
        fontFamily: '演示春风楷，KaiTi, STKaiti, serif'
      },
      content: '微信公众号：说自'
    }
  },
  
  // ========== 主题颜色配置 ==========
  themeColors: {
    red: {
      primary: '#c44a3d',
      accent: '#ff6666',
      text: '#ff6666',
      paper: '#f5f0e8',
      border: '#d4a574'
    },
    gray: {
      primary: '#4a4a4a',
      accent: '#666666',
      text: '#333333',
      paper: '#e8e8e8',
      border: '#999999'
    }
  }
}

/**
 * 自适应字体大小计算
 * @param text 文本内容
 * @param maxLength 最大字符数（超过此数开始缩小字体）
 * @param maxSize 最大字体
 * @param minSize 最小字体
 */
export function getAdaptiveFontSize(
  text: string,
  maxLength: number = 3,
  maxSize: number = 110,
  minSize: number = 55
): number {
  if (!text || text.length <= maxLength) {
    return maxSize
  }
  
  const reduceSize = (text.length - maxLength) * 25
  return Math.max(minSize, maxSize - reduceSize)
}

/**
 * 获取模板图片路径
 * @param type 模板类型
 * @param theme 主题
 */
export function getTemplateImagePath(type: string, theme: string): string {
  const fileName = type === 'backCover' ? 'backcover' : type
  return `/templates/${theme}/${fileName}.jpg`
}

/**
 * 数字转大写金额
 */
const CN_NUMBERS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_BIG_UNITS = ['', '万', '亿', '万亿']

export function numberToChinese(amount: number): string {
  if (isNaN(amount) || amount < 0) return ''
  if (amount >= 1e16) return '金额过大'

  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  let result = integerToChinese(integerPart)
  if (result === '') result = '零元'
  else result += '元'

  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10)
    const fen = decimalPart % 10
    if (jiao > 0) result += CN_NUMBERS[jiao] + '角'
    else if (integerPart > 0) result += '零'
    if (fen > 0) result += CN_NUMBERS[fen] + '分'
  }

  return result
}

function integerToChinese(num: number): string {
  if (num === 0) return ''
  let result = ''
  let bigUnitIndex = 0

  while (num > 0) {
    const segment = num % 10000
    if (segment !== 0) {
      const segmentStr = segmentToChinese(segment)
      result = segmentStr + CN_BIG_UNITS[bigUnitIndex] + result
    } else if (result !== '' && !result.startsWith('零')) {
      result = '零' + result
    }
    num = Math.floor(num / 10000)
    bigUnitIndex++
  }

  result = result.replace(/零+/g, '零').replace(/零$/, '')
  return result
}

function segmentToChinese(num: number): string {
  if (num === 0) return ''
  let result = ''
  let zeroFlag = false

  for (let i = 3; i >= 0; i--) {
    const divisor = Math.pow(10, i)
    const digit = Math.floor(num / divisor)
    if (digit > 0) {
      if (zeroFlag) {
        result += '零'
        zeroFlag = false
      }
      result += CN_NUMBERS[digit] + CN_UNITS[i]
    } else if (result !== '') {
      zeroFlag = true
    }
    num %= divisor
  }
  return result
}

/**
 * 格式化金额
 */
export function formatAmount(amount: number): string {
  if (isNaN(amount)) return '0.00'
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 获取支付方式文本
 */
export function getPaymentTypeText(type: number): string {
  const map: { [key: number]: string } = { 0: '现金', 1: '微信', 2: '内收' }
  return map[type] || '未知'
}
