<script setup lang="ts">
import { ref } from 'vue';
import { voiceService } from '../services/voiceService';
import { AmountConverter } from '../utils/amountConverter';

const name = ref('张三');
const amount = ref('200');
const message = ref('');

const testVoice = () => {
  try {
    const amountNum = parseFloat(amount.value);
    const amountChinese = AmountConverter.toChinese(amountNum);
    voiceService.speakGiftInfo(name.value, amountNum, amountChinese);
    message.value = `正在播报: ${name.value}，${amountChinese}`;
  } catch (error) {
    message.value = `错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
};

const checkSupport = () => {
  if (voiceService.isSupported()) {
    message.value = '浏览器支持语音合成';
  } else {
    message.value = '浏览器不支持语音合成';
  }
};
</script>

<template>
  <div class="voice-test">
    <h2>语音播报测试</h2>
    
    <div class="test-form">
      <div class="form-item">
        <label>姓名：</label>
        <input v-model="name" type="text" placeholder="请输入姓名" />
      </div>
      
      <div class="form-item">
        <label>金额：</label>
        <input v-model="amount" type="number" placeholder="请输入金额" />
      </div>
      
      <div class="form-actions">
        <button @click="testVoice">测试语音</button>
        <button @click="checkSupport">检查支持</button>
      </div>
    </div>
    
    <div v-if="message" class="message">
      {{ message }}
    </div>
  </div>
</template>

<style scoped>
.voice-test {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.test-form {
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 15px;
}

label {
  display: inline-block;
  width: 80px;
  font-weight: 500;
}

input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 200px;
}

.form-actions {
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  background: #C75B39;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #A04530;
}

.message {
  margin-top: 20px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 4px;
  min-height: 40px;
}
</style>