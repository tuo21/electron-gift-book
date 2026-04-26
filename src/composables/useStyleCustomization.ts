import type { Ref } from 'vue'

export function useStyleCustomization(
  setDisplayStyle: (s: 'full' | 'compact') => void,
  setCustomFont: (f: string | null) => void,
  toastRef: Ref<{ success: (msg: string) => void } | null>
) {
  function applyCustomFont(fontCssName: string) {
    document.documentElement.style.setProperty('--font-name-amount', `'${fontCssName}', 'SimSun', 'KaiTi', serif`)
  }

  function removeCustomFont() {
    document.documentElement.style.setProperty('--font-name-amount', "'演示春风楷', 'KaiTi', 'SimSun', serif")
  }

  function handleStyleConfirm(style: 'full' | 'compact') {
    setDisplayStyle(style)
  }

  function handleSelectFont(fontCssName: string) {
    setCustomFont(fontCssName)
    applyCustomFont(fontCssName)
    toastRef.value?.success('字体已应用')
  }

  function handleResetFont() {
    setCustomFont(null)
    removeCustomFont()
    toastRef.value?.success('已恢复默认字体')
  }

  return { applyCustomFont, handleStyleConfirm, handleSelectFont, handleResetFont }
}
