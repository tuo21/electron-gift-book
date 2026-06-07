import { ref, reactive } from 'vue'
import { voiceService } from '../services/voiceService'

const showVoiceSettings = ref(false)
const voiceEnabled = ref(true)
const voiceRate = ref(0.9)
const voiceVolume = ref(1)
const voicePitch = ref(1)

export function useVoice() {
  return reactive({
    showVoiceSettings,
    voiceEnabled,
    voiceRate,
    voiceVolume,
    voicePitch,
    handleShowVoiceSettings() { showVoiceSettings.value = true },
    handleCloseVoiceSettings() { showVoiceSettings.value = false },
    handleVoiceEnabledChange(value: boolean) { voiceEnabled.value = value; voiceService.setEnabled(value) },
    handleVoiceRateChange(value: number) { voiceRate.value = value; voiceService.setRate(value) },
    handleVoiceVolumeChange(value: number) { voiceVolume.value = value; voiceService.setVolume(value) },
    handleVoicePitchChange(value: number) { voicePitch.value = value; voiceService.setPitch(value) },
    handleTestVoice() {
      if (voiceService.isSupported()) voiceService.speak('测试语音播报，张三，贰佰元')
    },
  })
}
