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
          @keydown.enter.prevent="focusAmount"
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
          @keydown.enter.prevent="onAmountEnter"
        />
        <!-- 大写金额显示 -->
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
          回车确认，双击回车直接提交
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
          @keydown.enter.prevent="focusItem"
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

    <!-- 保存成功提示 -->
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

// 定义事件
const emit = defineEmits<{
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void;
  (e: 'update', record: Record): void;
  (e: 'cancel'): void;
  (e: 'input-preview', field: string, value: string): void;  // 输入预览事件
  (e: 'clear-preview'): void;  // 清空预览事件
}>();

// 编辑模式状态
const isEditMode = ref(false);
const editingId = ref<number | null>(null);

// 支付方式选项（使用共享常量）
const paymentTypes = paymentTypeMap;

// 表单数据
const formData = ref({
  guestName: '',
  amount: '',
  paymentType: PaymentType.CASH,
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

// 金额失去焦点时转换大写（避免在输入过程中频繁转换）
const onAmountBlurHandler = () => {
  // 触发清空预览
  onInputBlur();
  // 转换大写金额
  if (formData.value.amount && isValidAmount(formData.value.amount)) {
    amountChinese.value = numberToChinese(formData.value.amount);
  } else {
    amountChinese.value = '';
  }
};

// 当前聚焦的字段
const currentField = ref('');

// blur 延迟定时器
let blurTimeout: ReturnType<typeof setTimeout> | null = null;

// Enter 按键计数器（用于区分单击和双击）
const enterPressCount = ref(0);
let enterPressTimer: ReturnType<typeof setTimeout> | null = null;
let lastEnterTime = 0;
const DOUBLE_CLICK_DELAY = 300; // 双击时间间隔（毫秒）

// 获取字段值
const getFieldValue = (field: string): string => {
  switch (field) {
    case 'guestName': return formData.value.guestName;
    case 'amount': return formData.value.amount;
    case 'remark': return formData.value.remark;
    case 'itemDescription': return formData.value.itemDescription;
    default: return '';
  }
};

// 输入框获得焦点
const onInputFocus = (field: string) => {
  console.log('[RecordForm] onInputFocus:', field, 'blurTimeout:', blurTimeout);
  // 取消之前的延迟清空
  if (blurTimeout) {
    console.log('[RecordForm] clearing blurTimeout');
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  currentField.value = field;
  // 获取当前值并预览
  const value = getFieldValue(field);
  console.log('[RecordForm] emit input-preview:', field, value);
  emit('input-preview', field, value);
};

// 输入框内容变化
const onInputChange = (field: string, value: string) => {
  console.log('[RecordForm] onInputChange:', field, value, 'currentField:', currentField.value);
  if (currentField.value === field) {
    console.log('[RecordForm] emit input-preview:', field, value);
    emit('input-preview', field, value);
  }
};

// 输入框失去焦点（延迟清空，避免切换时闪烁）
const onInputBlur = () => {
  console.log('[RecordForm] onInputBlur, currentField:', currentField.value);
  // 使用 setTimeout 延迟清空，给下一个输入框的 focus 事件留出时间
  blurTimeout = setTimeout(() => {
    console.log('[RecordForm] blurTimeout callback executed, currentField:', currentField.value);
    console.log('[RecordForm] emit clear-preview');
    emit('clear-preview');
    currentField.value = '';
    blurTimeout = null;
  }, 300);  // 增加到 300ms
};

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

  if (isEditMode.value && editingId.value !== null) {
    // 编辑模式：发送更新事件
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
    
    // 显示成功提示
    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 1500);
    
    // 退出编辑模式
    exitEditMode();
  } else {
    // 新增模式
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
  }
};

// 进入编辑模式
const enterEditMode = (record: Record) => {
  isEditMode.value = true;
  // 使用 record.id，如果为 null 或 undefined，则保持原值
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

// 退出编辑模式
const exitEditMode = () => {
  isEditMode.value = false;
  editingId.value = null;
  clearForm();
  emit('cancel');
};

// 清空表单
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
  // 检查当前焦点是否在支付方式区域
  const isInPaymentArea = document.activeElement?.closest('.payment-options');

  if (isInPaymentArea) {
    const buttons = paymentOptions.value?.querySelectorAll('button');
    if (!buttons || buttons.length === 0) return;

    const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);

    // 左右方向键切换选择（循环）
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
    // Tab 在支付方式内切换，最后一个切换到备注
    else if (e.key === 'Tab') {
      e.preventDefault();
      if (currentIndex < buttons.length - 1) {
        // 不是最后一个，切换到下一个支付方式
        buttons[currentIndex + 1]?.focus();
      } else {
        // 是最后一个，切换到备注
        focusRemark();
      }
    }
    // Enter 确认或提交
    else if (e.key === 'Enter') {
      e.preventDefault();
      const now = Date.now();

      if (now - lastEnterTime < DOUBLE_CLICK_DELAY) {
        // 双击 - 直接提交
        if (enterPressTimer) {
          clearTimeout(enterPressTimer);
          enterPressTimer = null;
        }
        enterPressCount.value = 0;
        onSubmit();
      } else {
        // 单击 - 确认支付方式
        enterPressCount.value = 1;
        lastEnterTime = now;

        // 设置当前聚焦按钮对应的支付方式
        if (currentIndex >= 0) {
          const paymentType = Number(buttons[currentIndex].getAttribute('data-value'));
          formData.value.paymentType = paymentType;
        }

        enterPressTimer = setTimeout(() => {
          enterPressCount.value = 0;
          enterPressTimer = null;
        }, DOUBLE_CLICK_DELAY);
      }
    }
    return;
  }

  // F1: 现金
  if (e.key === 'F1') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.CASH;
  }
  // F2: 微信
  else if (e.key === 'F2') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.WECHAT;
  }
  // F3: 内收
  else if (e.key === 'F3') {
    e.preventDefault();
    formData.value.paymentType = PaymentType.INTERNAL;
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
  if (enterPressTimer) {
    clearTimeout(enterPressTimer);
  }
  if (blurTimeout) {
    clearTimeout(blurTimeout);
  }
});

// 暴露方法给父组件
defineExpose({
  clearForm,
  focusName,
  enterEditMode,
  exitEditMode,
  isEditMode,
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
