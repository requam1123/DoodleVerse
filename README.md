# DoodleVerse (AnimaDoodle) - 涂鸦宇宙数字生命盲盒

DoodleVerse 是一款专为黑客松设计的多模态 AI 交互应用，能够将少儿的手绘涂鸦简笔画一键转化为高精度的 3D 黏土手办、毛绒玩具或水彩绘本风格的数字生命盲盒，并为其赋予独特的性格数值和声音表达。

## 🌟 核心特性
1. **触控手绘板**：支持 PC 鼠标与移动端设备触控的手绘 Canvas 画板，具备多种色彩、笔触粗细及橡皮擦。
2. **少儿友好艺术风格**：支持 **3D 黏土动画**、**温暖羊毛毡**、**缤纷蜡笔绘本**和**Q版潮玩盲盒** 4 种质感风格。
3. **数字生命孵化**：流光加载动画展示从“3D雕刻”到“性格塑造”和“声线注入”的完整 AIGC 渲染管线。
4. **全息卡牌展示**：支持卡牌旋转动效，展示生成的怪兽图像、Gemini 算法分配的性格属性、以及幽默的文字对话框。
5. **实时语音互动**：利用 Web Speech API 模拟真实的 TTS 语音合成，怪兽会以贴合其性格的速度和音调说出台词。
6. **个人收集箱**：支持将唤醒的小怪兽加入本地收集图鉴，支持断电持久化。

---

## 🛠️ 项目结构
```text
cb/
├── public/
│   └── demo/                 # 预生成的风格 Demo 效果图
│       ├── claymation.png
│       ├── woolfelt.png
│       └── crayon.png
├── src/
│   ├── app/
│   │   ├── globals.css       # 玻璃拟态、炫光、卡牌翻转等高级 CSS
│   │   ├── layout.tsx        # 网页布局及中文字体引入
│   │   └── page.tsx          # 交互画板与盲盒卡牌主界面
│   ├── interfaces/
│   │   └── api.ts            # 解耦的统一 ImageGen/VLM/TTS 接口定义
│   └── services/
│       └── mockApi.ts        # 零 Key 依赖的插拔式 Mock 服务实现
├── package.json
├── tsconfig.json
└── README.md                 # 运行指南
```

---

## 🚀 启动与运行

### 1. 依赖安装 (已在环境中自动完成)
本工程已经预装好所有包依赖，您可以直接启动。

### 2. 运行本地开发服务器
在项目根目录下执行：
```bash
npm run dev
```

启动后，在浏览器中访问：**[http://localhost:3131](http://localhost:3131)**。

### 3. 构建生产版本（已构建成功）
如需重新编译：
```bash
npm run build
```

---

## 🔌 真实 API 插拔式替换与端口说明
*   **前端端口**：运行于 `3131` 端口。
*   **后端端口**：预留为 `8089` 端口，配置定义于 [src/config/apiConfig.ts](file:///Users/quam1123/DO/cb/src/config/apiConfig.ts)。
*   **API 替换方法**：
    1. **图像生成**：在 `src/services/mockApi.ts` 中继承并修改 `MockImageGenerator` 的 `generateFromScribble`，向 `http://localhost:8089/api/generate` 或 Fal.ai 接口发送 `fetch` 请求。
2. **多模态 VLM**：编写对 Gemini 1.5 Flash (Google AI SDK) 的调用，传入画板 base64 与生成的图片 URL，解析返回的 JSON 结构即可。
3. **TTS 语音**：编写对 ElevenLabs/OpenAI TTS 接口的请求，返回音频 URL 并覆盖前端播放。
