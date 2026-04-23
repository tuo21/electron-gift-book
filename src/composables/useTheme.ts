import { ref, computed } from 'vue';
import type { ThemeType } from '../types/theme';
import { THEME_CONFIG, getThemeById, normalizeTheme } from '../types/theme';

// ==================== 响应式状态 ====================
const currentTheme = ref<ThemeType>('red');
const isTransitioning = ref(false);

// ==================== 计算属性 ====================
const themeMeta = computed(() => getThemeById(currentTheme.value));

const isRed = computed(() => currentTheme.value === 'red');
const isGray = computed(() => currentTheme.value === 'gray');
const isGolden = computed(() => currentTheme.value === 'golden');

// ==================== 方法函数 ====================

/**
 * 应用主题到 document（通过 CSS 类名切换）
 * @param theme 主题类型
 */
function applyThemeToDocument(theme: string): void {
  const normalizedTheme = normalizeTheme(theme);
  const meta = getThemeById(normalizedTheme);
  if (!meta) {
    return;
  }

  const body = document.body;
  
  // 添加过渡动画类
  body.classList.add('theme-transition');
  
  // 移除所有主题类
  body.classList.remove('theme-red', 'theme-gray', 'theme-golden');
  
  // 添加当前主题类（所有主题都需要添加）
  body.classList.add(meta.cssClass);
  
  // 移除过渡动画类
  setTimeout(() => {
    body.classList.remove('theme-transition');
  }, 400);
}

/**
 * 设置主题
 * @param theme 主题类型（支持旧主题名自动转换）
 * @param applyToDocument 是否应用到 document
 */
function setTheme(theme: string, applyToDocument: boolean = true): void {
  const normalizedTheme = normalizeTheme(theme);
  
  if (currentTheme.value === normalizedTheme) return;
  
  isTransitioning.value = true;
  currentTheme.value = normalizedTheme;
  
  if (applyToDocument) {
    applyThemeToDocument(normalizedTheme);
  }
  
  // 保存到 localStorage
  saveThemeToStorage(normalizedTheme);
  
  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
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
    if (saved && THEME_CONFIG.some(t => t.id === saved)) {
      return saved;
    }
  } catch (error) {
    console.error('加载主题失败:', error);
  }
  return 'red'; // 默认主题：喜庆红
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
 * 在所有可用主题之间循环切换
 */
function toggleTheme(): void {
  const currentIndex = THEME_CONFIG.findIndex(t => t.id === currentTheme.value);
  const nextIndex = (currentIndex + 1) % THEME_CONFIG.length;
  const nextTheme = THEME_CONFIG[nextIndex];
  setTheme(nextTheme.id);
}

/**
 * 获取所有可用主题配置
 * @returns 主题配置数组
 */
function getAllThemes() {
  return [...THEME_CONFIG];
}

/**
 * 获取当前主题的 PDF 模板键
 * @returns PDF 模板键（与主题标识符一致）
 */
function getPdfThemeKey(): ThemeType {
  return currentTheme.value;
}

// ==================== 组合式函数 ====================
export function useTheme() {
  return {
    // 状态
    currentTheme,
    isTransitioning,
    
    // 计算属性
    themeMeta,
    isRed,
    isGray,
    isGolden,
    
    // 方法
    setTheme,
    toggleTheme,
    initTheme,
    applyThemeToDocument,
    loadThemeFromStorage,
    saveThemeToStorage,
    getAllThemes,
    getPdfThemeKey,
  };
}

// 默认导出
export default useTheme;
