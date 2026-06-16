const BASE_URL = "https://api.elevenlabs.io/v1";

export const DEFAULT_VOICES = {
  male: "pNInz6obpgDQGcFmaJgB", // Adam
  female: "21m00Tcm4TlvDq8ikWAM", // Rachel
} as const;

export type VoiceKey = keyof typeof DEFAULT_VOICES;

function getKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY가 설정되지 않았습니다.");
  return key;
}

export async function textToSpeech(
  text: string,
  voice: VoiceKey | string = "male"
): Promise<ArrayBuffer> {
  const voiceId =
    voice in DEFAULT_VOICES ? DEFAULT_VOICES[voice as VoiceKey] : voice;

  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": getKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS 실패: ${res.status} ${await res.text()}`);
  }
  return res.arrayBuffer();
}

export async function speechToText(
  audio: Blob,
  filename = "audio.webm"
): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", audio, filename);

  const res = await fetch(`${BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": getKey() },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs STT 실패: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
