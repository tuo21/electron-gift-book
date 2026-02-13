import { ref } from 'vue';

const BASE_WIDTH = 1440;

const scale = ref(1);

function calculateScale(): number {
  const windowWidth = window.innerWidth;
  const newScale = Math.max(1, windowWidth / BASE_WIDTH);
  return newScale;
}

function updateScale(): void {
  scale.value = calculateScale();
  document.documentElement.style.setProperty('--fullscreen-scale', scale.value.toString());
}

function getCurrentScale(): number {
  return scale.value;
}

function initFullscreenScale(): void {
  updateScale();
  window.addEventListener('resize', updateScale);
}

function destroyFullscreenScale(): void {
  window.removeEventListener('resize', updateScale);
}

export function useFullscreenScale() {
  return {
    scale,
    getCurrentScale,
    initFullscreenScale,
    destroyFullscreenScale,
    updateScale,
  };
}

export default useFullscreenScale;
