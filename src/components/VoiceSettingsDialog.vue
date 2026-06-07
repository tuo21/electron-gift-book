<script setup lang="ts">
defineProps<{
  visible: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  voiceVolume: number;
  voicePitch: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:voiceEnabled', value: boolean): void;
  (e: 'update:voiceRate', value: number): void;
  (e: 'update:voiceVolume', value: number): void;
  (e: 'update:voicePitch', value: number): void;
  (e: 'test-voice'): void;
}>();

const handleClose = () => {
  emit('close');
};

const handleVoiceEnabledChange = (value: boolean) => {
  emit('update:voiceEnabled', value);
};

const handleVoiceRateChange = (value: number) => {
  emit('update:voiceRate', value);
};

const handleVoiceVolumeChange = (value: number) => {
  emit('update:voiceVolume', value);
};

const handleVoicePitchChange = (value: number) => {
  emit('update:voicePitch', value);
};

const handleTestVoice = () => {
  emit('test-voice');
};
</script>

<template>
  <div v-if="visible" class="voice-settings-dialog">
    <div class="dialog-overlay" @click="handleClose"></div>
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>语音设置</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="dialog-body">
        <!-- 语音开关 -->
        <div class="setting-item">
          <label>语音播报</label>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              :checked="voiceEnabled" 
              @change="(e) => handleVoiceEnabledChange((e.target as HTMLInputElement).checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      
      <!-- 语速 -->
      <div class="setting-item">
        <label>语速: {{ voiceRate.toFixed(1) }}</label>
        <input 
          type="range" 
          min="0.5" 
          max="2" 
          step="0.1" 
          :value="voiceRate" 
          @input="(e) => handleVoiceRateChange(Number((e.target as HTMLInputElement).value))"
          :disabled="!voiceEnabled"
        />
      </div>
      
      <!-- 音量 -->
      <div class="setting-item">
        <label>音量: {{ Math.round(voiceVolume * 100) }}%</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          :value="voiceVolume" 
          @input="(e) => handleVoiceVolumeChange(Number((e.target as HTMLInputElement).value))"
          :disabled="!voiceEnabled"
        />
      </div>
      
      <!-- 音调 -->
      <div class="setting-item">
        <label>音调: {{ voicePitch.toFixed(1) }}</label>
        <input 
          type="range" 
          min="0.5" 
          max="2" 
          step="0.1" 
          :value="voicePitch" 
          @input="(e) => handleVoicePitchChange(Number((e.target as HTMLInputElement).value))"
          :disabled="!voiceEnabled"
        />
      </div>
        
        <!-- 测试按钮 -->
        <div class="test-section">
          <button 
            class="test-btn" 
            @click="handleTestVoice"
            :disabled="!voiceEnabled"
          >
            测试语音
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-settings-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  position: relative;
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.dialog-body {
  padding: 20px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e0e0e0;
  border-radius: 24px;
  transition: .4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input:checked + .toggle-slider {
  background-color: #C75B39;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #C75B39;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #C75B39;
  cursor: pointer;
  border: none;
}

input[type="range"]:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: #ccc;
  cursor: not-allowed;
}

.test-section {
  margin-top: 30px;
  text-align: center;
}

.test-btn {
  padding: 10px 20px;
  background: #C75B39;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.test-btn:hover:not(:disabled) {
  background: #A04530;
}

.test-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>