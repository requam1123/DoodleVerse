// file: src/services/mockApi.ts
import { IImageGenerator, IVLMAnalyzer, ITTSGenerator, ImageGenResult, VLMAnalysisResult, TTSResult, ArtStyle } from "../interfaces/api";

export class MockImageGenerator implements IImageGenerator {
  async generateFromScribble(
    scribbleBase64: string,
    style: ArtStyle
  ): Promise<ImageGenResult> {
    // 模拟 2 秒图像生成延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const styleMockMap = {
      claymation: "/demo/claymation.png",
      woolfelt: "/demo/woolfelt.png",
      crayon: "/demo/crayon.png",
      popmart: "/demo/claymation.png" // Q版盲盒默认复用黏土风格
    };

    return {
      imageUrl: styleMockMap[style] || styleMockMap.claymation
    };
  }
}

export class MockVLMAnalyzer implements IVLMAnalyzer {
  async analyzeMonster(
    scribbleBase64: string,
    generatedImageUrl: string,
    userSpeechText?: string
  ): Promise<VLMAnalysisResult> {
    // 模拟 1.5 秒多模态大模型分析延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const names = ["小泥泥怪", "蓬蓬毛球", "蜡笔呆呆", "泡泡盲盒兽"];
    const elements = ["温和土", "棉花风", "七彩虹", "闪光水"];
    const scripts = [
      "哼，虽然你把我画得歪歪扭扭的，但看在这一对酷炫翅膀的份上就原谅你啦！快带我出去玩吧！",
      "主人！谢谢你把我做得毛茸茸的，快抱着我一起在黑客松现场打瞌睡吧！",
      "哎呀，我的眼睛怎么这么大？不过配上这个色彩真的超级酷，我太喜欢啦！",
      "滴答滴答！感觉体内的数字能量充满啦，快来陪我来一场超级涂鸦大作战吧！"
    ];

    const randomIndex = Math.floor(Math.random() * names.length);

    return {
      name: userSpeechText || names[randomIndex],
      personality: ["软萌呆滞", "元气满满", "傲娇任性", "神秘慵懒"][randomIndex],
      attributes: {
        hp: Math.floor(Math.random() * 50) + 50,
        atk: Math.floor(Math.random() * 50) + 50,
        def: Math.floor(Math.random() * 50) + 50,
        element: elements[randomIndex]
      },
      script: scripts[randomIndex],
      voiceProfile: ["gentle_sloth", "hyper_kid", "stubborn_goblin", "robotic_toy"][randomIndex]
    };
  }
}

export class MockTTSGenerator implements ITTSGenerator {
  async generateSpeech(text: string, voiceProfile: string): Promise<TTSResult> {
    // 模拟 1 秒语音合成延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    // 返回 mock 标识，前端收到此标识后使用 Web Speech API 朗读文本，解决本地无实际 TTS 云端接口的问题
    return {
      audioUrl: "mock"
    };
  }
}
