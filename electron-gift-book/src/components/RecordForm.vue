<template>
  <div class="record-form">
    <h2 class="form-title">礼金录入</h2>

    <div class="form-content">
      <!-- 姓名输入 -->
      <div class="form-item">
        <label class="form-label">宾客姓名</label>
        <input
          ref="nameInput"
          v-model="formData.guestName"
          type="text"
          class="form-input"
          placeholder="请输入姓名"
          @keydown.tab.prevent="focusAmount"
          @keydown.arrow-down.prevent="focusAmount"
          @keydown.enter.prevent="focusAmount"
        />
      </div>

      <!-- 金额输入 -->
      <div class="form-item">
        <label class="form-label">礼金金额</label>
        <input
          ref="amountInput"
          v-model="formData.amount"
          type="number"
          class="form-input"
          placeholder="请输入金额"
          @blur="onAmountBlur"
          @keydown.tab.prevent="focusPaymentType"
          @keydown.arrow-down.prevent="focusPaymentType"
          @keydown.arrow-up.prevent="focusName"
          @keydown.enter.prevent="onAmountEnter"
        />
        <!-- 大写金额显示 -->
        <div v-if="amountChinese" class="amount-chinese">
          {{ amountChinese }}
        </div>
      </div>

      <!-- 支付方式 -->
      <div class="form-item">
        <label class="form-label">支付方式</label>
        <div class="payment-options" ref="paymentOptions">
          <button
            v-for="(label, value) in paymentTypes"
            :key="value"
            type="button"
            class="payment-btn"
            :class="{ active: formData.paymentType === Number(value) }"
            @click="formData.paymentType = Number(value)"
          >
            {{ label }}
          </button>
        </div>
        <div class="payment-hint">
          快捷键: F1现金 F2微信 F3内收
        </div>
      </div>

      <!-- 备注输入 -->
      <div class="form-item">
        <label class="form-label">备注</label>
        <input
          ref="remarkInput"
          v-model="formData.remark"
          type="text"
          class="form-input"
          placeholder="可选填"
          @keydown.tab.prevent="focusItem"
          @keydown.arrow-down.prevent="focusItem"
          @keydown.arrow-up.prevent="focusPaymentType"
          @keydown.enter.prevent="focusItem"
        />
      </div>

      <!-- 物品描述 -->
      <div class="form-item">
        <label class="form-label">物品</label>
        <input
          ref="itemInput"
          v-model="formData.itemDescription"
          type="text"
          class="form-input"
          placeholder="如: 被子、枕头等"
          @keydown.tab.prevent="onSubmit"
          @keydown.arrow-down.prevent="focusName"
          @keydown.arrow-up.prevent="focusRemark"
          @keydown.enter.prevent="onSubmit"
        />
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button
          type="button"
          class="submit-btn"
          :disabled="!isValid"
          @click="onSubmit"
        >
          保存记录 (Enter)
        </button>
        <button
          type="button"
          class="clear-btn"
          @click="clearForm"
        >
          清空
        </button>
      </div>
    </div>

    <!-- 保存成功提示 -->
    <div v-if="showSuccess" class="success-message">
      保存成功！
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { numberToChinese, isValidAmount } from '../utils/amountConverter';
import type { Record } from '../types/database';

// 定义事件
const emit = defineEmits<{
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void;
}>();

// 支付方式选项
const paymentTypes = {
  0: '现金',
  1: '微信',
  2: '内收',
};

// 表单数据
const formData = ref({
  guestName: '',
  amount: '',
  paymentType: 0,
  remark: '',
  itemDescription: '',
});

// 大写金额
const amountChinese = ref('');

// 保存成功提示
const showSuccess = ref(false);

// 输入框引用
const nameInput = ref<HTMLInputElement>();
const amountInput = ref<HTMLInputElement>();
const paymentOptions = ref<HTMLDivElement>();
const remarkInput = ref<HTMLInputElement>();
const itemInput = ref<HTMLInputElement>();

// 表单验证
const isValid = computed(() => {
  return formData.value.guestName.trim() !== '' &&
         formData.value.amount !== '' &&
         isValidAmount(formData.value.amount);
});

