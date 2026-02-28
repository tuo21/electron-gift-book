<template>
  <div class="record-form">
    <h2 class="form-title" :class="{ 'edit-mode': isEditMode }">
      {{ isEditMode ? '编辑记录' : '礼金录入' }}
    </h2>
    <div v-if="isEditMode" class="edit-hint">
      正在编辑: {{ formData.guestName }}
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
const onAmountBlur = () => {
  if (formData.value.amount && isValidAmount(formData.value.amount)) {
    amountChinese.value = numberToChinese(formData.value.amount);
  } else {
    amountChinese.value = '';
  }
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
.record-form {
  background: transparent;
}

.form-title {
  color: var(--theme-primary);
  font-size: var(--theme-font-size-xl);
  font-weight: bold;
  text-align: center;
  margin-bottom: var(--theme-spacing-sm);
  font-family: var(--theme-font-family);
  border-bottom: 1px solid var(--theme-primary);
  padding-bottom: var(--theme-spacing-sm);
}

.form-title.edit-mode {
  color: #ff6b35;
  border-bottom-color: #ff6b35;
}

.edit-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--theme-spacing-sm);
  background: rgba(255, 107, 53, 0.1);
  border-radius: var(--theme-border-radius);
  margin-bottom: var(--theme-spacing-md);
  font-size: var(--theme-font-size-sm);
  color: #ff6b35;
  font-family: var(--theme-font-family);
}

.cancel-edit-btn {
  padding: 2px 8px;
  border: 1px solid #ff6b35;
  border-radius: 4px;
  background: transparent;
  color: #ff6b35;
  font-size: var(--theme-font-size-xs);
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-edit-btn:hover {
  background: #ff6b35;
  color: white;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-xs);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--theme-spacing-xs);
}

.form-label {
  color: var(--theme-text-primary);
  font-size: var(--theme-font-size-sm);
  font-weight: 600;
  font-family: var(--theme-font-family);
}

.form-input {
  padding: var(--theme-spacing-xs) var(--theme-spacing-md);
  border: 1px solid var(--theme-border-color);
  border-radius: var(--theme-border-radius);
  background: rgba(255, 255, 255, 0.9);
  font-size: var(--theme-font-size-md);
  transition: all 0.3s ease;
  font-family: var(--theme-font-family);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-input:focus {
  outline: none;
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 2px rgba(235, 86, 74, 0.2);
  background: #fff;
}

.form-input::placeholder {
  color: #999;
}

.amount-chinese {
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-xs);  /* 最小字号 */
  font-weight: normal;
  padding: var(--theme-spacing-xs) 0;
  background: transparent;  /* 无填充色 */
  font-family: var(--font-name-amount);  /* 大写金额使用演示春风楷 */
  letter-spacing: 1px;
  text-align: center;
  min-height: 20px;  /* 保持最小高度避免布局跳动 */
}

.payment-options {
  display: flex;
  gap: var(--theme-spacing-sm);
}

.payment-btn {
  flex: 1;
  padding: var(--theme-spacing-xs) var(--theme-spacing-xs);
  border: 1px solid var(--theme-border-color);
  border-radius: var(--theme-border-radius);
  background: rgba(255, 255, 255, 0.8);
  color: var(--theme-text-primary);
  font-size: var(--theme-font-size-sm);
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--theme-font-family);
}

.payment-btn:hover {
  background: rgba(235, 86, 74, 0.1);
}

.payment-btn.active {
  background: var(--theme-primary);
  color: var(--theme-text-light);
  font-weight: bold;
  border-color: var(--theme-primary);
}

.payment-hint {
  color: var(--theme-text-secondary);
  font-size: var(--theme-font-size-xs);
  text-align: center;
  margin-top: var(--theme-spacing-xs);
  font-family: var(--theme-font-family);
}

.form-actions {
  display: flex;
  gap: var(--theme-spacing-md);
  margin-top: var(--theme-spacing-md);
}

.submit-btn,
.clear-btn {
  flex: 1;
  padding: var(--theme-spacing-xs) var(--theme-spacing-xs);
  border: none;
  border-radius: var(--theme-border-radius);
  font-size: var(--theme-font-size-md);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--theme-font-family);
  box-shadow: var(--theme-shadow);
}

.submit-btn {
  background: var(--theme-primary);
  color: var(--theme-text-light);
}

.submit-btn:hover:not(:disabled) {
  background: var(--theme-primary-dark);
  box-shadow: var(--theme-shadow-hover);
  transform: translateY(-2px);
}

.submit-btn:disabled {
  background: #ccc;
  color: #999;
  cursor: not-allowed;
  box-shadow: none;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.8);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-color);
}

.clear-btn:hover {
  background: rgba(235, 86, 74, 0.1);
}

.success-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: var(--theme-spacing-md) var(--theme-spacing-lg);
  border-radius: var(--theme-border-radius);
  font-weight: bold;
  box-shadow: var(--theme-shadow);
  animation: slideIn 0.3s ease;
  z-index: 1000;
  font-family: var(--theme-font-family);
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
