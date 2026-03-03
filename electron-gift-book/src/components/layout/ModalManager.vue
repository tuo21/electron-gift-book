<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  closeOnOverlayClick?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'update:visible', visible: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlayClick: true
})

const emit = defineEmits<Emits>()

// 点击遮罩层关闭
const handleOverlayClick = () => {
  if (props.closeOnOverlayClick) {
    emit('close')
    emit('update:visible', false)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--theme-paper);
  border-radius: var(--theme-border-radius);
  box-shadow: var(--theme-shadow);
  min-width: 400px;
  max-width: 90vw;
}
</style>