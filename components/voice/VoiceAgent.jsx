'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square, Send, X, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProductContext } from '@/context/ProductContext';
import { createExecutor } from '@/lib/voice/executor';
import { EmotionTracker } from '@/lib/voice/emotion';
import { runFallback } from '@/lib/voice/fallbackParser';
import { detectLanguage, SPEECH_LOCALES } from '@/lib/voice/language';
import ConfirmSheet from './ConfirmSheet';

const LANGS = [
  { id: 'auto', label: 'Auto' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'kn', label: 'ಕನ್ನಡ' },
  { id: 'en', label: 'English' },
];

const TOOL_LABELS = {
  search_products: 'Searching products',
  get_product: 'Reading product',
  get_inventory_summary: 'Checking inventory',
  suggest_actions: 'Looking for suggestions',
  get_screen_state: 'Reading the screen',
  show_on_screen: 'Updating the view',
  open_product: 'Opening product',
  update_product: 'Updating product',
  adjust_stock: 'Updating stock',
  add_product: 'Adding product',
  bulk_adjust_stock: 'Preparing stock change',
  delete_products: 'Preparing delete',
  undo_last_action: 'Undoing',
};

const EXAMPLES = [
  'Kitne products low stock mein hain?',
  'ಕಡಿಮೆ ಸ್ಟಾಕ್ ಇರೋದು ತೋರಿಸು',
  'Rice ka stock 20 kar do',
  'What should I restock first?',
];

const STATUS_TEXT = {
  idle: 'Tap the mic to talk',
  connecting: 'Connecting…',
  listening: 'Listening',
  speaking: 'Speaking',
  offline: 'Offline voice mode',
  'offline-listening': 'Listening (offline mode)',
  typing: 'Connected · tap the mic to talk',
};

const CONSENT_KEY = 'vaani_consent_v1';
const SHOW_DEBUG = process.env.NODE_ENV !== 'production';

function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

let msgSeq = 0;

