<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FieldMapping, ImportPreview, ParsedRecord } from '../utils/import';
import { standardFieldMappings, checkRequiredFields, parseRecords } from '../utils/import';

// ==================== Props & Emits ====================
const props = defineProps<{
  show: boolean;
  filePath: string;
  defaultEventName: string;
  preview: ImportPreview | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', data: { eventName: string; records: ParsedRecord[] }): void;
}>();

// ==================== 响应式数据 ====================
const eventName = ref(props.defaultEventName);
const customMappings = ref<FieldMapping[]>([]);
const isImporting = ref(false);

// ==================== 计算属性 ====================
// 标准字段列表
const standardFields = computed(() => {
  return Object.entries(standardFieldMappings).map(([key, config]) => ({
    field: key,
    label: config.label,
    required: config.required
  }));
});

// 未映射的标准字段
const unmappedStandardFields = computed(() => {
  const mapped = new Set(customMappings.value.map(m => m.standardField));
  return standardFields.value.filter(f => !mapped.has(f.field));
});

// 已使用的 Excel 列
const usedExcelIndices = computed(() => {
  return new Set(customMappings.value.map(m => m.excelIndex));
});

// 检查是否满足导入条件
const canImport = computed(() => {
  const check = checkRequiredFields(customMappings.value);
  return check.valid && eventName.value.trim() !== '';
});

// 缺失的必需字段
const missingRequiredFields = computed(() => {
  const check = checkRequiredFields(customMappings.value);
  return check.missing;
});

// ==================== 监听 ====================
watch(() => props.preview, (newPreview) => {
  if (newPreview) {
    customMappings.value = [...newPreview.mappings];
  }
}, { immediate: true });

watch(() => props.defaultEventName, (newName) => {
  eventName.value = newName;
});

// ==================== 方法 ====================
// 获取字段的置信度样式
const getConfidenceClass = (confidence: string): string => {
  switch (confidence) {
    case 'high': return 'confidence-high';
    case 'medium': return 'confidence-medium';
    case 'low': return 'confidence-low';
    default: return 'confidence-none';
  }
};

// 获取置信度文本
const getConfidenceText = (confidence: string): string => {
  switch (confidence) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '无';
  }
};

// 更新字段映射
const updateMapping = (standardField: string, excelIndex: number | null) => {
  const existingIndex = customMappings.value.findIndex(m => m.standardField === standardField);
  
  if (excelIndex === null) {
    // 移除映射
    if (existingIndex > -1) {
      customMappings.value.splice(existingIndex, 1);
    }
  } else {
    // 添加或更新映射
    const header = props.preview?.headers[excelIndex] || '';
    const fieldConfig = standardFieldMappings[standardField as keyof typeof standardFieldMappings];
    
    const newMapping: FieldMapping = {
      standardField,
      standardLabel: fieldConfig?.label || standardField,
      excelHeader: header,
      excelIndex,
      confidence: 'high' // 手动选择视为高置信度
    };
    
    if (existingIndex > -1) {
      customMappings.value[existingIndex] = newMapping;
    } else {
      customMappings.value.push(newMapping);
    }
  }
};

// 获取当前字段的映射
const getCurrentMapping = (standardField: string): number | null => {
  const mapping = customMappings.value.find(m => m.standardField === standardField);
  return mapping ? mapping.excelIndex : null;
};

