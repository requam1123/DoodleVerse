/* file: src/app/page.tsx */
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Trash2, RotateCcw, Volume2, Plus, Check, Play, Shield, Compass, Heart, Award, Pencil, Camera, Aperture } from 'lucide-react';
import { ArtStyle, ImageSourceType, VLMAnalysisResult } from '../interfaces/api';
import { MockVLMAnalyzer } from '../services/mockApi';
import { RealImageGenerator, RealTTSGenerator } from '../services/realApi';

const imageGen = new RealImageGenerator();
const vlmAnalyzer = new MockVLMAnalyzer();
const ttsGen = new RealTTSGenerator();
const CANVAS_SIZE = 400;

interface CollectedMonster extends VLMAnalysisResult {
  id: string;
  imageUrl: string;
  audioUrl?: string;
  style: ArtStyle;
  timestamp: string;
}

export default function Home() {
  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamCaptureCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8b5cf6'); // Default purple
  const [lineWidth, setLineWidth] = useState(8);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inputMode, setInputMode] = useState<ImageSourceType>('drawing');
  const [webcamStatus, setWebcamStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle');
  const [webcamError, setWebcamError] = useState('');
  const [capturedWebcamImage, setCapturedWebcamImage] = useState('');

  // App Pipeline State
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>('claymation');
  const [monsterName, setMonsterName] = useState('');
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardMonster, setCardMonster] = useState<CollectedMonster | null>(null);
  const [collection, setCollection] = useState<CollectedMonster[]>([]);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Initialize or restore the drawing canvas whenever it is mounted.
  useEffect(() => {
    if (inputMode !== 'drawing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const currentState = canvasHistory[historyIndex];
    if (currentState) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = currentState;
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL();
    setCanvasHistory([dataUrl]);
    setHistoryIndex(0);
  }, [inputMode]);

  // Load collection from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('doodleverse_collection');
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (inputMode !== 'webcam') {
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setWebcamStatus('idle');
      return;
    }

    let cancelled = false;

    const startWebcam = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setWebcamStatus('error');
        setWebcamError('当前浏览器不支持摄像头访问。');
        return;
      }

      setWebcamStatus('starting');
      setWebcamError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1024 },
            height: { ideal: 1024 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setWebcamStatus('ready');
      } catch (error) {
        console.error(error);
        setWebcamStatus('error');
        setWebcamError('无法打开摄像头，请检查浏览器权限。');
      }
    };

    startWebcam();

    return () => {
      cancelled = true;
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [inputMode]);

  // Play generated cloud TTS audio. Falls back to Web Speech for older saved cards.
  const speakText = (text: string, voiceProfile: string, audioUrl?: string) => {
    if (audioUrl && audioUrl !== "mock") {
      const audio = new Audio(audioUrl);
      setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audio.play().catch(() => setIsSpeaking(false));
      return;
    }

    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';

    if (voiceProfile === 'gentle_sloth') {
      utterance.rate = 0.75;
      utterance.pitch = 0.8;
    } else if (voiceProfile === 'hyper_kid') {
      utterance.rate = 1.35;
      utterance.pitch = 1.25;
    } else if (voiceProfile === 'stubborn_goblin') {
      utterance.rate = 0.95;
      utterance.pitch = 0.6;
    } else if (voiceProfile === 'robotic_toy') {
      utterance.rate = 1.1;
      utterance.pitch = 1.6;
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // History Undo System
  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const nextHistory = canvasHistory.slice(0, historyIndex + 1);
    setCanvasHistory([...nextHistory, dataUrl]);
    setHistoryIndex(nextHistory.length);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = canvasHistory[historyIndex - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(historyIndex - 1);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveStateToHistory();
  };

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvas.getBoundingClientRect();
    const pointer = 'touches' in e ? e.touches[0] : e;
    return {
      x: (pointer.clientX - rect.left) * (canvas.width / rect.width),
      y: (pointer.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPoint(canvas, e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      // Prevents page bounce/scrolling while drawing
      if (e.cancelable) e.preventDefault();
    }
    const { x, y } = getCanvasPoint(canvas, e);

    ctx.lineTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? lineWidth * 2.5 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveStateToHistory();
    }
  };

  const captureWebcamFrame = () => {
    const video = videoRef.current;
    const captureCanvas = webcamCaptureCanvasRef.current;
    if (!video || !captureCanvas || video.readyState < 2) return '';

    const size = 1024;
    captureCanvas.width = size;
    captureCanvas.height = size;

    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return '';

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return '';

    const sourceSize = Math.min(sourceWidth, sourceHeight);
    const sourceX = (sourceWidth - sourceSize) / 2;
    const sourceY = (sourceHeight - sourceSize) / 2;

    ctx.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    const image = captureCanvas.toDataURL('image/png');
    setCapturedWebcamImage(image);
    return image;
  };

  // Pipeline Execution Trigger
  const handleAwaken = async () => {
    const canvas = canvasRef.current;
    if (inputMode === 'drawing' && !canvas) return;

    const sourceImageBase64 =
      inputMode === 'webcam'
        ? capturedWebcamImage || captureWebcamFrame()
        : canvas?.toDataURL('image/png') || '';

    if (!sourceImageBase64) {
      alert(inputMode === 'webcam' ? '请先允许摄像头并捕捉一张照片。' : '请先在画板上画点什么。');
      return;
    }
    
    setIsLoading(true);
    setCardFlipped(false);
    
    try {
      // Step 1: OpenAI Next Image Generation
      setLoadingStep(inputMode === 'webcam' ? '📷 正在读取镜头画面并重塑数字生命...' : '🌈 正在融合涂鸦并进行3D数字雕刻...');
      const imgRes = await imageGen.generateFromScribble(sourceImageBase64, selectedStyle, inputMode);
      
      // Step 2: Gemini VLM Analysis
      setLoadingStep('🧠 Gemini正在读取外形并塑造独特个性...');
      const vlmRes = await vlmAnalyzer.analyzeMonster(sourceImageBase64, imgRes.imageUrl, monsterName.trim());
      
      // Step 3: Speech audio synthetic (TTS)
      setLoadingStep('⚡ 注入声线，赋予生命之声...');
      const ttsRes = await ttsGen.generateSpeech(vlmRes.script, vlmRes.voiceProfile);

      const newMonster: CollectedMonster = {
        ...vlmRes,
        id: Math.random().toString(36).substring(2, 11),
        imageUrl: imgRes.imageUrl,
        audioUrl: ttsRes.audioUrl,
        style: selectedStyle,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      setCardMonster(newMonster);
      setIsLoading(false);
      
      // Flip the card and play voice after brief layout render
      setTimeout(() => {
        setCardFlipped(true);
        speakText(newMonster.script, newMonster.voiceProfile, newMonster.audioUrl);
      }, 300);

    } catch (e) {
      console.error(e);
      setIsLoading(false);
      alert('能量波动不稳定，召唤失败。请再试一次！');
    }
  };

  // Save card to library
  const saveToCollection = () => {
    if (!cardMonster) return;
    const isDup = collection.some(m => m.id === cardMonster.id);
    if (isDup) return;

    const nextCollection = [cardMonster, ...collection];
    setCollection(nextCollection);
    localStorage.setItem('doodleverse_collection', JSON.stringify(nextCollection));
  };

  // Select card from library to review
  const selectFromCollection = (monster: CollectedMonster) => {
    setCardMonster(monster);
    setCardFlipped(true);
    speakText(monster.script, monster.voiceProfile, monster.audioUrl);
  };

  // Clear all collected
  const clearCollection = () => {
    if (confirm('确定要清除收集箱里的所有怪兽吗？')) {
      setCollection([]);
      localStorage.removeItem('doodleverse_collection');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 max-w-6xl mx-auto">
      {/* HEADER */}
      <header className="text-center mb-10 mt-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-blue-400 title-font flex items-center justify-center gap-2 mb-2">
          👾 DoodleVerse 涂鸦宇宙
        </h1>
        <p className="text-sm md:text-base text-gray-400 font-light">
          将少儿涂鸦转化为 3D 黏土/毛绒数字生命的 AI 探索画板
        </p>
      </header>

      {/* WORKSPACE GRID */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        
        {/* LEFT PANEL: Canvas & Style Controls */}
        <section className="lg:col-span-7 glass-panel p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
              {inputMode === 'drawing' ? '🎨 简笔画画板' : '📷 摄像头捕捉'}
            </h2>
            {inputMode === 'drawing' && (
              <div className="flex gap-2">
              <button 
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="撤销"
              >
                <RotateCcw size={18} />
              </button>
              <button 
                onClick={clearCanvas}
                className="p-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/30 rounded-lg transition-colors"
                title="清除画板"
              >
                <Trash2 size={18} />
              </button>
            </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-950/50 p-1 border border-gray-800">
            <button
              onClick={() => setInputMode('drawing')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${inputMode === 'drawing' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
            >
              <Pencil size={16} />
              画板
            </button>
            <button
              onClick={() => setInputMode('webcam')}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${inputMode === 'webcam' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
            >
              <Camera size={16} />
              摄像头
            </button>
          </div>

          {inputMode === 'drawing' ? (
            <>
              {/* Draw Board Container */}
              <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-white rounded-2xl overflow-hidden border border-gray-800 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                />
              </div>

              {/* Color & Size Controls */}
              <div className="flex flex-wrap items-center gap-4 justify-between bg-gray-900/40 p-4 rounded-xl">
                {/* Color Palette */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-400">画笔颜色:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { hex: '#8b5cf6', label: '紫色' },
                      { hex: '#ec4899', label: '粉色' },
                      { hex: '#3b82f6', label: '蓝色' },
                      { hex: '#eab308', label: '黄色' },
                      { hex: '#22c55e', label: '绿色' },
                      { hex: '#ef4444', label: '红色' },
                      { hex: '#0f172a', label: '深黑' },
                    ].map(c => (
                      <button
                        key={c.hex}
                        onClick={() => {
                          setColor(c.hex);
                          setIsEraser(false);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c.hex && !isEraser ? 'scale-125 border-white shadow-lg' : 'border-transparent'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Brush Type Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEraser(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!isEraser ? 'bg-violet-600/30 text-violet-200 border-violet-500' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                  >
                    ✏️ 铅笔
                  </button>
                  <button
                    onClick={() => setIsEraser(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isEraser ? 'bg-violet-600/30 text-violet-200 border-violet-500' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                  >
                    🧽 橡皮擦
                  </button>
                </div>

                {/* Line Width Slider */}
                <div className="flex flex-col gap-2 min-w-[100px]">
                  <span className="text-xs text-gray-400">粗细: {lineWidth}px</span>
                  <input
                    type="range"
                    min="3"
                    max="24"
                    value={lineWidth}
                    onChange={e => setLineWidth(Number(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative w-full aspect-square max-w-[420px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border border-gray-800 shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  muted
                />
                {capturedWebcamImage && (
                  <img
                    src={capturedWebcamImage}
                    alt="Captured webcam frame"
                    className="absolute bottom-3 right-3 w-20 h-20 rounded-lg object-cover border border-white/20 shadow-lg"
                  />
                )}
                {webcamStatus !== 'ready' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-center px-6">
                    <Camera size={36} className="text-violet-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-200">
                      {webcamStatus === 'starting' ? '正在打开摄像头...' : webcamError || '等待摄像头权限'}
                    </p>
                  </div>
                )}
                <canvas ref={webcamCaptureCanvasRef} className="hidden" />
              </div>
              <button
                onClick={captureWebcamFrame}
                disabled={webcamStatus !== 'ready'}
                className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Aperture size={17} />
                {capturedWebcamImage ? '重新捕捉画面' : '捕捉当前画面'}
              </button>
            </div>
          )}

          {/* Child-Friendly Style Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-300">🪄 选择你期望的潮玩艺术风格:</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'claymation', name: '3D 黏土动画', icon: '🦖', desc: '手作质感，古朴软糯' },
                { id: 'woolfelt', name: '温暖羊毛毡', icon: '🐑', desc: '毛茸绒感，温暖治愈' },
                { id: 'crayon', name: '蜡笔绘本', icon: '🖍️', desc: '手绘色彩，缤纷童真' },
                { id: 'popmart', name: '潮玩盲盒', icon: '📦', desc: '树脂亮面，精致手办' }
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id as ArtStyle)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${selectedStyle === style.id ? 'bg-violet-600/20 border-violet-500 shadow-md shadow-violet-500/10' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}
                >
                  <span className="text-2xl mb-1">{style.icon}</span>
                  <span className="text-xs font-bold text-gray-200">{style.name}</span>
                  <span className="text-[10px] text-gray-500 mt-1">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name Prompt Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="monster-name" className="text-sm font-semibold text-gray-300">✍️ 悄悄赋予小生命一个名字或性格描述 (可选):</label>
            <input
              id="monster-name"
              type="text"
              placeholder="例如：呆呆小飞龙，喜欢吃甜食的调皮蛋..."
              value={monsterName}
              onChange={e => setMonsterName(e.target.value)}
              className="w-full bg-gray-900/60 border border-gray-800 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Trigger Awaken Action */}
          <button
            onClick={handleAwaken}
            disabled={isLoading}
            className="pulse-btn w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={20} />
            {isLoading ? '正在灌注魔法生命力...' : '唤醒数字生命 (AIGC)'}
          </button>
        </section>

        {/* RIGHT PANEL: Digital Hatchery / Holographic Card Deck */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center min-h-[500px]">
          
          {/* Deck Wrapper */}
          <div className="card-container">
            <div className={`card-inner ${cardFlipped && cardMonster ? 'flipped' : ''}`}>
              
              {/* CARD FRONT: Digital Egg Incubator */}
              <div className="card-front p-8 text-center glass-panel">
                {isLoading ? (
                  /* Hatching Shimmer Loading */
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                    <div className="relative w-40 h-40 rounded-full border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
                      <div className="w-32 h-32 rounded-full bg-violet-600/10 flex items-center justify-center animate-ping absolute" />
                      <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 opacity-60 filter blur-md absolute" />
                      <span className="text-5xl animate-bounce z-10">🥚</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-violet-300">孵化能量注入中...</h3>
                      <p className="text-xs text-gray-400 animate-pulse px-4">
                        {loadingStep}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Idle Incubator Deck */
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                    <div className="w-36 h-36 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center bg-gray-900/20 text-gray-600 hover:border-violet-500/40 hover:text-violet-500/40 transition-colors">
                      <Plus size={44} className="stroke-[1.5]" />
                    </div>
                    <div className="max-w-[240px]">
                      <h3 className="text-gray-300 font-bold mb-2">魔法孵化器空闲中</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        请在左侧的画板上随意涂抹，选择你喜欢的声音和艺术风格，点击“唤醒”来注入生命吧！
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD BACK: holographic monster display */}
              {cardMonster && (
                <div className="card-back border border-violet-500/30 shadow-2xl shadow-violet-500/10">
                  <div className="hologram-foil" />
                  
                  {/* Monster Card UI Frame */}
                  <div className="flex flex-col h-full z-10 relative justify-between">
                    
                    {/* Header: Name & Type badge */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-1.5">
                          {cardMonster.name}
                        </h3>
                        <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-950/40 border border-violet-900/30 px-2 py-0.5 rounded">
                          Style: {cardMonster.style}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-900/30 px-2 py-1 rounded-full">
                        {cardMonster.attributes.element}
                      </span>
                    </div>

                    {/* Image Area */}
                    <div className="relative w-full h-[180px] bg-slate-950 rounded-2xl overflow-hidden border border-gray-800 my-3 flex items-center justify-center shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={cardMonster.imageUrl} 
                        alt={cardMonster.name} 
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 border border-white/10 text-pink-300">
                        {cardMonster.personality}
                      </span>
                    </div>

                    {/* Attributes progress bars */}
                    <div className="bg-gray-900/60 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-semibold flex items-center text-red-400"><Heart size={11} className="mr-0.5" /> HP</span>
                        <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${cardMonster.attributes.hp}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] font-mono">{cardMonster.attributes.hp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-semibold flex items-center text-orange-400"><Award size={11} className="mr-0.5" /> ATK</span>
                        <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${cardMonster.attributes.atk}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] font-mono">{cardMonster.attributes.atk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-semibold flex items-center text-blue-400"><Shield size={11} className="mr-0.5" /> DEF</span>
                        <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${cardMonster.attributes.def}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] font-mono">{cardMonster.attributes.def}</span>
                      </div>
                    </div>

                    {/* Dialogue Text Balloon */}
                    <div className="relative bg-violet-600/10 border border-violet-900/30 p-2.5 rounded-xl mt-3 text-xs leading-relaxed text-violet-200">
                      <p className="italic">“{cardMonster.script}”</p>
                      {/* Triangle balloon anchor */}
                      <div className="absolute top-1/2 -left-2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-violet-900/30 border-b-[6px] border-b-transparent transform -translate-y-1/2" />
                    </div>

                    {/* Card Options: Save and Repeat TTS */}
                    <div className="flex justify-between gap-3 mt-4 pt-2 border-t border-gray-800/60">
                      <button
                        onClick={() => speakText(cardMonster.script, cardMonster.voiceProfile, cardMonster.audioUrl)}
                        className={`flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${isSpeaking ? 'ring-2 ring-violet-500' : ''}`}
                      >
                        <Volume2 size={13} className={isSpeaking ? 'animate-bounce' : ''} />
                        {isSpeaking ? '说话中...' : '声音朗读'}
                      </button>
                      <button
                        onClick={saveToCollection}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check size={13} />
                        加入收集箱
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

      </main>

      {/* BOTTOM PANEL: Collection Library Shelf */}
      <section className="w-full glass-panel p-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-6">
          <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
            🗃️ 数字盲盒收集箱 ({collection.length})
          </h2>
          {collection.length > 0 && (
            <button
              onClick={clearCollection}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
            >
              一键清除
            </button>
          )}
        </div>

        {collection.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            目前收集箱还是空的哦。赶紧去“唤醒”几个自己亲手捏的小怪兽吧！
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {collection.map(monster => (
              <div
                key={monster.id}
                onClick={() => selectFromCollection(monster)}
                className="bg-gray-900/40 border border-gray-800 hover:border-violet-500/40 p-3 rounded-2xl cursor-pointer hover-glow flex flex-col gap-2 text-left"
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-950 relative border border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={monster.imageUrl} 
                    alt={monster.name}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 border border-white/10 text-[9px] px-1 rounded font-bold text-violet-300">
                    {monster.style}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-200 truncate">{monster.name}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-gray-500">{monster.timestamp}</span>
                    <span className="text-[10px] text-yellow-400 font-bold bg-yellow-950/20 px-1.5 py-0.5 rounded">
                      {monster.attributes.element}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
