// Thin wrapper over the Gemini Live WebSocket session for the browser.
// Gets a single-use token from our server, connects directly to Gemini, and
// turns raw server messages into simple events for the UI.

export class LiveSessionError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export async function openLiveSession({ language = 'auto', on }) {
  const res = await fetch('/api/voice/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new LiveSessionError(data.error || `Voice token failed (${res.status})`, data.code || 'TOKEN_FAILED');
  }

  // Loaded on demand so the dashboard's first paint doesn't pay for the SDK.
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: data.token, httpOptions: { apiVersion: 'v1beta' } });

  let userText = '';
  let agentText = '';
  let closedByUs = false;

  const session = await ai.live.connect({
    model: data.model,
    config: data.config,
    callbacks: {
      onopen: () => on.open?.(),
      onerror: (e) => on.error?.(new LiveSessionError(e?.message || 'Voice connection error', 'SOCKET')),
      onclose: (e) => on.close?.({ byUs: closedByUs, reason: e?.reason || '' }),
      onmessage: (msg) => {
        if (msg.toolCall?.functionCalls?.length) {
          on.toolCalls?.(msg.toolCall.functionCalls);
        }
        if (msg.goAway) on.goAway?.(msg.goAway);

        const sc = msg.serverContent;
        if (!sc) return;
        if (sc.interrupted) on.interrupted?.();

        if (sc.inputTranscription?.text) {
          userText += sc.inputTranscription.text;
          on.userTranscript?.(userText.trim(), false);
        }
        for (const part of sc.modelTurn?.parts || []) {
          if (part.inlineData?.data && (part.inlineData.mimeType || '').startsWith('audio/')) {
            on.audio?.(part.inlineData.data, part.inlineData.mimeType);
          }
        }
        if (sc.outputTranscription?.text) {
          if (userText) {
            on.userTranscript?.(userText.trim(), true);
            userText = '';
          }
          agentText += sc.outputTranscription.text;
          on.agentTranscript?.(agentText.trim(), false);
        }
        if (sc.turnComplete || sc.interrupted) {
          if (userText) on.userTranscript?.(userText.trim(), true);
          if (agentText) on.agentTranscript?.(agentText.trim(), true);
          userText = '';
          agentText = '';
          if (sc.turnComplete) on.turnComplete?.();
        }
      },
    },
  });

  return {
    model: data.model,
    sendAudio(base64) {
      session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
    },
    sendText(text) {
      session.sendRealtimeInput({ text });
    },
    sendToolResponses(functionResponses) {
      session.sendToolResponse({ functionResponses });
    },
    close() {
      closedByUs = true;
      try { session.close(); } catch { /* already closed */ }
    },
  };
}
