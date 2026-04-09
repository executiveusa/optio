/**
 * VoiceContext — Whisper STT + ElevenLabs TTS for Metamorfosis
 * ──────────────────────────────────────────────────────────────
 * Speech-to-text: OpenAI Whisper API (via synthia-gateway)
 * Text-to-speech: ElevenLabs (direct, or fallback to Web Speech API)
 *
 * All audio is processed client-side for permission flow.
 * Transcription requests go through the Synthia Gateway to avoid
 * exposing API keys in the browser.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceContextValue {
  state: VoiceState;
  /** Start recording. Returns transcript when done. */
  startListening: (lang?: string) => Promise<string>;
  /** Stop recording early. */
  stopListening: () => void;
  /** Speak text using ElevenLabs or Web Speech API fallback. */
  speak: (text: string, lang?: string) => Promise<void>;
  /** Cancel any ongoing speech. */
  cancelSpeech: () => void;
  /** Whether TTS is currently playing. */
  isSpeaking: boolean;
  /** Last transcription error (if any). */
  error: string | null;
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const VoiceContext = createContext<VoiceContextValue | null>(null);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL ?? 'http://localhost:3000';
const GATEWAY_KEY = (import.meta as any).env?.VITE_GATEWAY_KEY ?? '';
const ELEVENLABS_KEY = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY ?? '';
const ELEVENLABS_VOICE_ID =
  (import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID ?? 'pFZP5JQG7iQjIQuC4Pzg'; // Default Spanish female voice

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VoiceState>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ─── SPEECH-TO-TEXT (Whisper via Gateway) ─────────────────────────────────

  const startListening = useCallback(
    async (lang = 'es'): Promise<string> => {
      setError(null);

      // Request microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Fallback to Web Speech API if mic permissions denied
        return new Promise((resolve, reject) => {
          const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (!SpeechRecognition) {
            const msg = 'Voice input not supported on this browser.';
            setError(msg);
            setState('error');
            reject(new Error(msg));
            return;
          }
          const rec = new SpeechRecognition();
          rec.lang = lang === 'es' ? 'es-MX' : 'en-US';
          rec.interimResults = false;
          rec.maxAlternatives = 1;
          setState('listening');
          rec.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript as string;
            setState('idle');
            resolve(transcript);
          };
          rec.onerror = () => {
            setState('error');
            setError('No se pudo escuchar. Intenta de nuevo.');
            reject(new Error('Speech recognition error'));
          };
          rec.onend = () => setState('idle');
          rec.start();
        });
      }

      // Use MediaRecorder + Whisper
      return new Promise((resolve, reject) => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        setState('listening');

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setState('processing');

          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          try {
            const transcript = await transcribeWithWhisper(audioBlob, lang);
            setState('idle');
            resolve(transcript);
          } catch (err) {
            const msg = (err as Error).message;
            setError(msg);
            setState('error');
            reject(err);
          }
        };

        recorder.start();

        // Auto-stop after 60 seconds as safety limit
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 60_000);
      });
    },
    [],
  );

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ─── TEXT-TO-SPEECH (ElevenLabs or Web Speech) ────────────────────────────

  const speak = useCallback(async (text: string, lang = 'es') => {
    cancelSpeechInternal();

    // Prefer ElevenLabs if key is available
    if (ELEVENLABS_KEY) {
      setIsSpeaking(true);
      setState('speaking');
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': ELEVENLABS_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          },
        );
        if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          setState('idle');
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setState('idle');
        };
        await audio.play();
      } catch (err) {
        setIsSpeaking(false);
        setState('idle');
        // Silently fall back to Web Speech API on error
        speakWithWebSpeech(text, lang);
      }
      return;
    }

    // Fallback: Web Speech API
    speakWithWebSpeech(text, lang);
  }, []);

  const cancelSpeechInternal = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (utteranceRef.current) {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }
    setIsSpeaking(false);
    setState('idle');
  };

  const cancelSpeech = useCallback(cancelSpeechInternal, []);

  return (
    <VoiceContext.Provider
      value={{ state, startListening, stopListening, speak, cancelSpeech, isSpeaking, error }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used inside <VoiceProvider>');
  return ctx;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function transcribeWithWhisper(audioBlob: Blob, lang: string): Promise<string> {
  const form = new FormData();
  form.append('file', audioBlob, 'voice.webm');
  form.append('model', 'whisper-1');
  form.append('language', lang === 'es' ? 'es' : 'en');
  form.append('response_format', 'json');

  const headers: HeadersInit = {};
  if (GATEWAY_KEY) headers['Authorization'] = `Bearer ${GATEWAY_KEY}`;

  const res = await fetch(`${GATEWAY_URL}/v1/audio/transcriptions`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper transcription failed: ${res.status} — ${text}`);
  }

  const data = await res.json();
  return (data.text as string)?.trim() ?? '';
}

function speakWithWebSpeech(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === 'es' ? 'es-MX' : 'en-US';
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}
