# Vaani voice agent

Vaani lets a shopkeeper run the dashboard by voice or typing in Hindi, Kannada,
English or any mix. It searches, adds, edits and deletes products, restocks,
filters the screen, gives data-backed suggestions, and adapts to the user's mood.

## Turn it on

1. Get a free Gemini API key at https://aistudio.google.com/apikey.
2. Add `GEMINI_API_KEY` in Vercel (Settings > Environment Variables), then redeploy.
   Locally: copy `.env.example` to `.env.local`.
3. Open the dashboard, tap the blue mic (or press Alt+V), allow the microphone.

Without a key, the mic still works in **offline mode**: the browser's own speech
recognition (Chrome/Edge) plus built-in commands, at zero cost.

## How it works

```
Browser mic ──16 kHz PCM──▶ Gemini Live (native audio, WebSocket)
     ▲                            │ speech + tool calls
     │ 24 kHz audio               ▼
Speaker ◀──────────────── VoiceAgent ──▶ executor ──▶ ProductContext ──▶ /api/products
                                           │
                                  page UI (filters, highlight, dialogs)
```

- `POST /api/voice/token` mints a single-use, 30-minute token. The API key never
  reaches the browser. The persona, tools and model are locked into the token.
- The browser connects straight to Gemini, so there is no audio relay through
  Vercel (Vercel functions can't hold long WebSockets).
- Tools run in the browser through `ProductContext`, the same path as the buttons,
  so voice and manual edits always agree.

| File | Job |
|---|---|
| `lib/voice/tools.js` | Tool declarations and risk levels |
| `lib/voice/systemPrompt.js` | Persona, language and safety rules |
| `lib/voice/executor.js` | Runs tools, validates, undo stack, confirmations |
| `lib/voice/catalog.js` | Multilingual product matcher, stats, suggestions |
| `lib/voice/language.js` | Script detection, spoken numbers (hi/kn/en) |
| `lib/voice/emotion.js` | Mood tracker that steers reply style |
| `lib/voice/fallbackParser.js` | Offline commands and replies |
| `lib/voice/browser/*` | Mic capture, playback, Live session |
| `components/voice/*` | Panel, confirm sheet |

## Safety rules built in

- Single-product changes are read back aloud before they happen, and every change
  shows an Undo toast. Saying "undo" works too.
- Changes to several products, and every delete, open an on-screen list that
  must be tapped. Voice cannot confirm them.
- The agent has no payment or money tool at all.
- Every number the agent says comes from a tool result.

## Mood

Gemini 3.8 Live removed its built-in "affective dialog" switch, so Vaani adds its
own: the model hears tone and reports mood through `report_user_state`, and the
app tracks repeats, self-corrections ("nahi nahi", "illa"), undos, cancels and
frustration words. The result is one guidance line attached to tool results
(e.g. "be brief, apologise once"). The mood is never said aloud. In dev builds the
panel footer shows the estimate.

## Free-tier limits

- Gemini's free tier is rate-limited, and Google may use free-tier data to
  improve its products. Use test data; for real shops use the paid tier.
- Vercel Hobby is for non-commercial use.
- Data still lives in the demo store (in-memory per server + browser storage).
  Next step: move it to a real database (see `VAANI_AGENT_PROMPT.md`, Phase 0).

## Reusing it in the official app

`lib/voice/*` has no Next.js or React imports. To reuse it, give `createExecutor`
a different `ctx` (your app's data and actions) and keep the token route, tools
and system prompt. Add the spec's merchant and customer tools to `tools.js` and
`executor.js` in the same pattern.

## Try saying

- "Kitne products low stock mein hain?"
- "Rice ka stock 20 kar do" → "haan"
- "ಹಾಲು ಎಷ್ಟು ಸ್ಟಾಕ್ ಇದೆ?"
- "Out of stock wale sab delete kar do" (opens confirmation)
- "Kuch suggest karo" / "What should I restock first?"
- "Undo"
