import { ref, computed, shallowRef } from 'vue'
import type { Record, Statistics, RecordHistory } from '../types/database'
import { getLunarDisplay } from '../utils/lunarCalendar'
import { useRecordsStore } from '../stores/useRecordsStore'

const showSplashScreen = ref(true)
const isAppReady = ref(false)
let _recordsStore: ReturnType<typeof useRecordsStore> | null = null

const records = shallowRef<Record[]>([])
const statistics = ref<Statistics>({
  totalCount: 0,
  totalAmount: 0,
  cashAmount: 0,
  wechatAmount: 0,
  internalAmount: 0,
})
const bookName = ref('电子礼金簿')
const lunarDate = ref(getLunarDisplay())
const intervalId = ref<number | null>(null)

const showStatisticsModal = ref(false)
const showEditHistoryModal = ref(false)
const editHistoryList = ref<RecordHistory[]>([])

const currentPreview = ref({ field: '', value: '' })
const previewText = computed(() => currentPreview.value.value || '\u00A0')

const currentPage = ref(1)

const showSearchModal = ref(false)
const searchKeyword = ref('')
const searchResults = ref<Record[]>([])
const isSearching = ref(false)

const showExportModal = ref(false)
const isExporting = ref(false)

const showStyleDialog = ref(false)
const syncDialogVisible = ref(false)

export function useAppState() {
  if (!_recordsStore) {
    _recordsStore = useRecordsStore()
  }
  return {
    showSplashScreen,
    isAppReady,
    recordsStore: _recordsStore,
    records,
    statistics,
    bookName,
    lunarDate,
    intervalId,
    showStatisticsModal,
    showEditHistoryModal,
    editHistoryList,
    currentPreview,
    previewText,
    currentPage,
    showSearchModal,
    searchKeyword,
    searchResults,
    isSearching,
    showExportModal,
    isExporting,
    showStyleDialog,
    syncDialogVisible,
  }
}
