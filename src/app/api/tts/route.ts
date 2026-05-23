import { NextResponse } from "next/server";

const OPENAI_NEXT_BASE_URL = "https://api.openai-next.com";

type TTSRequestBody = {
  text?: string;
  voiceProfile?: string;
};

const profileConfig: Record<string, { temperature: number; top_p: number }> = {
  gentle_sloth: { temperature: 0.45, top_p: 0.55 },
  hyper_kid: { temperature: 0.9, top_p: 0.85 },
  stubborn_goblin: { temperature: 0.75, top_p: 0.7 },
  robotic_toy: { temperature: 0.55, top_p: 0.6 },
};

export async function POST(request: Request) {
  const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API_KEY in server environment." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as TTSRequestBody;
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "text is required." },
      { status: 400 },
    );
  }

  const config = profileConfig[body.voiceProfile || ""] || {
    temperature: 0.7,
    top_p: 0.7,
  };

  const upstream = await fetch(`${OPENAI_NEXT_BASE_URL}/fish/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: "speech-1.5",
    },
    body: JSON.stringify({
      text,
      temperature: config.temperature,
      top_p: config.top_p,
      chunk_length: 200,
      normalize: true,
      format: "mp3",
      mp3_bitrate: 128,
      latency: "normal",
    }),
  });

  const contentType = upstream.headers.get("content-type") || "";
  const buffer = Buffer.from(await upstream.arrayBuffer());

  if (!upstream.ok) {
    let message = "TTS generation failed.";

    if (contentType.includes("application/json")) {
      try {
        const error = JSON.parse(buffer.toString("utf8"));
        message = error?.error?.message || error?.message || message;
      } catch {
        message = buffer.toString("utf8") || message;
      }
    }

    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  if (!contentType.includes("audio/")) {
    return NextResponse.json(
      { error: "TTS response was not audio." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    audioUrl: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
  });
}