// 确认导入
const handleConfirm = async () => {
  if (!canImport.value || !props.preview) return;

  isImporting.value = true;
  try {
    // 通过 IPC 调用主进程解析文件
    const parseResponse = await window.electronAPI.parseImportFile(props.filePath);
    if (!parseResponse.success) {
      alert('解析文件失败: ' + (parseResponse.error || '未知错误'));
      return;
    }

    // 使用解析结果和当前映射关系解析记录
    const { data } = parseResponse.data!;
    const records = parseRecords(data, customMappings.value);

    emit('confirm', {
      eventName: eventName.value.trim(),
      records
    });
  } catch (error) {
    console.error('导入失败:', error);
    alert('导入失败: ' + (error as Error).message);
  } finally {
    isImporting.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="handleClose">
    <div class="modal-content import-dialog" @click.stop>
      <!-- 头部 -->
      <div class="modal-header">
        <h3 class="modal-title">📥 导入数据</h3>
        <button class="modal-close" @click="handleClose">×</button>
      </div>

      <!-- 内容区 -->
      <div class="modal-body">
        <!-- 事务名称 -->
        <div class="section">
          <label class="section-label">事务名称</label>
          <input
            v-model="eventName"
            type="text"
            class="event-name-input"
            placeholder="请输入事务名称"
          />
          <span class="hint">导入后可通过点击标题修改</span>
        </div>

        <!-- 字段映射 -->
        <div class="section">
          <div class="section-header">
            <label class="section-label">字段映射</label>
            <span class="record-count" v-if="preview">
              共 {{ preview.totalRows }} 条记录
            </span>
          </div>
          
          <!-- 缺失必需字段警告 -->
          <div v-if="missingRequiredFields.length > 0" class="warning-banner">
            <span class="warning-icon">⚠️</span>
            <span>缺少必需字段: {{ missingRequiredFields.join('、') }}</span>
          </div>

          <!-- 映射表格 -->
          <div class="mapping-table">
            <div class="mapping-header">
              <span class="header-cell">系统字段</span>
              <span class="header-cell">Excel 列</span>
              <span class="header-cell">匹配度</span>
            </div>
            
            <div
              v-for="field in standardFields"
              :key="field.field"
              class="mapping-row"
              :class="{ 'required': field.required, 'mapped': getCurrentMapping(field.field) !== null }"
            >
              <span class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="required-mark">*</span>
              </span>
              
              <select
                class="mapping-select"
                :value="getCurrentMapping(field.field) ?? ''"
                @change="updateMapping(field.field, $event.target.value === '' ? null : parseInt($event.target.value))"
              >
                <option value="">-- 不导入 --</option>
                <option
                  v-for="(header, index) in preview?.headers"
                  :key="index"
                  :value="index"
                  :disabled="usedExcelIndices.has(index) && getCurrentMapping(field.field) !== index"
                >
                  {{ header }}
                </option>
              </select>
              
              <span
                class="confidence-badge"
                :class="getConfidenceClass(
                  customMappings.find(m => m.standardField === field.field)?.confidence || 'none'
                )"
              >
                {{ getConfidenceText(
                  customMappings.find(m => m.standardField === field.field)?.confidence || 'none'
                ) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 数据预览 -->
        <div class="section" v-if="preview && preview.previewData.length > 0">
          <label class="section-label">数据预览（前5条）</label>
          <div class="preview-table-wrapper">
            <table class="preview-table">
              <thead>
                <tr>
                  <th v-for="field in standardFields.filter(f => getCurrentMapping(f.field) !== null)" :key="field.field">
                    {{ field.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in preview.previewData" :key="index">
                  <td v-for="field in standardFields.filter(f => getCurrentMapping(f.field) !== null)" :key="field.field">
                    {{ row[field.label] || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 未匹配列提示 -->
        <div v-if="preview && preview.unmatchedHeaders.length > 0" class="unmatched-section">
          <span class="unmatched-label">未匹配的列:</span>
          <span class="unmatched-tags">
            <span v-for="header in preview.unmatchedHeaders" :key="header" class="unmatched-tag">
              {{ header }}
            </span>
          </span>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!canImport || isImporting"
          @click="handleConfirm"
        >
          {{ isImporting ? '导入中...' : `确认导入 (${preview?.totalRows || 0}条)` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 模态框基础样式 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 头部 ==================== */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

/* ==================== 内容区 ==================== */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section {
  margin-bottom: 20px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.section-header .section-label {
  margin-bottom: 0;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.record-count {
  font-size: 13px;
  color: #666;
  background: #f0f0f0;
  padding: 4px 10px;
  border-radius: 12px;
}

/* ==================== 输入框 ==================== */
.event-name-input {
  width: 100%;
  max-width: 300px;
  padding: 10px 14px;
  font-size: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  color: #333;
  font-family: inherit;
  transition: all 0.3s ease;
  outline: none;
}

.event-name-input:focus {
  border-color: #EB564A;
  box-shadow: 0 0 0 3px rgba(235, 86, 74, 0.1);
}

/* ==================== 警告横幅 ==================== */
.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #c62828;
}

.warning-icon {
  font-size: 16px;
}

/* ==================== 映射表格 ==================== */
.mapping-table {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.mapping-header {
  display: grid;
  grid-template-columns: 120px 1fr 70px;
  gap: 12px;
  padding: 10px 14px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.mapping-row {
  display: grid;
  grid-template-columns: 120px 1fr 70px;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background 0.2s;
}

.mapping-row:last-child {
  border-bottom: none;
}

.mapping-row:hover {
  background: #fafafa;
}

.mapping-row.required .field-label {
  font-weight: 600;
}

.mapping-row.mapped {
  background: #f0f9ff;
}

.field-label {
  font-size: 14px;
  color: #333;
}

.required-mark {
  color: #EB564A;
  margin-left: 2px;
}

.mapping-select {
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #ffffff;
  color: #333;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.mapping-select:focus {
  border-color: #EB564A;
  box-shadow: 0 0 0 2px rgba(235, 86, 74, 0.1);
}

.mapping-select option:disabled {
  color: #ccc;
}

/* ==================== 置信度徽章 ==================== */
.confidence-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.confidence-high {
  background: #e8f5e9;
  color: #2e7d32;
}

.confidence-medium {
  background: #fff3e0;
  color: #ef6c00;
}

.confidence-low {
  background: #fce4ec;
  color: #c2185b;
}

.confidence-none {
  background: #f5f5f5;
  color: #999;
}

/* ==================== 预览表格 ==================== */
.preview-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table th,
.preview-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.preview-table th {
  background: #f5f5f5;
  font-weight: 600;
  color: #666;
}

.preview-table tr:last-child td {
  border-bottom: none;
}

.preview-table td {
  color: #333;
}

/* ==================== 未匹配列 ==================== */
.unmatched-section {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fff8e1;
  border-radius: 8px;
  font-size: 13px;
}

.unmatched-label {
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
}

.unmatched-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.unmatched-tag {
  padding: 3px 8px;
  background: #ffe0b2;
  color: #e65100;
  border-radius: 4px;
  font-size: 12px;
}

/* ==================== 底部按钮 ==================== */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary {
  background: #EB564A;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #d6453d;
}

/* ==================== 滚动条 ==================== */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
