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
      <!-- 分组状态显示 -->
      <div v-if="groupState !== 'none'" class="group-status">
        <span class="group-status-label">分组状态：</span>
        <span class="group-status-value" :class="groupState">
          {{ groupState === 'active' ? '分组中' : '已临时结束' }}
        </span>
        <span v-if="currentGroupId" class="group-id">组号: {{ currentGroupId }}</span>
      </div>

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

      <!-- 分组操作区域 -->
      <div v-if="!isEditMode" class="group-actions">
        <button
          v-if="groupState === 'none'"
          type="button"
          class="group-btn start-btn"
          @click="startGroup"
        >
          开始分组
        </button>
        <button
          v-if="groupState === 'active'"
          type="button"
          class="group-btn pause-btn"
          @click="pauseGroup"
        >
          临时结束
        </button>
        <button
          v-if="groupState === 'paused'"
          type="button"
          class="group-btn resume-btn"
          @click="resumeGroup"
        >
          继续分组
        </button>
        <button
          v-if="groupState !== 'none'"
          type="button"
          class="group-btn end-btn"
          @click="showEndGroupModal = true"
        >
          结束分组
        </button>
      </div>
    </div>

    <div v-if="showSuccess" class="success-message">
      保存成功！
    </div>

    <div v-if="groupState === 'active' && !isEditMode" class="insert-hint">
      <span class="insert-hint-icon">+</span>
      <span class="insert-hint-text">正在插入到小组，输入后将自动添加到当前位置</span>
      <button class="insert-cancel-btn" @click="cancelInsert">取消</button>
    </div>

    <!-- 结束分组弹窗 -->
    <Teleport to="body">
      <div v-if="showEndGroupModal" class="end-group-overlay" @click.self="showEndGroupModal = false">
        <div class="end-group-dialog">
          <div class="dialog-header">
            <h3 class="dialog-title">结束分组</h3>
            <button class="close-btn" @click="showEndGroupModal = false">
              <IconSvg name="close" :size="18" />
            </button>
          </div>
          <div class="dialog-body">
            <div class="form-item">
              <label class="form-label">开支金额</label>
              <input
                ref="expenseInput"
                v-model="groupExpense"
                type="text"
                inputmode="numeric"
                class="form-input"
                placeholder="请输入开支金额"
              />
            </div>
            <div class="form-item">
              <label class="form-label">开支明细</label>
              <textarea
                v-model="groupExpenseDetail"
                class="form-input"
                rows="3"
                placeholder="请输入开支明细，如：请狮子、买烟花爆竹等"
              ></textarea>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="footer-btn cancel" @click="showEndGroupModal = false">取消</button>
            <button class="footer-btn confirm" @click="endGroup">确认结束</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { numberToChinese, isValidAmount } from '../utils/amountConverter';
import type { Record } from '../types/database';
import { PaymentType, paymentTypeMap } from '../constants';
import IconSvg from './IconSvg.vue';

const emit = defineEmits<{
  (e: 'submit', record: Omit<Record, 'id' | 'createTime' | 'updateTime'>): void;
  (e: 'update', record: Record): void;
  (e: 'cancel'): void;
  (e: 'input-preview', field: string, value: string): void;
  (e: 'clear-preview'): void;
  (e: 'start-group'): void;
  (e: 'pause-group'): void;
  (e: 'resume-group'): void;
  (e: 'end-group', data: { expense: number; detail: string; summaryId?: number | null }): void;
  (e: 'cancel-insert'): void;
}>();

const props = defineProps<{
  groupState?: 'none' | 'active' | 'paused';
  currentGroupId?: number;
}>();

const isEditMode = ref(false);
const editingId = ref<number | null>(null);
const editingGroupId = ref<number | undefined>(undefined);
const editingGroupRole = ref<'start' | 'end' | 'member' | 'summary' | undefined>(undefined);
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

const groupState = computed(() => props.groupState || 'none');
const currentGroupId = computed(() => props.currentGroupId);

const showEndGroupModal = ref(false);
const groupExpense = ref('');
const groupExpenseDetail = ref('');
const editingSummaryId = ref<number | null>(null);

const expenseInput = ref<HTMLInputElement>();

const nameInput = ref<HTMLInputElement>();
const amountInput = ref<HTMLInputElement>();
const paymentOptions = ref<HTMLDivElement>();
const remarkInput = ref<HTMLInputElement>();
const itemInput = ref<HTMLInputElement>();

