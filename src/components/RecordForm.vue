<template>
  <div class="record-form">
    <h2 class="form-title" :class="{ 'edit-mode': isEditMode }">
      {{ isEditMode ? '编辑记录' : '礼金录入' }}
    </h2>
    <div v-if="isEditMode" class="edit-hint">
      <span class="edit-name">{{ formData.guestName }}</span>
      <button class="cancel-edit-btn" @click="exitEditMode">取消编辑</button>
    </div>

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
          @focus="onInputFocus('guestName')"
          @input="onInputChange('guestName', formData.guestName)"
          @blur="onInputBlur"
          @keydown.tab.prevent="focusAmount"
          @keydown.arrow-down.prevent="focusAmount"
          @keydown.enter.stop.prevent="onEnterKey(focusAmount)"
        />
      </div>

      <!-- 金额输入 -->
      <div class="form-item">
        <label class="form-label">礼金金额</label>
        <input
          ref="amountInput"
          v-model="formData.amount"
          type="text"
          inputmode="numeric"
          class="form-input"
          placeholder="请输入金额"
          @focus="onInputFocus('amount')"
          @input="onInputChange('amount', String(formData.amount))"
          @blur="onAmountBlurHandler"
          @keydown.tab.prevent="focusPaymentType"
          @keydown.arrow-down.prevent="focusPaymentType"
          @keydown.arrow-up.prevent="focusName"
          @keydown.enter.stop.prevent="onEnterKey(focusPaymentType)"
        />
        <div class="amount-chinese">
          {{ amountChinese || '\u00A0' }}
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
            :data-value="value"
            @click="formData.paymentType = Number(value)"
          >
            {{ label }}
          </button>
        </div>
        <div class="payment-hint">
          ← → 选择支付方式，Enter 确认并跳到备注
        </div>
      </div>

      <!-- 备注输入 -->
      <div class="form-item">
        <label class="form-label">备注\地址</label>
        <input
          ref="remarkInput"
          v-model="formData.remark"
          type="text"
          class="form-input"
          placeholder="可选填"
          @focus="onInputFocus('remark')"
          @input="onInputChange('remark', formData.remark)"
          @blur="onInputBlur"
          @keydown.tab.prevent="focusItem"
          @keydown.arrow-down.prevent="focusItem"
          @keydown.arrow-up.prevent="focusPaymentType"
          @keydown.enter.stop.prevent="onEnterKey(focusItem)"
        />
      </div>

      <!-- 物品描述 -->
      <div class="form-item">
        <label class="form-label">礼品</label>
        <input
          ref="itemInput"
          v-model="formData.itemDescription"
          type="text"
          class="form-input"
          placeholder="如: 被子、枕头等"
          @focus="onInputFocus('itemDescription')"
          @input="onInputChange('itemDescription', formData.itemDescription)"
          @blur="onInputBlur"
          @keydown.tab.prevent="trySubmit"
          @keydown.arrow-down.prevent="focusName"
          @keydown.arrow-up.prevent="focusRemark"
          @keydown.enter.stop.prevent="onEnterKey(trySubmit)"
        />
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button
          ref="submitBtn"
          type="button"
          class="submit-btn"
          :disabled="!isValid"
          @click="onSubmit"
        >
          确认
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

    <div v-if="showSuccess" class="success-message">
      保存成功！
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { numberToChinese, isValidAmount } from '../utils/amountConverter';
import type { Record } from '../types/database';
import { PaymentType, paymentTypeMap } from '../constants';

const emit = defineEmits<{
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void;
  (e: 'update', record: Record): void;
  (e: 'cancel'): void;
  (e: 'input-preview', field: string, value: string): void;
  (e: 'clear-preview'): void;
}>();

const isEditMode = ref(false);
const editingId = ref<number | null>(null);
const paymentTypes = paymentTypeMap;

const formData = ref({
  guestName: '',
  amount: '',
  paymentType: PaymentType.CASH,
  remark: '',
  itemDescription: '',
});

const amountChinese = ref('');
const showSuccess = ref(false);

const nameInput = ref<HTMLInputElement>();
const amountInput = ref<HTMLInputElement>();
const paymentOptions = ref<HTMLDivElement>();
const remarkInput = ref<HTMLInputElement>();
const itemInput = ref<HTMLInputElement>();
const submitBtn = ref<HTMLButtonElement>();

const isValid = computed(() => {
  return formData.value.guestName.trim() !== '' &&
         formData.value.amount !== '' &&
         isValidAmount(parseFloat(formData.value.amount));
});

