// ==================== 主题类型定义 ====================

// 统一主题标识符（与PDF模板键一致）
export type ThemeType = 'red' | 'gray' | 'golden';

// 主题元数据配置
export interface ThemeMeta {
  id: ThemeType;
  name: string;           // 英文标识符（与id相同）
  displayName: string;    // 中文显示名称
  icon: string;           // 图标emoji
  description: string;    // 描述
  cssClass: string;       // 对应的CSS类名
  pdfKey: ThemeType;      // PDF导出映射（与主题标识符一致）
}

// ==================== 主题配置常量 ====================

export const THEME_CONFIG: ThemeMeta[] = [
  {
    id: 'red',
    name: 'red',
    displayName: '喜庆红',
    icon: '🏮',
    description: '以温暖的木红色为基调，营造亲切典雅的氛围',
    cssClass: '',
    pdfKey: 'red'
  },
  {
    id: 'gray',
    name: 'gray',
    displayName: '肃穆灰',
    icon: '🕊️',
    description: '以黑白灰为主色调，保留传统水墨画的素雅意境',
    cssClass: 'theme-gray',
    pdfKey: 'gray'
  },
  {
    id: 'golden',
    name: 'golden',
    displayName: '寿宴金',
    icon: '🎂',
    description: '以金色为主调，象征富贵荣华，用于祝寿、乔迁等喜庆场合',
    cssClass: 'theme-golden',
    pdfKey: 'golden'
  }
];

// ==================== 辅助函数 ====================

/**
 * 根据主题ID获取主题元数据
 * @param id 主题标识符
 * @returns 主题元数据，如果不存在则返回 undefined
 */
export function getThemeById(id: ThemeType): ThemeMeta | undefined {
  return THEME_CONFIG.find(t => t.id === id);
}

/**
 * 获取所有主题配置
 * @returns 主题配置数组
 */
export function getAllThemes(): ThemeMeta[] {
  return [...THEME_CONFIG];
}

/**
 * 获取默认主题
 * @returns 默认主题（喜庆红）
 */
export function getDefaultTheme(): ThemeMeta {
  return THEME_CONFIG[0];
}

/**
 * 将旧主题名称转换为新主题名称
 * @param theme 主题字符串
 * @returns 转换后的主题类型
 */
export function normalizeTheme(theme: string): ThemeType {
  switch (theme) {
    case 'wedding':
      return 'red';
    case 'funeral':
      return 'gray';
    case 'birthday':
      return 'golden';
    default:
      // 尝试直接作为新主题名
      if (THEME_CONFIG.some(t => t.id === theme)) {
        return theme as ThemeType;
      }
      return 'red'; // 默认返回喜庆红
  }
}