const isValid = computed(() => {
  return formData.value.guestName.trim() !== '' &&
         formData.value.amount !== '' &&
         isValidAmount(parseFloat(formData.value.amount));
});

const startGroup = () => {
  emit('start-group');
};

const pauseGroup = () => {
  emit('pause-group');
};

const resumeGroup = () => {
  emit('resume-group');
};

const endGroup = () => {
  const expense = parseFloat(groupExpense.value) || 0;
  emit('end-group', { expense, detail: groupExpenseDetail.value.trim(), summaryId: editingSummaryId.value });
  showEndGroupModal.value = false;
  groupExpense.value = '';
  groupExpenseDetail.value = '';
  editingSummaryId.value = null;
};

const cancelInsert = () => {
  emit('cancel-insert');
};

const openEndGroupModal = (record: Record) => {
  editingSummaryId.value = record.id || null;
  groupExpense.value = record.groupExpense?.toString() || '';
  groupExpenseDetail.value = record.groupExpenseDetail || '';
  showEndGroupModal.value = true;
};

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
      groupId: editingGroupId.value,
      groupRole: editingGroupRole.value,
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
  editingGroupId.value = record.groupId ?? undefined;
  editingGroupRole.value = record.groupRole ?? undefined;
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
  openEndGroupModal,
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

.insert-hint {
  position: fixed;
  top: 80px;
  right: 24px;
  background: linear-gradient(135deg, #8B5A2B 0%, #6B4423 100%);
  color: white;
  padding: 12px 16px;
  border-radius: var(--theme-border-radius-sm);
  box-shadow: 0 4px 16px rgba(139, 90, 43, 0.3);
  animation: slideIn 0.3s ease;
  z-index: 1000;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
}

.insert-hint-icon {
  font-size: 18px;
  font-weight: bold;
}

.insert-hint-text {
  font-size: 14px;
  letter-spacing: 1px;
}

.insert-cancel-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.insert-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.3);
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

.group-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(139, 90, 43, 0.1);
  border-radius: var(--theme-border-radius-sm);
  margin-bottom: var(--theme-spacing-md);
  font-size: var(--theme-font-size-sm);
  border: 1px solid rgba(139, 90, 43, 0.2);
}

.group-status-label {
  color: var(--theme-text-muted);
}

.group-status-value {
  font-weight: 600;
}

.group-status-value.active {
  color: #22c55e;
}

.group-status-value.paused {
  color: #f59e0b;
}

.group-id {
  color: var(--theme-text-secondary);
  font-size: 12px;
  margin-left: auto;
  background: rgba(139, 90, 43, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.group-actions {
  display: flex;
  gap: 8px;
  margin-top: var(--theme-spacing-md);
  padding-top: var(--theme-spacing-md);
  border-top: 1px dashed var(--theme-form-border);
}

.group-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--theme-border);
  border-radius: var(--theme-border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

.start-btn {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.3);
}

.start-btn:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
}

.pause-btn {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
}

.pause-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
}

.resume-btn {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
}

.resume-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.end-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.end-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.end-group-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.end-group-dialog {
  width: 400px;
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius-lg);
  box-shadow: var(--theme-shadow-lg);
  border: 1px solid var(--theme-border);
  overflow: hidden;
}

.end-group-dialog .dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme-border);
}

.end-group-dialog .dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-text-primary);
  margin: 0;
}

.end-group-dialog .close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-text-muted);
  transition: all 0.2s;
}

.end-group-dialog .close-btn:hover {
  background: rgba(var(--theme-primary-rgb), 0.08);
  color: var(--theme-accent);
}

.end-group-dialog .dialog-body {
  padding: 20px;
}

.end-group-dialog .dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--theme-border);
}

.end-group-dialog .footer-btn {
  padding: 10px 20px;
  border-radius: var(--theme-border-radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: none;
}

.end-group-dialog .footer-btn.cancel {
  background: transparent;
  color: var(--theme-text-secondary);
  border: 1px solid var(--theme-border);
}

.end-group-dialog .footer-btn.cancel:hover {
  background: rgba(var(--theme-primary-rgb), 0.04);
}

.end-group-dialog .footer-btn.confirm {
  background: var(--theme-btn-primary-bg);
  color: white;
}

.end-group-dialog .footer-btn.confirm:hover {
  background: var(--theme-btn-primary-bg-hover);
}

.end-group-dialog textarea.form-input {
  resize: vertical;
}
</style>
