// Gemini Live session config, built on the server and locked into the token.
import { FUNCTION_DECLARATIONS } from './tools.js';
import { buildSystemInstruction } from './systemPrompt.js';

export function buildLiveConfig(language = 'auto', env = process.env) {
  const config = {
    responseModalities: ['AUDIO'],
    systemInstruction: buildSystemInstruction({
      storeName: env.VOICE_STORE_NAME || 'DukaanSe',
      currency: env.VOICE_CURRENCY || '$',
      language,
    }),
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  if (env.GEMINI_LIVE_VOICE) {
    config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_LIVE_VOICE } } };
  }
  return config;
}