const onAmountBlurHandler = () => {
  onInputBlur();
  const amount = parseFloat(formData.value.amount);
  if (formData.value.amount && isValidAmount(amount)) {
    amountChinese.value = numberToChinese(amount);
  } else {
    amountChinese.value = '';
  }
};

const currentField = ref('');
let blurTimeout: ReturnType<typeof setTimeout> | null = null;

let lastEnterTime = 0;
let enterTimer: ReturnType<typeof setTimeout> | null = null;
const DOUBLE_ENTER_DELAY = 300;

const getFieldValue = (field: string): string => {
  switch (field) {
    case 'guestName': return formData.value.guestName;
    case 'amount': return formData.value.amount;
    case 'remark': return formData.value.remark;
    case 'itemDescription': return formData.value.itemDescription;
    default: return '';
  }
};

const onInputFocus = (field: string) => {
  if (blurTimeout) {
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  currentField.value = field;
  emit('input-preview', field, getFieldValue(field));
};

const onInputChange = (field: string, value: string) => {
  if (currentField.value === field) {
    emit('input-preview', field, value);
  }
};

const onInputBlur = () => {
  blurTimeout = setTimeout(() => {
    emit('clear-preview');
    currentField.value = '';
    blurTimeout = null;
  }, 300);
};

function trySubmit() {
  if (formData.value.guestName.trim() === '') {
    focusName();
  } else if (!isValid.value) {
    focusAmount();
  } else {
    onSubmit();
  }
}

function onEnterKey(nextAction: () => void) {
  const now = Date.now();
  const isDouble = (now - lastEnterTime) < DOUBLE_ENTER_DELAY;

  if (isDouble) {
    if (enterTimer) {
      clearTimeout(enterTimer);
      enterTimer = null;
    }
    lastEnterTime = 0;
    trySubmit();
    return;
  }

  lastEnterTime = now;
  if (enterTimer) clearTimeout(enterTimer);
  enterTimer = setTimeout(() => {
    lastEnterTime = 0;
    enterTimer = null;
  }, DOUBLE_ENTER_DELAY);

  nextAction();
}

const onSubmit = async () => {
  if (!isValid.value) return;

  if (isEditMode.value && editingId.value !== null) {
    const record: Record = {
      id: editingId.value,
      guestName: formData.value.guestName.trim(),
      amount: parseFloat(formData.value.amount),
      amountChinese: amountChinese.value,
      paymentType: formData.value.paymentType,
      remark: formData.value.remark?.trim() || undefined,
      itemDescription: formData.value.itemDescription?.trim() || undefined,
      isDeleted: 0,
    };
    emit('update', record);
    showSuccess.value = true;
    setTimeout(() => { showSuccess.value = false; }, 1500);
    exitEditMode();
  } else {
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
    showSuccess.value = true;
    setTimeout(() => { showSuccess.value = false; }, 1500);
    clearForm();
    focusName();
  }
};

const enterEditMode = (record: Record) => {
  isEditMode.value = true;
  editingId.value = record.id ?? null;
  formData.value = {
    guestName: record.guestName,
    amount: record.amount.toString(),
    paymentType: record.paymentType,
    remark: record.remark || '',
    itemDescription: record.itemDescription || '',
  };
  amountChinese.value = record.amountChinese || numberToChinese(record.amount);
  focusName();
};

const exitEditMode = () => {
  isEditMode.value = false;
  editingId.value = null;
  clearForm();
  emit('cancel');
};

const clearForm = () => {
  formData.value = {
    guestName: '',
    amount: '',
    paymentType: PaymentType.CASH,
    remark: '',
    itemDescription: '',
  };
  amountChinese.value = '';
};

const focusName = () => nameInput.value?.focus();
const focusAmount = () => amountInput.value?.focus();
const focusPaymentType = () => {
  const firstBtn = paymentOptions.value?.querySelector('button');
  firstBtn?.focus();
};
const focusRemark = () => remarkInput.value?.focus();
const focusItem = () => itemInput.value?.focus();

const handleKeydown = (e: KeyboardEvent) => {
  const isInPaymentArea = document.activeElement?.closest('.payment-options');

  if (isInPaymentArea) {
    const buttons = paymentOptions.value?.querySelectorAll('button');
    if (!buttons || buttons.length === 0) return;

    const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % buttons.length;
      buttons[nextIndex]?.focus();
    }
    else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
      buttons[prevIndex]?.focus();
    }
    else if (e.key === 'Tab') {
      e.preventDefault();
      if (currentIndex < buttons.length - 1) {
        buttons[currentIndex + 1]?.focus();
      } else {
        focusRemark();
      }
    }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex >= 0) {
        const paymentType = Number(buttons[currentIndex].getAttribute('data-value'));
        formData.value.paymentType = paymentType;
      }
      onEnterKey(focusRemark);
    }
    return;
  }

  if (e.key === 'F1') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.CASH;
  }
  else if (e.key === 'F2') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.WECHAT;
  }
  else if (e.key === 'F3') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.INTERNAL;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  focusName();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (enterTimer) clearTimeout(enterTimer);
  if (blurTimeout) clearTimeout(blurTimeout);
});

