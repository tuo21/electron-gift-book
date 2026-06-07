import { watch, type Ref } from 'vue'
import type { Record } from '../types/database'
import { mapApiRecords } from '../utils/recordMapper'
import { logger } from '../utils/logger'

export function useSearch(
  showSearchModal: Ref<boolean>,
  searchKeyword: Ref<string>,
  searchResults: Ref<Record[]>,
  isSearching: Ref<boolean>,
  _showActivateModal: Ref<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
  _checkActivation: () => Promise<boolean>, // [ACTIVATION_FEATURE] 激活功能已隐藏
  recordListRef: Ref<{ goToRecord: (id: number) => boolean } | undefined | null>
) {
  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  watch(searchKeyword, (newKeyword) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      if (newKeyword.trim()) {
        performSearch()
      } else {
        searchResults.value = []
      }
    }, 300)
  })

  async function handleSearch() {
    // [ACTIVATION_FEATURE] 激活功能已被临时隐藏，所有用户均可使用搜索功能
    // 如需重新启用激活检查，请恢复以下代码
    /*
    const isActivated = await checkActivation()
    if (!isActivated) {
      showActivateModal.value = true
      return
    }
    */
    showSearchModal.value = true
    searchKeyword.value = ''
    searchResults.value = []
  }

  function closeSearchModal() {
    showSearchModal.value = false
    searchKeyword.value = ''
    searchResults.value = []
  }

  async function performSearch(keyword?: string) {
    const searchTerm = keyword || searchKeyword.value
    if (!searchTerm.trim()) {
      alert('请输入搜索关键词')
      return
    }

    isSearching.value = true
    try {
      const response = await (window as any).db.searchRecords(searchTerm.trim())
      if (response.success && response.data) {
        searchResults.value = mapApiRecords(response.data)
      } else {
        alert('搜索失败: ' + (response.error || '未知错误'))
      }
    } catch (error) {
      logger.error('Search', '搜索失败:', error)
      alert('搜索失败，请重试')
    } finally {
      isSearching.value = false
    }
  }

  function handleSearchResultClick(record: Record) {
    closeSearchModal()
    setTimeout(() => {
      const success = recordListRef.value?.goToRecord(record.id || 0)
      if (!success) alert('未找到该记录，可能已被删除')
    }, 100)
  }

  return { handleSearch, closeSearchModal, performSearch, handleSearchResultClick }
}
