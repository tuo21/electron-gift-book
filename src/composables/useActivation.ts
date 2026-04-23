import { ref } from 'vue';
import licenseAPI from '../api/license';

export const useActivation = () => {
  const isLoading = ref(false);
  const isActivated = ref(false);

  // 检查激活状态
  const checkActivation = async (): Promise<boolean> => {
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
