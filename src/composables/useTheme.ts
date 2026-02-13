import { ref, computed } from 'vue';

// ==================== 类型定义 ====================
export type ThemeType = 'wedding' | 'funeral';

export interface ThemeConfig {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  paper: string;
  textPrimary: string;
  textSecondary: string;
  textLight: string;
  accent: string;
  accentDark: string;
}

// ==================== 主题配置 ====================
const themes: Record<ThemeType, ThemeConfig> = {
  wedding: {
    primary: '#EB564A',
    primaryDark: '#D6453D',
    primaryLight: '#F06B60',
    paper: '#EDEDED',
    textPrimary: '#000000',
    textSecondary: '#333333',
    textLight: '#FFFFFF',
    accent: '#E6BA37',
    accentDark: '#D4A832',
  },
  funeral: {
    primary: '#4A4A4A',
    primaryDark: '#333333',
    primaryLight: '#5A5A5A',
    paper: '#F5F5F5',
    textPrimary: '#000000',
    textSecondary: '#333333',
    textLight: '#FFFFFF',
    accent: '#888888',
    accentDark: '#666666',
  },
};

// ==================== 响应式状态 ====================
const currentTheme = ref<ThemeType>('wedding');
const isTransitioning = ref(false);

// ==================== 计算属性 ====================
const themeConfig = computed(() => themes[currentTheme.value]);

const isWedding = computed(() => currentTheme.value === 'wedding');
const isFuneral = computed(() => currentTheme.value === 'funeral');

// ==================== 方法函数 ====================

/**
 * 设置主题
 * @param theme 主题类型
 * @param applyToDocument 是否应用到 document
 */
function setTheme(theme: ThemeType, applyToDocument: boolean = true): void {
  if (currentTheme.value === theme) return;
  
  isTransitioning.value = true;
  currentTheme.value = theme;
  
  if (applyToDocument) {
    applyThemeToDocument(theme);
  }
  
  // 保存到 localStorage
  saveThemeToStorage(theme);
  
  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
}

/**
 * 应用主题到 document
 * @param theme 主题类型
 */
function applyThemeToDocument(theme: ThemeType): void {
  const config = themes[theme];
  const root = document.documentElement;
  
  // 添加过渡效果
  root.style.setProperty('--theme-transition', 'all 0.3s ease');
  
  // 设置 CSS 变量
  root.style.setProperty('--theme-primary', config.primary);
  root.style.setProperty('--theme-primary-dark', config.primaryDark);
  root.style.setProperty('--theme-primary-light', config.primaryLight);
  root.style.setProperty('--theme-paper', config.paper);
  root.style.setProperty('--theme-text-primary', config.textPrimary);
  root.style.setProperty('--theme-text-secondary', config.textSecondary);
  root.style.setProperty('--theme-text-light', config.textLight);
  root.style.setProperty('--theme-accent', config.accent);
  root.style.setProperty('--theme-accent-dark', config.accentDark);
  
  // 设置 body class
  document.body.classList.remove('theme-wedding', 'theme-funeral');
  document.body.classList.add(`theme-${theme}`);
}

/**
 * 保存主题到 localStorage
 * @param theme 主题类型
 */
function saveThemeToStorage(theme: ThemeType): void {
  try {
    localStorage.setItem('gift-book-theme', theme);
  } catch (error) {
    console.error('保存主题失败:', error);
  }
}

/**
 * 从 localStorage 加载主题
 * @returns 主题类型，如果没有则返回默认值
 */
function loadThemeFromStorage(): ThemeType {
  try {
    const saved = localStorage.getItem('gift-book-theme') as ThemeType;
    if (saved && (saved === 'wedding' || saved === 'funeral')) {
      return saved;
    }
  } catch (error) {
    console.error('加载主题失败:', error);
  }
  return 'wedding';
}

/**
 * 初始化主题
 * 从 localStorage 加载并应用
 */
function initTheme(): void {
  const theme = loadThemeFromStorage();
  setTheme(theme, true);
}

/**
 * 切换主题
 * 在红事和白事之间切换
 */
function toggleTheme(): void {
  const newTheme = currentTheme.value === 'wedding' ? 'funeral' : 'wedding';
  setTheme(newTheme);
}

/**
 * 获取主题样式对象（用于动态样式绑定）
 * @returns 主题样式对象
 */
function getThemeStyles() {
  return computed(() => ({
    background: currentTheme.value === 'wedding'
      ? 'linear-gradient(135deg, #EB564A 0%, #D6453D 100%)'
      : 'linear-gradient(135deg, #4A4A4A 0%, #333333 100%)',
    primaryColor: themeConfig.value.primary,
    accentColor: themeConfig.value.accent,
    paperColor: themeConfig.value.paper,
    textColor: themeConfig.value.textPrimary,
  }));
}

// ==================== 组合式函数 ====================
export function useTheme() {
  return {
    // 状态
    currentTheme,
    isTransitioning,
    
    // 计算属性
    themeConfig,
    isWedding,
    isFuneral,
    themeStyles: getThemeStyles(),
    
    // 方法
    setTheme,
    toggleTheme,
    initTheme,
    applyThemeToDocument,
    loadThemeFromStorage,
    saveThemeToStorage,
  };
}

// 默认导出
export default useTheme;
