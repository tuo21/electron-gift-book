/**
 * 语音服务
 * 封装 Web Speech API 用于语音播报
 */
export class VoiceService {
  private synth: SpeechSynthesis;
  private utterance: SpeechSynthesisUtterance;
  private enabled: boolean;

  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance = new SpeechSynthesisUtterance();
    this.utterance.lang = 'zh-CN';
    this.utterance.rate = 0.9;
    this.utterance.pitch = 1;
    this.utterance.volume = 1;
    this.enabled = true;
  }

  /**
   * 设置语音是否启用
   * @param enabled 是否启用
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 设置语速
   * @param rate 语速 (0.1-10)
   */
  public setRate(rate: number): void {
    this.utterance.rate = rate;
  }

  /**
   * 设置音量
   * @param volume 音量 (0-1)
   */
  public setVolume(volume: number): void {
    this.utterance.volume = volume;
  }

  /**
   * 设置音调
   * @param pitch 音调 (0-2)
   */
  public setPitch(pitch: number): void {
    this.utterance.pitch = pitch;
  }

  /**
   * 设置语音类型
   * @param voiceURI 语音 URI
   */
  public setVoice(voiceURI: string): void {
    if (!this.synth) return;
    
    // 立即尝试设置
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.voiceURI === voiceURI);
    if (voice) {
      this.utterance.voice = voice;
      return;
    }
    
    // 如果语音还未加载完成，等待加载完成后再设置
    const setVoiceAfterLoad = () => {
      const voices = this.synth.getVoices();
      const voice = voices.find(v => v.voiceURI === voiceURI);
      if (voice) {
        this.utterance.voice = voice;
      }
    };
    
    // 监听语音加载事件
    this.synth.addEventListener('voiceschanged', setVoiceAfterLoad, { once: true });
  }

  /**
   * 语音播报
   * @param text 要播报的文本
   */
  public speak(text: string): void {
    if (!this.synth || !this.enabled) return;
    
    // 取消之前的播报
    this.synth.cancel();
    
    this.utterance.text = text;
    this.synth.speak(this.utterance);
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