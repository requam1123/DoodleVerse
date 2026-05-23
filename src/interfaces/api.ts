// file: src/interfaces/api.ts

// 1. 图像生成模块规范
export interface ImageGenResult {
  imageUrl: string; // 生成后的图像 URL (本地 Mock URL 或云端 CDN 链接)
}

export type ArtStyle = 'claymation' | 'woolfelt' | 'crayon' | 'popmart';
export type ImageSourceType = 'drawing' | 'webcam';

export interface IImageGenerator {
  /**
   * 将涂鸦 Base64 转化为精美手办/玩具图像
   * @param scribbleBase64 涂鸦画板导出的 base64 字符串
   * @param style 用户选择的风格: 'claymation' | 'woolfelt' | 'crayon' | 'popmart'
   * @param sourceType 输入来源：画板或摄像头
   */
  generateFromScribble(
    scribbleBase64: string,
    style: ArtStyle,
    sourceType?: ImageSourceType
  ): Promise<ImageGenResult>;
}

// 2. 多模态分析与性格赋予 (VLM) 规范
export interface MonsterAttributes {
  hp: number;
  atk: number;
  def: number;
  element: string; // 属性：如 火、水、草、超能力
}

export interface VLMAnalysisResult {
  name: string;          // 怪兽名称
  personality: string;   // 性格标签 (例如: "傲娇", "调皮")
  attributes: MonsterAttributes;
  script: string;        // 实时互动的台词
  voiceProfile: string;  // 推荐匹配的声线 ID/标签
}

export interface IVLMAnalyzer {
  /**
   * 通过多模态分析涂鸦和生成图，输出怪兽的属性及对话台词
   * @param scribbleBase64 原始手绘图
   * @param generatedImageUrl Fal.ai 生成的玩具图
   * @param userSpeechText 用户对小怪兽的命名或语音描述
   */
  analyzeMonster(
    scribbleBase64: string,
    generatedImageUrl: string,
    userSpeechText?: string
  ): Promise<VLMAnalysisResult>;
}

// 3. 语音合成模块 (TTS) 规范
export interface TTSResult {
  audioUrl: string; // 生成的 MP3 音频文件地址 (或 Data URI)
}

export interface ITTSGenerator {
  /**
   * 将怪兽台词合成为指定声线的语音
   * @param text 台词内容
   * @param voiceProfile 声线配置
   */
  generateSpeech(
    text: string,
    voiceProfile: string
  ): Promise<TTSResult>;
}
