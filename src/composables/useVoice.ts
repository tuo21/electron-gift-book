import { ref, reactive } from 'vue'
import { voiceService } from '../services/voiceService'

const showVoiceSettings = ref(false)
const voiceEnabled = ref(true)
const voiceRate = ref(0.9)
const voiceVolume = ref(1)
const voicePitch = ref(1)
const voiceVoice = ref('')
const availableVoices = ref<SpeechSynthesisVoice[]>([])

function initVoiceList() {
  if (voiceService.isSupported()) {
    const voices = voiceService.getVoices()
    availableVoices.value = voices.filter(voice => voice.lang.includes('zh'))
    if (availableVoices.value.length > 0 && !voiceVoice.value) {
      voiceVoice.value = availableVoices.value[0].voiceURI
      voiceService.setVoice(voiceVoice.value)
    }
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = initVoiceList
}

initVoiceList()

export function useVoice() {
  return reactive({
    showVoiceSettings,
    voiceEnabled,
    voiceRate,
    voiceVolume,
    voicePitch,
    voiceVoice,
    availableVoices,
    handleShowVoiceSettings() { showVoiceSettings.value = true },
    handleCloseVoiceSettings() { showVoiceSettings.value = false },
    handleVoiceEnabledChange(value: boolean) { voiceEnabled.value = value; voiceService.setEnabled(value) },
    handleVoiceRateChange(value: number) { voiceRate.value = value; voiceService.setRate(value) },
    handleVoiceVolumeChange(value: number) { voiceVolume.value = value; voiceService.setVolume(value) },
    handleVoicePitchChange(value: number) { voicePitch.value = value; voiceService.setPitch(value) },
    handleVoiceVoiceChange(value: string) { voiceVoice.value = value; voiceService.setVoice(value) },
    handleTestVoice() {
      if (voiceService.isSupported()) voiceService.speak('测试语音播报，张三，贰佰元')
    },
  })
}
