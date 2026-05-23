import { NextResponse } from "next/server";
import type { ArtStyle, ImageSourceType } from "../../../interfaces/api";

const OPENAI_NEXT_BASE_URL = "https://api.openai-next.com";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const stylePromptMap: Record<ArtStyle, string> = {
  claymation:
    "Render it as a cute 3D claymation monster toy with soft studio lighting, tactile handmade clay texture, a clean solid background, and charming collectible-toy proportions.",
  woolfelt:
    "Render it as a handmade wool felt plush monster with fuzzy needle-felt texture, cozy soft fibers, a clean solid background, and a warm collectible-toy look.",
  crayon:
    "Render it as a polished children's storybook monster illustration with colorful crayon and pencil texture, clear shapes, a clean white background, and expressive friendly details.",
  popmart:
    "Render it as a cute Pop Mart style vinyl designer toy monster with smooth glossy material, collectible blind-box proportions, soft studio lighting, and a clean solid background.",
};

type ImageRequestBody = {
  scribbleBase64?: string;
  style?: ArtStyle;
  sourceType?: ImageSourceType;
};

function buildPrompt(style: ArtStyle, sourceType: ImageSourceType) {
  const sourcePrompt =
    sourceType === "webcam"
      ? "Use this webcam photo as the visual reference for a playful digital creature. Preserve the visible subject, pose, color cues, and personality, but simplify distracting real-world background details."
      : "Use this childlike doodle as the visual reference for a playful digital creature. Preserve the main silhouette, eyes, limbs, colors, and hand-drawn personality from the sketch.";

  return `${sourcePrompt} ${stylePromptMap[style] || stylePromptMap.claymation}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API_KEY in server environment." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ImageRequestBody;
  const style = body.style || "claymation";
  const sourceType = body.sourceType || "drawing";

  if (!body.scribbleBase64?.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "scribbleBase64 must be an image data URI." },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${OPENAI_NEXT_BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: buildPrompt(style, sourceType),
      image: [body.scribbleBase64],
      n: 1,
      size: "1024x1024",
    }),
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(
      { error: data?.error?.message || data?.message || "Image generation failed." },
      { status: upstream.status },
    );
  }

  const imageUrl = data?.data?.[0]?.url;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Image generation response did not include a URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({ imageUrl });
}
