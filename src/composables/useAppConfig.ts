import { ref, computed } from 'vue';
import type { ThemeType } from '../types/theme';
import bridge from '../api/bridge';

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
 * 从配置文件加载配置
 */
async function loadConfig(): Promise<void> {
  try {
    const response = await bridge.getAppConfig();
    if (response.success && response.data) {
      // 检查是否需要从localStorage迁移
      const localStorageConfig = localStorage.getItem('gift-book-config');
      if (localStorageConfig) {
        try {
          const parsed = JSON.parse(localStorageConfig);
          // 迁移配置到后端
          const configToSave = {
            eventName: parsed.eventName || DEFAULT_EVENT_NAME,
            theme: parsed.theme || 'red',
            displayStyle: parsed.displayStyle || 'full',
            customFontCssName: parsed.customFontCssName || null,
            eventDate: parsed.eventDate || null,
            recentBooks: parsed.recentBooks || [],
            unnamedIndex: parsed.unnamedIndex || 1,
          };
          await bridge.updateAppConfig(configToSave);
          // 清除localStorage中的配置
          localStorage.removeItem('gift-book-config');
          console.log('配置已从localStorage迁移到配置文件');
        } catch (e) {
          console.error('迁移配置失败:', e);
        }
      }
      
      config.value = {
        ...getDefaultConfig(),
        eventName: response.data.eventName || DEFAULT_EVENT_NAME,
        theme: response.data.theme || 'red',
        currentDbPath: null,
        recentBooks: response.data.recentBooks || [],
        unnamedIndex: response.data.unnamedIndex || 1,
        displayStyle: response.data.displayStyle || 'full',
        customFontCssName: response.data.customFontCssName || null,
        eventDate: response.data.eventDate || null,
      };
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    config.value = getDefaultConfig();
  }
}

/**
 * 保存配置到配置文件
 */
async function saveConfig(): Promise<void> {
  try {
    const configToSave = {
      eventName: config.value.eventName,
      theme: config.value.theme,
      displayStyle: config.value.displayStyle,
      customFontCssName: config.value.customFontCssName,
      eventDate: config.value.eventDate,
      recentBooks: config.value.recentBooks,
      unnamedIndex: config.value.unnamedIndex,
    };
    await bridge.updateAppConfig(configToSave);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

/**
 * 设置事务名称
 * @param name 事务名称
 */
async function setEventName(name: string): Promise<void> {
  config.value.eventName = name.trim();
  await saveConfig();
}

/**
 * 设置主题
 * @param theme 主题类型
 */
async function setTheme(theme: ThemeType): Promise<void> {
  config.value.theme = theme;
  await saveConfig();
}

/**
 * 设置展示样式
 * @param style 展示样式（full=完整大字型, compact=简洁紧凑型）
 */
async function setDisplayStyle(style: 'full' | 'compact'): Promise<void> {
  config.value.displayStyle = style;
  await saveConfig();
}

/**
 * 设置自定义字体（CSS 字体名称）
 * @param fontCssName CSS 字体名称（如 SimSun, KaiTi 等）
 */
async function setCustomFont(fontCssName: string | null): Promise<void> {
  config.value.customFontCssName = fontCssName;
  await saveConfig();
}

/**
 * 设置事务日期
 * @param date 事务日期 YYYY-MM-DD 格式
 */
async function setEventDate(date: string): Promise<void> {
  config.value.eventDate = date;
  await saveConfig();
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
async function setCurrentDbPath(path: string | null): Promise<void> {
  config.value.currentDbPath = path;
  await saveConfig();
}

/**
 * 获取下一个未命名序号
 * @returns 序号
 */
async function getNextUnnamedIndex(): Promise<number> {
  const index = config.value.unnamedIndex;
  config.value.unnamedIndex++;
  await saveConfig();
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
async function generateFileName(eventName?: string): Promise<string> {
  const name = eventName?.trim();
  if (name && name !== DEFAULT_EVENT_NAME) {
    const safeName = sanitizeFileName(name);
    return `${safeName}.db`;
  }
  const index = await getNextUnnamedIndex();
  return `未命名事务(${index}).db`;
}

/**
 * 添加到最近打开列表
 * @param name 显示名称
 * @param path 文件路径
 */
async function addToRecentBooks(name: string, path: string): Promise<void> {
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
  
  await saveConfig();
}

/**
 * 从最近打开列表中移除
 * @param path 文件路径
 */
async function removeFromRecentBooks(path: string): Promise<void> {
  config.value.recentBooks = config.value.recentBooks.filter(
    book => book.path !== path
  );
  await saveConfig();
}

/**
 * 清空最近打开列表
 */
async function clearRecentBooks(): Promise<void> {
  config.value.recentBooks = [];
  await saveConfig();
}

/**
 * 重置配置（用于新建礼金簿时）
 * @param keepUnnamedIndex 是否保留未命名序号
 */
async function resetConfig(keepUnnamedIndex: boolean = true): Promise<void> {
  const oldIndex = config.value.unnamedIndex;
  config.value = {
    ...getDefaultConfig(),
    unnamedIndex: keepUnnamedIndex ? oldIndex : 1,
  };
  await saveConfig();
}

/**
 * 初始化配置
 * 从配置文件加载配置
 */
async function initConfig(): Promise<void> {
  await loadConfig();
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
