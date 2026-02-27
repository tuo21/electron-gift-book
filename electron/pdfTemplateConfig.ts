/**
 * PDF模板配置文件
 * 基于设计稿定位信息
 * 页面尺寸：3508px × 2479px（横版A4，300 DPI）
 */

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
}

export interface PDFTemplateConfig {
  pageSize: {
    width: number
    height: number
  }
  cover: {
    textArea: Region
    titleStyle: TextStyle
    dateStyle: TextStyle
  }
  content: {
    header: Region & {
      nameStyle: TextStyle
      dateStyle: TextStyle
      nameOffset: { left: number; top: number }
      dateOffset: { left: number; top: number }
    }
    list: Region & {
      columnWidth: number
      columnGap: number
      columnsPerPage: number
      column: {
        name: Region
        remark: Region
        amount: Region
        payment: Region
      }
    }
    footer: Region & {
      recordCount: Region
      pageInfo: Region
      pageSubtotal: Region
    }
  }
  statistics: {
    header: Region
    title: Region & { textStyle: TextStyle }
    content: Region
    firstTable: Region
    footer: Region
  }
  backCover: {
    text1: Region & { textStyle: TextStyle; content: string }
    text2: Region & { textStyle: TextStyle; content: string }
  }
}

const SCALE = 4.167

export const PDF_TEMPLATE_CONFIG: PDFTemplateConfig = {
  pageSize: {
    width: 3508,
    height: 2479
  },

  cover: {
    textArea: {
      left: Math.round(251 * SCALE),
      top: Math.round(461 * SCALE),
      width: Math.round(341 * SCALE),
      height: Math.round(77 * SCALE)
    },
    titleStyle: {
      fontSize: Math.round(24 * SCALE),
      fontWeight: 900,
      letterSpacing: 0,
      lineHeight: 34.49 * SCALE,
      color: 'rgba(255, 102, 102, 1)',
      textAlign: 'center',
      verticalAlign: 'top'
    },
    dateStyle: {
      fontSize: Math.round(14 * SCALE),
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 20 * SCALE,
      color: 'rgba(255, 102, 102, 1)',
      textAlign: 'center',
      verticalAlign: 'top'
    }
  },

  content: {
    header: {
      left: Math.round(41 * SCALE),
      top: Math.round(21 * SCALE),
      width: Math.round(760 * SCALE),
      height: Math.round(35 * SCALE),
      nameStyle: {
        fontSize: Math.round(24 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 34.49 * SCALE,
        color: 'rgba(255, 102, 102, 1)',
        textAlign: 'left',
        verticalAlign: 'top'
      },
      dateStyle: {
        fontSize: Math.round(13 * SCALE),
        fontWeight: 300,
        letterSpacing: 0,
        lineHeight: 30 * SCALE,
        color: 'rgba(0, 0, 0, 1)',
        textAlign: 'right',
        verticalAlign: 'top'
      },
      nameOffset: { left: 0, top: 0 },
      dateOffset: { left: Math.round(633 * SCALE), top: Math.round(2.5 * SCALE) }
    },

    list: {
      left: Math.round(41 * SCALE),
      top: Math.round(98 * SCALE),
      width: Math.round(760 * SCALE),
      height: Math.round(401 * SCALE),
      columnWidth: Math.round(46 * SCALE),
      columnGap: Math.round(5 * SCALE),
      columnsPerPage: 15,
      column: {
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
      }
    },

    footer: {
      left: Math.round(41 * SCALE),
      top: Math.round(518 * SCALE),
      width: Math.round(760 * SCALE),
      height: Math.round(30 * SCALE),
      recordCount: {
        left: 0,
        top: 0,
        width: Math.round(80 * SCALE),
        height: Math.round(30 * SCALE)
      },
      pageInfo: {
        left: Math.round(306.5 * SCALE),
        top: 0,
        width: Math.round(97 * SCALE),
        height: Math.round(30 * SCALE)
      },
      pageSubtotal: {
        left: Math.round(630 * SCALE),
        top: 0,
        width: Math.round(130 * SCALE),
        height: Math.round(30 * SCALE)
      }
    }
  },

  statistics: {
    header: {
      left: Math.round(37 * SCALE),
      top: Math.round(21 * SCALE),
      width: Math.round(760 * SCALE),
      height: Math.round(35 * SCALE)
    },
    title: {
      left: Math.round(361 * SCALE),
      top: Math.round(137 * SCALE),
      width: Math.round(120 * SCALE),
      height: Math.round(35 * SCALE),
      textStyle: {
        fontSize: Math.round(18 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 35 * SCALE,
        color: 'rgba(255, 102, 102, 1)',
        textAlign: 'center',
        verticalAlign: 'middle'
      }
    },
    content: {
      left: Math.round(270 * SCALE),
      top: Math.round(193 * SCALE),
      width: Math.round(302 * SCALE),
      height: Math.round(230 * SCALE)
    },
    firstTable: {
      left: Math.round(270 * SCALE),
      top: Math.round(239 * SCALE),
      width: Math.round(46 * SCALE),
      height: Math.round(302 * SCALE)
    },
    footer: {
      left: Math.round(37 * SCALE),
      top: Math.round(518 * SCALE),
      width: Math.round(760 * SCALE),
      height: Math.round(30 * SCALE)
    }
  },

  backCover: {
    text1: {
      left: Math.round(307 * SCALE),
      top: Math.round(263 * SCALE),
      width: Math.round(228 * SCALE),
      height: Math.round(35 * SCALE),
      textStyle: {
        fontSize: Math.round(24 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 34.49 * SCALE,
        color: 'rgba(255, 211, 145, 1)',
        textAlign: 'center',
        verticalAlign: 'top'
      },
      content: '做一款好用的电子礼金簿'
    },
    text2: {
      left: Math.round(364 * SCALE),
      top: Math.round(310 * SCALE),
      width: Math.round(200 * SCALE),
      height: Math.round(29 * SCALE),
      textStyle: {
        fontSize: Math.round(20 * SCALE),
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 28.74 * SCALE,
        color: 'rgba(255, 211, 145, 1)',
        textAlign: 'center',
        verticalAlign: 'top'
      },
      content: '微信公众号：说自'
    }
  }
}

export const THEME_COLORS = {
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
