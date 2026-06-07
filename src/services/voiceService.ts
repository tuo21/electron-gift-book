/**
 * 语音服务
 * 封装 Web Speech API 用于语音播报
 *
 * 使用系统默认语音, 每次 speak() 创建新 utterance 实例以确保稳定性。
 */
export class VoiceService {
  private synth: SpeechSynthesis;
  private enabled: boolean;
  private rate = 0.9;
  private volume = 1;
  private pitch = 1;
  private lang = 'zh-CN';

  constructor() {
    this.synth = window.speechSynthesis;
    this.enabled = true;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setRate(rate: number): void {
    this.rate = rate;
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }

  public setPitch(pitch: number): void {
    this.pitch = pitch;
  }

  public speak(text: string): void {
    if (!this.synth || !this.enabled) return;

    this.synth.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.rate = this.rate;
      utterance.volume = this.volume;
      utterance.pitch = this.pitch;
      this.synth.speak(utterance);
    }, 50);
  }

  /**
   * 播报礼金信息
   * @param name 姓名
   * @param _amount 金额
   * @param amountChinese 中文金额
   */
  public speakGiftInfo(name: string, _amount: number, amountChinese: string): void {
    if (!this.enabled) return;

    const text = `${name}，${amountChinese}`;
    this.speak(text);
  }

  /**
   * 检查浏览器是否支持语音合成
   */
  public isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * 获取可用的语音列表
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }
}

export const voiceService = new VoiceService();
