// file: src/services/realApi.ts
import { IImageGenerator, IVLMAnalyzer, ITTSGenerator, ImageGenResult, VLMAnalysisResult, TTSResult, ArtStyle } from "../interfaces/api";
import { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } from "../config/apiConfig";

// ==========================================
// 1. 图像生成服务 (保留 Fal.ai Scribble 接口，供黑客松涂鸦生成使用)
// ==========================================
export class RealImageGenerator implements IImageGenerator {
  async generateFromScribble(
    scribbleBase64: string,
    style: ArtStyle
  ): Promise<ImageGenResult> {
    const promptMap = {
      claymation: "vinyl toy style, 3D claymation, chibi 3D render, Pop Mart aesthetics, whimsical clay monster, solid monochrome background",
      woolfelt: "handmade wool felt plushie monster, fuzzy needle-felted texture, cozy toy, solid background",
      crayon: "crayon scribble art, children storybook illustration, colorful pencil texture, white background",
      popmart: "cute vinyl toy style, Pop Mart designer toy, smooth reflections, solid background"
    };

    // 默认使用 Fal.ai 官方的高速 Flux Canny 接口进行手绘图深度拟真
    const res = await fetch("https://queue.fal.run/fal-ai/flux/canny", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.NEXT_PUBLIC_FAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: scribbleBase64,
        prompt: promptMap[style] || promptMap.claymation,
        image_size: "square_hd",
        num_inference_steps: 28,
        enable_safety_checker: true
      })
    });

    if (!res.ok) {
      throw new Error(`Fal.ai image generation failed: ${res.statusText}`);
    }

    const result = await res.json();
    return { imageUrl: result.images[0].url };
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
// 3. 真实语音合成服务 (标准 OpenAI Audio Speech 格式)
// ==========================================
export class RealTTSGenerator implements ITTSGenerator {
  async generateSpeech(text: string, voiceProfile: string): Promise<TTSResult> {
    
    // 映射声音配置到 OpenAI 官方提供的声音
    let selectedVoice = "alloy"; // 默认
    if (voiceProfile === "hyper_kid") {
      selectedVoice = "shimmer"; // 萌系偏高音
    } else if (voiceProfile === "gentle_sloth") {
      selectedVoice = "nova"; // 温柔女声
    } else if (voiceProfile === "stubborn_goblin") {
      selectedVoice = "onyx"; // 低沉男声
    } else if (voiceProfile === "robotic_toy") {
      selectedVoice = "echo"; // 机械科技感
    }

    const res = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: selectedVoice,
        response_format: "mp3"
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI TTS generation failed: ${res.statusText}`);
    }

    const blob = await res.blob();
    // 转换为前端可以直接播放的 Blob Object URL
    const audioUrl = URL.createObjectURL(blob);
    return { audioUrl };
  }
}