export default function VoiceAgent({ uiRef, categories = [], raised = false }) {
  const { allProducts, products, updateProduct, addProduct, deleteProduct, restoreProduct } = useProductContext();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [mode, setMode] = useState(null); // 'live' | 'offline' | null
  const [lang, setLang] = useState('auto');
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState(null);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [pending, setPending] = useState(null);
  const [showConsent, setShowConsent] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mood, setMood] = useState(null);
  const [draft, setDraft] = useState('');

  const dataRef = useRef({});
  const sessionRef = useRef(null);
  const micRef = useRef(null);
  const playerRef = useRef(null);
  const recRef = useRef(null);
  const emotionRef = useRef(null);
  const executorRef = useRef(null);
  const modeRef = useRef(null);
  const langRef = useRef('auto');
  const levelAtRef = useRef(0);
  const listRef = useRef(null);

  // Latest data and actions for the executor (read at call time, not render time).
  useEffect(() => {
    dataRef.current = {
      products: allProducts && allProducts.length ? allProducts : products,
      categories,
      actions: { updateProduct, addProduct, deleteProduct, restoreProduct },
    };
    modeRef.current = mode;
    langRef.current = lang;
  });

  // ---------- message helpers ----------
  const upsert = useCallback((role, text, final = true) => {
    if (!text) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.partial) {
        const next = prev.slice(0, -1);
        next.push({ ...last, text, partial: !final });
        return next;
      }
      msgSeq += 1;
      return [...prev, { id: msgSeq, role, text, partial: !final }].slice(-40);
    });
  }, []);

  const speakOffline = useCallback((text, l) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LOCALES[l] || 'en-IN';
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === u.lang)
      || window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith(u.lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }, []);

  // Tell the model about something that happened on screen.
  const notifyEvent = useCallback((text, spokenFallback) => {
    if (modeRef.current === 'live' && sessionRef.current) {
      sessionRef.current.sendText(`(event: ${text})`);
    } else if (spokenFallback) {
      upsert('agent', spokenFallback, true);
      speakOffline(spokenFallback, langRef.current === 'auto' ? 'en' : langRef.current);
    }
    if (SHOW_DEBUG) upsert('event', text, true);
  }, [speakOffline, upsert]);

  // ---------- executor (created once) ----------
  useEffect(() => {
    emotionRef.current = new EmotionTracker();
    executorRef.current = createExecutor({
      getProducts: () => dataRef.current.products || [],
      getCategories: () => dataRef.current.categories || [],
      actions: {
        update: (id, data) => dataRef.current.actions.updateProduct(id, data, { silent: true }),
        add: (data) => dataRef.current.actions.addProduct(data, { silent: true }),
        remove: (id) => dataRef.current.actions.deleteProduct(id, { silent: true }),
        restore: (p) => dataRef.current.actions.restoreProduct(p),
      },
      ui: {
        showIds: (ids, label) => uiRef.current?.showIds(ids, label),
        setStockFilter: (k) => uiRef.current?.setStockFilter(k),
        setCategory: (c) => uiRef.current?.setCategory(c),
        setSort: (s) => uiRef.current?.setSort(s),
        setView: (v) => uiRef.current?.setView(v),
        goToPage: (n) => uiRef.current?.goToPage(n),
        clearFilters: () => uiRef.current?.clearFilters(),
        openProduct: (p, m) => uiRef.current?.openProduct(p, m),
        highlight: (ids) => uiRef.current?.highlight(ids),
        getScreenState: () => uiRef.current?.getScreenState() || {},
      },
      requestConfirmation: (req) => {
        setPending(req);
        setOpen(true);
      },
      emotion: emotionRef.current,
      onChange: ({ label }) => {
        if (label.startsWith('Undid')) {
          toast.success(label);
          return;
        }
        toast(
          (t) => (
            <span className="flex items-center gap-3 text-sm">
              <span>{label}</span>
              <button
                type="button"
                className="font-semibold text-blue-600 hover:text-blue-800"
                onClick={async () => {
                  toast.dismiss(t.id);
                  const r = await executorRef.current.undo();
                  if (r.ok) notifyEvent(`user tapped Undo on screen; undone: ${r.undone}`, null);
                }}
              >
                Undo
              </button>
            </span>
          ),
          { duration: 8000 }
        );
      },
    });
  }, [notifyEvent, uiRef]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, activity]);

  // ---------- teardown ----------
  const stopAll = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    try { recRef.current?.abort(); } catch { /* ignore */ }
    recRef.current = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setStatus((s) => (modeRef.current === 'offline' ? 'offline' : s === 'offline-listening' ? 'offline' : 'idle'));
    setLevel(0);
    setActivity(null);
    setMuted(false);
  }, []);

  useEffect(() => () => {
    micRef.current?.stop();
    sessionRef.current?.close();
    playerRef.current?.close();
  }, []);

  // ---------- tool calls from the live model ----------
  const handleToolCalls = useCallback(async (calls) => {
    const responses = [];
    for (const fc of calls) {
      setActivity(TOOL_LABELS[fc.name] || null);
      const result = await executorRef.current.execute(fc.name, fc.args || {});
      responses.push({ id: fc.id, name: fc.name, response: result });
    }
    setActivity(null);
    setMood(emotionRef.current.snapshot());
    sessionRef.current?.sendToolResponses(responses);
  }, []);

  // ---------- offline mode (browser speech, no API key needed) ----------
  const handleOfflineUtterance = useCallback(async (text) => {
    emotionRef.current.onUserUtterance(text);
    setActivity('Working');
    const reply = await runFallback(text, executorRef.current, langRef.current);
    setActivity(null);
    upsert('agent', reply, true);
    setMood(emotionRef.current.snapshot());
    speakOffline(reply, langRef.current !== 'auto' ? langRef.current : detectLanguage(text));
  }, [speakOffline, upsert]);

  const listenOffline = useCallback(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setNotice((n) => `${n ? `${n} ` : ''}This browser has no speech recognition; type your command instead.`);
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new SR();
    rec.lang = SPEECH_LOCALES[langRef.current === 'auto' ? 'hi' : langRef.current];
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = '';
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      upsert('user', text.trim(), final);
      if (final) handleOfflineUtterance(text.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setNotice('Microphone is blocked. Allow it in the browser address bar, or type below.');
    };
    rec.onend = () => {
      recRef.current = null;
      setStatus('offline');
    };
    recRef.current = rec;
    setStatus('offline-listening');
    rec.start();
  }, [handleOfflineUtterance, upsert]);

  // ---------- live mode ----------
  const startLive = useCallback(async ({ withMic = true, firstText = null } = {}) => {
    setNotice(null);
    setStatus('connecting');
    setMode('live');
    modeRef.current = 'live';

    const { MicCapture, PcmPlayer } = await import('@/lib/voice/browser/audio');
    const player = new PcmPlayer({
      onPlayingChange: (playing) => setStatus((s) => (playing ? 'speaking' : s === 'speaking' ? 'listening' : s)),
    });
    player.ensure();
    playerRef.current = player;

    const mic = new MicCapture({
      onChunk: (b64) => sessionRef.current?.sendAudio(b64),
      onLevel: (v) => {
        const now = performance.now();
        if (now - levelAtRef.current > 90) {
          levelAtRef.current = now;
          setLevel(v);
        }
      },
    });
    try {
      if (withMic) await mic.start();
    } catch {
      player.close();
      playerRef.current = null;
      setStatus('idle');
      setMode(null);
      setNotice('Microphone is blocked. Allow it in the browser address bar, or type below.');
      return;
    }
    if (withMic) micRef.current = mic;

    try {
      const { openLiveSession } = await import('@/lib/voice/browser/liveSession');
      const session = await openLiveSession({
        language: langRef.current,
        on: {
          userTranscript: (text, final) => {
            upsert('user', text, final);
            if (final) {
              emotionRef.current.onUserUtterance(text);
              setMood(emotionRef.current.snapshot());
            }
          },
          agentTranscript: (text, final) => upsert('agent', text, final),
          audio: (b64, mime) => playerRef.current?.enqueue(b64, mime),
          interrupted: () => {
            playerRef.current?.flush();
            emotionRef.current.onBargeIn();
          },
          toolCalls: (calls) => handleToolCalls(calls),
          goAway: () => setNotice('This voice session will end soon. Tap the mic again to continue.'),
          error: (e) => setNotice(e.message),
          close: ({ byUs }) => {
            if (!byUs) {
              setNotice('Voice session ended. Tap the mic to talk again.');
              micRef.current?.stop();
              micRef.current = null;
              sessionRef.current = null;
              playerRef.current?.close();
              playerRef.current = null;
              setStatus('idle');
              setLevel(0);
            }
          },
        },
      });
      sessionRef.current = session;
      setStatus(withMic ? 'listening' : 'typing');
      session.sendText(firstText || '(event: session started; greet the user in one short line)');
    } catch (err) {
      mic.stop();
      micRef.current = null;
      player.close();
      playerRef.current = null;
      // No key, quota hit, or Gemini unreachable: keep working offline.
      setMode('offline');
      modeRef.current = 'offline';
      setStatus('offline');
      setNotice(`${err.message} Basic commands still work by voice or typing.`);
      if (firstText) handleOfflineUtterance(firstText);
      else if (withMic) listenOffline();
    }
  }, [handleOfflineUtterance, handleToolCalls, listenOffline, upsert]);

  // ---------- user actions ----------
  const onMicClick = useCallback(() => {
    if (!hasConsent()) {
      setOpen(true);
      setShowConsent(true);
      return;
    }
    setOpen(true);
    if (status === 'listening' || status === 'speaking' || status === 'connecting') {
      stopAll();
      return;
    }
    if (status === 'typing') {
      // Text session is open: close it and reopen with the microphone.
      stopAll();
      startLive();
      return;
    }
    if (status === 'offline-listening') {
      try { recRef.current?.stop(); } catch { /* ignore */ }
      return;
    }
    if (mode === 'offline') {
      listenOffline();
      return;
    }
    startLive();
  }, [listenOffline, mode, startLive, status, stopAll]);

  const acceptConsent = () => {
    try { localStorage.setItem(CONSENT_KEY, 'yes'); } catch { /* private mode */ }
    setShowConsent(false);
    startLive();
  };

  const sendTyped = (text) => {
    const t = text.trim();
    if (!t) return;
    setDraft('');
    upsert('user', t, true);
    if (mode === 'live' && sessionRef.current) {
      emotionRef.current.onUserUtterance(t);
      setMood(emotionRef.current.snapshot());
      sessionRef.current.sendText(t);
    } else if (mode !== 'offline' && status === 'idle' && hasConsent()) {
      emotionRef.current.onUserUtterance(t);
      // Typed first: open a Live session without the mic, spoken replies still play.
      startLive({ withMic: false, firstText: t });
    } else {
      handleOfflineUtterance(t);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    micRef.current?.setMuted(next);
  };

  const confirmPending = async () => {
    const req = pending;
    const summary = await req.run();
    setPending(null);
    notifyEvent(`user tapped ${req.confirmLabel} on screen; ${summary}`, summary);
  };

  const cancelPending = () => {
    emotionRef.current.onCancel();
    setPending(null);
    notifyEvent('user cancelled the on-screen confirmation; nothing changed', 'Cancelled. Nothing changed.');
  };

  // Alt+V opens the panel and toggles the mic.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        onMicClick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onMicClick]);

  const active = status === 'listening' || status === 'speaking' || status === 'offline-listening';
  const ringScale = 1 + Math.min(0.35, level * 0.6);

  return (
    <>
      {open && (
        <section
          aria-label="Vaani voice assistant"
          className={`fixed z-50 right-3 left-3 sm:left-auto sm:right-6 sm:w-[400px] ${
            raised ? 'bottom-40 sm:bottom-28' : 'bottom-24'
          } bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[min(70vh,600px)]`}
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                Vaani
                {mode === 'offline' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    offline
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 truncate" aria-live="polite">
                {activity ? `${activity}…` : STATUS_TEXT[status]}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div role="radiogroup" aria-label="Reply language" className="inline-flex p-0.5 bg-gray-100 rounded-lg">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={lang === l.id}
                    disabled={mode === 'live' && status !== 'idle'}
                    onClick={() => setLang(l.id)}
                    title={mode === 'live' && status !== 'idle' ? 'Stop the session to change language' : undefined}
                    className={`px-2 py-1 text-[11px] rounded-md transition-colors disabled:cursor-not-allowed ${
                      lang === l.id ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close voice panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {notice && (
            <div className="mx-3 mt-3 px-3 py-2 text-xs rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex justify-between gap-2">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="shrink-0 text-amber-600 hover:text-amber-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {showConsent ? (
            <div className="p-4 text-sm text-gray-700 space-y-3">
              <p className="font-medium text-gray-900">Before you start</p>
              <p>
                Vaani listens only while the mic is on. Your voice goes to Google Gemini to understand you; this app does not save
                recordings.
              </p>
              <p className="text-gray-500">
                On Gemini&apos;s free tier, Google may use the audio to improve its products, so use test data here. Changes that
                affect many products, and every delete, always ask you to tap to confirm.
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowConsent(false)} className="px-3 py-1.5 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200">
                  Not now
                </button>
                <button type="button" onClick={acceptConsent} className="px-3 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                  Allow and start
                </button>
              </div>
            </div>
          ) : (
            <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[160px]" aria-live="polite">
              {messages.length === 0 && (
                <div className="text-sm text-gray-500 px-1">
                  <p className="mb-2">Ask in Hindi, Kannada or English. Try:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => sendTyped(ex)}
                        className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) =>
                m.role === 'event' ? (
                  <p key={m.id} className="text-[11px] text-center text-gray-400">{m.text}</p>
                ) : (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      } ${m.partial ? 'opacity-70' : ''}`}
                    >
                      {m.text}
                    </p>
                  </div>
                )
              )}
              {activity && (
                <p className="flex items-center gap-1.5 text-xs text-blue-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {activity}…
                </p>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 p-3 flex items-center gap-2">
            {mode === 'live' && (status === 'listening' || status === 'speaking') && (
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                className={`p-2 rounded-lg border ${muted ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-200 text-gray-500 hover:text-gray-800'}`}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <form
              className="flex-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendTyped(draft);
              }}
            >
              <label htmlFor="vaani-input" className="sr-only">Type a command</label>
              <input
                id="vaani-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type or speak…"
                autoComplete="off"
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="p-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
          {SHOW_DEBUG && mood && (
            <p className="px-3 pb-2 text-[10px] text-gray-400">
              debug · mood {mood.state} · frustration {mood.frustration}
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={onMicClick}
        aria-label={active ? 'Stop voice assistant' : 'Talk to Vaani voice assistant'}
        title={active ? 'Stop (Alt+V)' : 'Talk to Vaani (Alt+V)'}
        className={`fixed z-50 right-4 sm:right-6 ${raised ? 'bottom-24 sm:bottom-6' : 'bottom-6'} h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
          active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-rose-400/40 motion-safe:transition-transform"
            style={{ transform: `scale(${ringScale})` }}
          />
        )}
        <span className="relative">
          {status === 'connecting' ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : active ? (
            <Square className="h-5 w-5 fill-current" />
          ) : mode === 'offline' ? (
            <Mic className="h-6 w-6" />
          ) : (
            <span className="flex items-center">
              <Mic className="h-6 w-6" />
              <Sparkles className="h-3 w-3 -ml-1 -mt-4" aria-hidden="true" />
            </span>
          )}
        </span>
      </button>

      {pending && <ConfirmSheet request={pending} onConfirm={confirmPending} onCancel={cancelPending} />}
    </>
  );
}
