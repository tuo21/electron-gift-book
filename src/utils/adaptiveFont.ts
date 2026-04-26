/**
 * 根据文字长度计算自适应字号
 * @param text 文本内容
 * @param maxLength 最大字符数（超过后开始缩小）
 * @param maxSize 最大字号
 * @param minSize 最小字号
 */
export function getAdaptiveFontSize(
  text: string,
  maxLength: number = 3,
  maxSize: number = 28,
  minSize: number = 16
): number {
  if (!text || text.length <= maxLength) {
    return maxSize
  }
  const reduceSize = (text.length - maxLength) * 6
  return Math.max(minSize, maxSize - reduceSize)
}