// 金额失去焦点时转换大写
const onAmountBlur = () => {
  if (formData.value.amount && isValidAmount(formData.value.amount)) {
    amountChinese.value = numberToChinese(formData.value.amount);
  } else {
    amountChinese.value = '';
  }
};

// 监听金额变化
watch(() => formData.value.amount, (newVal) => {
  if (newVal && isValidAmount(newVal)) {
    amountChinese.value = numberToChinese(newVal);
  } else {
    amountChinese.value = '';
  }
});

// 金额输入框回车
const onAmountEnter = () => {
  if (formData.value.guestName.trim() === '') {
    focusName();
  } else {
    onSubmit();
  }
};

// 提交表单
const onSubmit = async () => {
  if (!isValid.value) return;

  const record: Omit<Record, 'id' | 'createTime' | 'updateTime'> = {
    guestName: formData.value.guestName.trim(),
    amount: parseFloat(formData.value.amount),
    amountChinese: amountChinese.value,
    paymentType: formData.value.paymentType,
    remark: formData.value.remark?.trim() || undefined,
    itemDescription: formData.value.itemDescription?.trim() || undefined,
    isDeleted: 0,
  };

  emit('submit', record);

  // 显示成功提示
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 1500);

  // 清空表单并聚焦到姓名输入框
  clearForm();
  focusName();
};

// 清空表单
const clearForm = () => {
  formData.value = {
    guestName: '',
    amount: '',
    paymentType: 0,
    remark: '',
    itemDescription: '',
  };
  amountChinese.value = '';
};

// 聚焦方法
const focusName = () => nameInput.value?.focus();
const focusAmount = () => amountInput.value?.focus();
const focusPaymentType = () => {
  const firstBtn = paymentOptions.value?.querySelector('button');
  firstBtn?.focus();
};
const focusRemark = () => remarkInput.value?.focus();
const focusItem = () => itemInput.value?.focus();

// 键盘快捷键监听
const handleKeydown = (e: KeyboardEvent) => {
  // F1: 现金
  if (e.key === 'F1') {
    e.preventDefault();
    formData.value.paymentType = 0;
  }
  // F2: 微信
  else if (e.key === 'F2') {
    e.preventDefault();
    formData.value.paymentType = 1;
  }
  // F3: 内收
  else if (e.key === 'F3') {
    e.preventDefault();
    formData.value.paymentType = 2;
  }
};

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  // 初始聚焦
  focusName();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// 暴露方法给父组件
defineExpose({
  clearForm,
  focusName,
});
</script>

<style scoped>
.record-form {
  background: linear-gradient(135deg, #8B0000 0%, #A52A2A 100%);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 3px solid #DAA520;
  min-width: 280px;
}

.form-title {
  color: #FFD700;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'KaiTi', 'STKaiti', serif;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  color: #FFD700;
  font-size: 14px;
  font-weight: 600;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #DAA520;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 16px;
  transition: all 0.3s ease;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.form-input:focus {
  outline: none;
  border-color: #FFD700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.5);
  background: #fff;
}

.form-input::placeholder {
  color: #999;
}

.amount-chinese {
  color: #FFD700;
  font-size: 14px;
  font-weight: 600;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-family: 'KaiTi', 'STKaiti', serif;
  letter-spacing: 2px;
}

.payment-options {
  display: flex;
  gap: 8px;
}

.payment-btn {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid #DAA520;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #FFD700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.payment-btn:hover {
  background: rgba(255, 215, 0, 0.2);
}

.payment-btn.active {
  background: #FFD700;
  color: #8B0000;
  font-weight: bold;
}

.payment-hint {
  color: rgba(255, 215, 0, 0.7);
  font-size: 12px;
  text-align: center;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.submit-btn,
.clear-btn {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.submit-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #8B0000;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #FFE135 0%, #FFB800 100%);
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
  transform: translateY(-2px);
}

.submit-btn:disabled {
  background: #999;
  color: #666;
  cursor: not-allowed;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #FFD700;
  border: 2px solid #DAA520;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.success-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  font-weight: bold;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