defineExpose({
  enterEditMode,
  exitEditMode,
  clearForm,
  focusName,
});
</script>
<style scoped>
/*
  ========================================
  礼金录入表单 - 日式极简风格
  ========================================
*/

.record-form {
  background: transparent;
  padding-left: 12px;
}

.form-title {
  color: var(--theme-form-title);
  font-size: var(--theme-font-size-lg);
  font-weight: 600;
  text-align: center;
  margin-bottom: var(--theme-spacing-md);
  font-family: var(--font-name-amount);
  padding-bottom: var(--theme-spacing-sm);
  border-bottom: 1px solid var(--theme-form-border);
  letter-spacing: 4px;
  position: relative;
}

.form-title::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: var(--theme-form-title);
  border-radius: 1px;
}

.form-title.edit-mode {
  color: var(--theme-form-title);
}

.edit-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 76, 76, 0.08);
  border-radius: var(--theme-border-radius-sm);
  margin-bottom: var(--theme-spacing-md);
  font-size: var(--theme-font-size-sm);
  color: #333;
  border: 1px solid var(--theme-form-border);
}

.edit-name {
  font-family: var(--font-name-amount);
  font-weight: 600;
  color: var(--theme-form-title);
}

.cancel-edit-btn {
  padding: 4px 12px;
  border: none;
  border-radius: var(--theme-border-radius-sm);
  background: var(--theme-btn-primary-bg);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.cancel-edit-btn:hover {
  background: var(--theme-btn-primary-bg-hover);
  transform: translateY(-1px);
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1px;
}

.form-input {
  padding: 12px 14px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  background: white;
  font-size: var(--theme-font-size-md);
  transition: all 0.25s ease;
  font-family: inherit;
  color: var(--theme-text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--theme-form-input-focus);
  box-shadow: 0 0 0 3px rgba(255, 76, 76, 0.1);
  background: white;
}

.form-input::placeholder {
  color: var(--theme-text-muted);
}

.amount-chinese {
  color: var(--theme-form-title);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 0;
  font-family: var(--font-name-amount);
  letter-spacing: 2px;
  text-align: center;
  min-height: 24px;
  font-style: italic;
}

.payment-options {
  display: flex;
  gap: 6px;
}

.payment-btn {
  flex: 1;
  padding: 10px 4px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  background: white;
  color: var(--theme-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  font-weight: 500;
}

.payment-btn:hover {
  border-color: var(--theme-form-accent);
  color: var(--theme-form-accent);
  background: rgba(255, 76, 76, 0.05);
}

.payment-btn.active {
  background: var(--theme-btn-primary-bg);
  color: white;
  font-weight: 600;
  border-color: var(--theme-form-accent);
  box-shadow: 0 2px 8px rgba(255, 76, 76, 0.3);
}

.payment-hint {
  color: var(--theme-text-muted);
  font-size: 11px;
  text-align: center;
  margin-top: 6px;
  opacity: 0.7;
  letter-spacing: 0.5px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: var(--theme-spacing-md);
}

.submit-btn,
.clear-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: var(--theme-border-radius-sm);
  font-size: var(--theme-font-size-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  letter-spacing: 2px;
}

.submit-btn {
  background: var(--theme-btn-primary-bg);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 76, 76, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 76, 76, 0.4);
  background: var(--theme-btn-primary-bg-hover);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn:disabled {
  background: var(--theme-border);
  color: var(--theme-text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

.clear-btn {
  background: var(--theme-btn-secondary-bg);
  color: var(--theme-btn-secondary-text);
  border: 1px solid var(--theme-btn-secondary-border);
}

.clear-btn:hover {
  background: rgba(255, 76, 76, 0.05);
  border-color: var(--theme-btn-secondary-border-hover);
  color: var(--theme-btn-secondary-text-hover);
}

.success-message {
  position: fixed;
  top: 24px;
  right: 24px;
  background: linear-gradient(135deg, #34A853 0%, #2E8B47 100%);
  color: white;
  padding: 14px 20px;
  border-radius: var(--theme-border-radius-sm);
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(52, 168, 83, 0.3);
  animation: slideIn 0.3s ease;
  z-index: 1000;
  font-family: inherit;
  letter-spacing: 1px;
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
