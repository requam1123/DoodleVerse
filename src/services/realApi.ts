// file: src/services/realApi.ts
import { IImageGenerator, IVLMAnalyzer, ITTSGenerator, ImageGenResult, VLMAnalysisResult, TTSResult, ArtStyle, ImageSourceType } from "../interfaces/api";
import { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } from "../config/apiConfig";

// ==========================================
// 1. 图像生成服务 (OpenAI Next image endpoint via local API route)
// ==========================================
export class RealImageGenerator implements IImageGenerator {
  async generateFromScribble(
    scribbleBase64: string,
    style: ArtStyle,
    sourceType: ImageSourceType = "drawing"
  ): Promise<ImageGenResult> {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scribbleBase64,
        style,
        sourceType
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI Next image generation failed: ${errorText || res.statusText}`);
    }

    return await res.json() as ImageGenResult;
  }
}

// ==========================================
// 2. 真实多模态分析服务 (标准 OpenAI Chat Completions 格式)
// ==========================================
export class RealVLMAnalyzer implements IVLMAnalyzer {
  async analyzeMonster(
    scribbleBase64: string,
    generatedImageUrl: string,
    userSpeechText?: string
  ): Promise<VLMAnalysisResult> {
    
    // 构建标准的 OpenAI 多模态 Vision 消息体 payload
    const payload = {
      model: OPENAI_MODEL, // 默认使用 gpt-4o-mini 或 gpt-4o
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `你是一个充满童心与创意的数字生命孵化器。你的任务是分析上传的两个图像：
第 1 张是原始手绘涂鸦简笔画。
第 2 张是根据涂鸦用 AIGC 渲染生成的 3D 潮玩玩具图。

分析说明：
1. 观察两张图片的线条、眼睛个数、身体特征以及色调，计算出该怪兽的独特属性和生动的性格标签。
2. 结合用户输入的个性提示词（如有，见下文），生成包含 HP、ATK、DEF 的游戏卡牌数值以及所属的元素属性。
3. 撰写一段 60 字以内的中文开场自我介绍，要贴合其性格，以第一人称（如“哼”、“滴答”等语气词开头），表现出刚被赋予生命时的傲娇、热血、蠢萌或调皮。

用户补充个性描述: "${userSpeechText || '未命名小可爱'}"

请必须严格以 JSON 格式输出，JSON 结构中必须完整包含以下字段，不要添加任何 Markdown 标记：
{
  "name": "创意怪兽名称",
  "personality": "简短的性格描述，例如'傲娇小鬼'",
  "attributes": {
    "hp": 50-100 之间的整数,
    "atk": 50-100 之间的整数,
    "def": 50-100 之间的整数,
    "element": "单字或两字元素名，如'火'、'水'、'风'、'闪电'"
  },
  "script": "幽默的怪兽自我介绍台词",
  "voiceProfile": "必须且只能是以下四个中之一：'gentle_sloth' | 'hyper_kid' | 'stubborn_goblin' | 'robotic_toy'"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: scribbleBase64 // 原手绘图 base64
              }
            },
            {
              type: "image_url",
              image_url: {
                url: generatedImageUrl.startsWith("http") ? generatedImageUrl : scribbleBase64 // 云端生成图 URL 
              }
            }
          ]
        }
      ],
      response_format: {
        type: "json_object"
      }
    };

    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`OpenAI Chat Completions failed: ${res.statusText}`);
    }

    const data = await res.json();
    const jsonText = data.choices[0].message.content;
    return JSON.parse(jsonText) as VLMAnalysisResult;
  }
}

// ==========================================
// 3. 真实语音合成服务 (OpenAI Next Fish TTS via local API route)
// ==========================================
export class RealTTSGenerator implements ITTSGenerator {
  async generateSpeech(text: string, voiceProfile: string): Promise<TTSResult> {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voiceProfile
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI Next TTS generation failed: ${errorText || res.statusText}`);
    }

    return await res.json() as TTSResult;
  }
}
