import { ref, computed } from 'vue';
import type { ThemeType } from './useTheme';

// ==================== 类型定义 ====================
export interface AppConfig {
  eventName: string;
  theme: ThemeType;
  currentDbPath: string | null;
  recentBooks: RecentBook[];
  unnamedIndex: number;
  // 展示样式：full=完整大字型, compact=简洁紧凑型
  displayStyle: 'full' | 'compact';
  // 自定义书法字体（CSS 字体名称，如 SimSun, KaiTi 等）
  customFontCssName: string | null;
  // 事务日期 YYYY-MM-DD 格式
  eventDate: string | null;
}

export interface RecentBook {
  name: string;
  path: string;
  lastOpened: string;
  theme?: string;
  eventName?: string;
  eventDate?: string;
}

// ==================== 常量定义 ====================
const STORAGE_KEY = 'gift-book-config';
const DEFAULT_EVENT_NAME = '';

// ==================== 响应式状态 ====================
const config = ref<AppConfig>({
  eventName: DEFAULT_EVENT_NAME,
  theme: 'red',
  currentDbPath: null,
  recentBooks: [],
  unnamedIndex: 1,
  displayStyle: 'full',
  customFontCssName: null,
  eventDate: null,
});

// ==================== 计算属性 ====================
const displayEventName = computed(() => config.value.eventName || DEFAULT_EVENT_NAME);

const hasCurrentData = computed(() => {
  // 检查当前是否有数据（通过判断是否有记录或是否为新创建的数据库）
  // 这个值会在 App.vue 中动态更新
  return false;
});

// ==================== 方法函数 ====================

/**
 * 获取默认配置
 */
function getDefaultConfig(): AppConfig {
  return {
    eventName: DEFAULT_EVENT_NAME,
    theme: 'red',
    currentDbPath: null,
    recentBooks: [],
    unnamedIndex: 1,
    displayStyle: 'full',
    customFontCssName: null,
    eventDate: null,
  };
}

/**
 * 从 localStorage 加载配置
 */
function loadConfig(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      config.value = {
        ...getDefaultConfig(),
        ...parsed,
      };
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    config.value = getDefaultConfig();
  }
}

/**
 * 保存配置到 localStorage
 */
function saveConfig(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

/**
 * 设置事务名称
 * @param name 事务名称
 */
function setEventName(name: string): void {
  config.value.eventName = name.trim();
  saveConfig();
}

/**
 * 设置主题
 * @param theme 主题类型
 */
function setTheme(theme: ThemeType): void {
  config.value.theme = theme;
  saveConfig();
}

/**
 * 设置展示样式
 * @param style 展示样式（full=完整大字型, compact=简洁紧凑型）
 */
function setDisplayStyle(style: 'full' | 'compact'): void {
  config.value.displayStyle = style;
  saveConfig();
}

/**
 * 设置自定义字体（CSS 字体名称）
 * @param fontCssName CSS 字体名称（如 SimSun, KaiTi 等）
 */
function setCustomFont(fontCssName: string | null): void {
  config.value.customFontCssName = fontCssName;
  saveConfig();
}

/**
 * 设置事务日期
 * @param date 事务日期 YYYY-MM-DD 格式
 */
function setEventDate(date: string): void {
  config.value.eventDate = date;
  saveConfig();
}

/**
 * 获取事务日期
 * @returns 事务日期，如果没有设置则返回当前日期
 */
function getEventDate(): string {
  return config.value.eventDate || new Date().toISOString().split('T')[0];
}

/**
 * 设置当前数据库路径
 * @param path 数据库文件路径
 */
function setCurrentDbPath(path: string | null): void {
  config.value.currentDbPath = path;
  saveConfig();
}

/**
 * 获取下一个未命名序号
 * @returns 序号
 */
function getNextUnnamedIndex(): number {
  const index = config.value.unnamedIndex;
  config.value.unnamedIndex++;
  saveConfig();
  return index;
}

/**
 * 清理文件名中的非法字符
 * Windows 不允许: \ / : * ? " < > |
 * @param name 原始名称
 * @returns 清理后的安全名称
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * 生成默认文件名
 * @param eventName 事务名称
 * @returns 文件名
 */
function generateFileName(eventName?: string): string {
  const name = eventName?.trim();
  if (name && name !== DEFAULT_EVENT_NAME) {
    const safeName = sanitizeFileName(name);
    return `${safeName}.db`;
  }
  return `未命名事务(${getNextUnnamedIndex()}).db`;
}

/**
 * 添加到最近打开列表
 * @param name 显示名称
 * @param path 文件路径
 */
function addToRecentBooks(name: string, path: string): void {
  // 移除已存在的相同路径
  config.value.recentBooks = config.value.recentBooks.filter(
    book => book.path !== path
  );
  
  // 添加到开头
  config.value.recentBooks.unshift({
    name: name || DEFAULT_EVENT_NAME,
    path,
    lastOpened: new Date().toISOString(),
  });
  
  // 最多保留 10 个
  if (config.value.recentBooks.length > 10) {
    config.value.recentBooks = config.value.recentBooks.slice(0, 10);
  }
  
  saveConfig();
}

/**
 * 从最近打开列表中移除
 * @param path 文件路径
 */
function removeFromRecentBooks(path: string): void {
  config.value.recentBooks = config.value.recentBooks.filter(
    book => book.path !== path
  );
  saveConfig();
}

/**
 * 清空最近打开列表
 */
function clearRecentBooks(): void {
  config.value.recentBooks = [];
  saveConfig();
}

/**
 * 重置配置（用于新建礼金簿时）
 * @param keepUnnamedIndex 是否保留未命名序号
 */
function resetConfig(keepUnnamedIndex: boolean = true): void {
  const oldIndex = config.value.unnamedIndex;
  config.value = {
    ...getDefaultConfig(),
    unnamedIndex: keepUnnamedIndex ? oldIndex : 1,
  };
  saveConfig();
}

/**
 * 初始化配置
 * 从 localStorage 加载配置
 */
function initConfig(): void {
  loadConfig();
}

// ==================== 组合式函数 ====================
export function useAppConfig() {
  return {
    // 状态
    config,
    
    // 计算属性
    displayEventName,
    hasCurrentData,
    
    // 方法
    loadConfig,
    saveConfig,
    setEventName,
    setTheme,
    setDisplayStyle,
    setCustomFont,
    setEventDate,
    getEventDate,
    setCurrentDbPath,
    getNextUnnamedIndex,
    generateFileName,
    addToRecentBooks,
    removeFromRecentBooks,
    clearRecentBooks,
    resetConfig,
    initConfig,
  };
}

// 默认导出
export default useAppConfig;
