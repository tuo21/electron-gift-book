<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import RecordForm from './components/RecordForm.vue';
import RecordList from './components/RecordList.vue';
import type { Record, Statistics } from './types/database';

// 记录列表
const records = ref<Record[]>([]);

// 统计信息
const statistics = ref<Statistics>({
  totalCount: 0,
  totalAmount: 0,
  cashAmount: 0,
  wechatAmount: 0,
  internalAmount: 0,
});

// 列表组件引用
const recordListRef = ref<InstanceType<typeof RecordList>>();

// 加载所有记录
const loadRecords = async () => {
  try {
    const response = await window.db.getAllRecords();
    console.log('Records from DB:', response);
    if (response.success && response.data) {
      records.value = response.data.map((record: any) => ({
        ...record,
        id: record.Id,
        createTime: record.CreateTime,
        updateTime: record.UpdateTime,
      }));
      console.log('Mapped records:', records.value);
    }
  } catch (error) {
    console.error('加载记录失败:', error);
  }
};

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await window.db.getStatistics();
    console.log('Statistics from DB:', response);
    if (response.success && response.data) {
      statistics.value = response.data;
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

// 提交新记录
const handleSubmit = async (record: Omit<Record, 'id' | 'createTime' | 'updateTime'>) => {
  try {
    // 转换字段名以匹配数据库，空字符串转为 null
    const dbRecord = {
      GuestName: record.guestName.trim(),
      Amount: record.amount,
      AmountChinese: record.amountChinese || null,
      ItemDescription: record.itemDescription?.trim() || null,
      PaymentType: record.paymentType,
      Remark: record.remark?.trim() || null,
      IsDeleted: 0,
    };

    const response = await window.db.insertRecord(dbRecord as any);
    if (response.success) {
      await loadRecords();
      await loadStatistics();

      // 跳转到最后一页显示新记录
      setTimeout(() => {
        recordListRef.value?.goToLastPage();
      }, 100);
    } else {
      alert('保存失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('保存记录失败:', error);
    alert('保存失败，请重试');
  }
};

// 编辑记录
const handleEdit = async (record: Record) => {
  const newName = prompt('修改姓名:', record.guestName);
  if (newName === null) return;

  const newAmount = prompt('修改金额:', record.amount.toString());
  if (newAmount === null) return;

  const newRemark = prompt('修改备注:', record.remark || '');
  if (newRemark === null) return;

  try {
    // 转换字段名以匹配数据库，空字符串转为 null
    const dbRecord = {
      Id: record.id,
      GuestName: newName.trim(),
      Amount: parseFloat(newAmount) || record.amount,
      AmountChinese: record.amountChinese || null,
      ItemDescription: record.itemDescription?.trim() || null,
      PaymentType: record.paymentType,
      Remark: newRemark.trim() || null,
      IsDeleted: record.isDeleted,
    };

    const response = await window.db.updateRecord(dbRecord as any);
    if (response.success) {
      await loadRecords();
      await loadStatistics();
    } else {
      alert('更新失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('更新记录失败:', error);
    alert('更新失败，请重试');
  }
};

// 删除记录
const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这条记录吗？')) return;

  try {
    const response = await window.db.softDeleteRecord(id);
    if (response.success) {
      await loadRecords();
      await loadStatistics();
    } else {
      alert('删除失败: ' + (response.error || '未知错误'));
    }
  } catch (error) {
    console.error('删除记录失败:', error);
    alert('删除失败，请重试');
  }
};

// 格式化金额
const formatMoney = (amount: number) => {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 隐藏金额显示（星号）
const hideAmount = ref(true);

// 显示/隐藏金额
const displayAmount = computed(() => {
  if (hideAmount.value) {
    return '****';
  }
  return formatMoney(statistics.value.totalAmount);
});

// 切换金额显示
const toggleAmountDisplay = () => {
  hideAmount.value = !hideAmount.value;
};

// 页面加载时初始化
onMounted(() => {
  loadRecords();
  loadStatistics();
});
</script>

<template>
  <div class="app-container">
    <!-- 顶部工具栏 -->
    <header class="app-header">
      <h1 class="app-title">电子礼金簿</h1>
      <div class="header-actions">
        <button class="header-btn" @click="toggleAmountDisplay">
          {{ hideAmount ? '显示金额' : '隐藏金额' }}
        </button>
      </div>
    </header>

    <!-- 统计信息栏 -->
    <div class="statistics-bar">
      <div class="stat-item">
        <span class="stat-label">总人数</span>
        <span class="stat-value">{{ statistics.totalCount }} 人</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总金额</span>
        <span class="stat-value amount-total">¥{{ displayAmount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">现金</span>
        <span class="stat-value">¥{{ hideAmount ? '****' : formatMoney(statistics.cashAmount) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">微信</span>
        <span class="stat-value">¥{{ hideAmount ? '****' : formatMoney(statistics.wechatAmount) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">内收</span>
        <span class="stat-value">¥{{ hideAmount ? '****' : formatMoney(statistics.internalAmount) }}</span>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 左侧录入表单 -->
      <aside class="form-section">
        <RecordForm @submit="handleSubmit" />
      </aside>

      <!-- 右侧展示列表 -->
      <section class="list-section">
        <RecordList
          ref="recordListRef"
          :records="records"
          :page-size="8"
          @edit="handleEdit"
          @delete="handleDelete"
        />
      </section>
    </main>

    <!-- 底部信息 -->
    <footer class="app-footer">
      <p>快捷键: Tab/↓ 切换字段 | Enter 保存 | F1现金 F2微信 F3内收</p>
    </footer>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'KaiTi', 'STKaiti', 'Microsoft YaHei', sans-serif;
  background: #1a1a1a;
  overflow: hidden;
}
</style>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #2c1810 0%, #1a0f0a 100%);
  overflow: hidden;
}

/* 顶部工具栏 */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: linear-gradient(135deg, #8B0000 0%, #5c0000 100%);
  border-bottom: 3px solid #DAA520;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.app-title {
  color: #FFD700;
  font-size: 32px;
  font-weight: bold;
  font-family: 'KaiTi', 'STKaiti', serif;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
  letter-spacing: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-btn {
  padding: 10px 20px;
  border: 2px solid #DAA520;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  color: #FFD700;
  font-size: 14px;
  font-family: 'KaiTi', 'STKaiti', serif;
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-btn:hover {
  background: rgba(255, 215, 0, 0.3);
}

/* 统计信息栏 */
.statistics-bar {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding: 16px 32px;
  background: rgba(139, 0, 0, 0.5);
  border-bottom: 2px solid rgba(218, 165, 32, 0.5);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: rgba(255, 215, 0, 0.8);
  font-size: 12px;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.stat-value {
  color: #FFD700;
  font-size: 20px;
  font-weight: bold;
  font-family: 'KaiTi', 'STKaiti', serif;
}

.amount-total {
  font-size: 28px;
  color: #FFD700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  gap: 24px;
  padding: 24px 32px;
  overflow: hidden;
}

.form-section {
  width: 320px;
  flex-shrink: 0;
}

.list-section {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* 底部信息 */
.app-footer {
  padding: 12px 32px;
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(218, 165, 32, 0.3);
  text-align: center;
}

.app-footer p {
  color: rgba(255, 215, 0, 0.6);
  font-size: 12px;
  font-family: 'KaiTi', 'STKaiti', serif;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #DAA520;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #FFD700;
}
</style>
