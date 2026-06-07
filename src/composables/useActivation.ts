import { ref } from 'vue';
// [ACTIVATION_FEATURE] licenseAPI - 如需恢复激活功能，请取消注释
// import licenseAPI from '../api/license';

const isLoading = ref(false);
const isActivated = ref(false);

export const useActivation = () => {

  // 检查激活状态
  // TODO: [ACTIVATION_FEATURE] 激活功能已被临时隐藏，所有用户均可直接使用全部功能
  // 如需重新启用激活功能，请移除以下硬编码逻辑，恢复原有的 licenseAPI.isActivated() 调用
  const checkActivation = async (): Promise<boolean> => {
    // 临时隐藏激活功能：始终返回已激活状态，让所有用户可以使用全部功能
    // 原代码已保留为注释，便于以后恢复
    /*
    try {
      isLoading.value = true;
      const result = await licenseAPI.isActivated();
      isActivated.value = result;
      return result;
    } catch (error) {
      console.error('检查激活状态失败:', error);
      return false;
    } finally {
      isLoading.value = false;
    }
    */
    isActivated.value = true; // 临时：强制设置为已激活
    return true;
  };

  // 需要激活的操作包装器
  const requireActivation = async (callback: () => any): Promise<boolean> => {
    const activated = await checkActivation();
    if (!activated) {
      return false;
    }
    await callback();
    return true;
  };

  return {
    isLoading,
    isActivated,
    checkActivation,
    requireActivation
  };
};
