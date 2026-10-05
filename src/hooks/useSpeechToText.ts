import { useEffect, useRef, useState } from 'react';

const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const speechSupported = Boolean(SpeechRecognitionImpl);

export function useSpeechToText({ onFinalText, onEnd }: { onFinalText: (text: string) => void; onEnd?: () => void }) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const callbacksRef = useRef({ onFinalText, onEnd });
  callbacksRef.current = { onFinalText, onEnd };

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    if (!SpeechRecognitionImpl || shouldListenRef.current) return;
    setError(null);

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText.trim()) callbacksRef.current.onFinalText(finalText.trim());
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      shouldListenRef.current = false;
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings and try again.'
          : `Speech recognition error: ${event.error}`
      );
    };

    recognition.onend = () => {
      // Browsers end the session after a pause in speech, so restart until the user stops
      if (shouldListenRef.current) {
        recognition.start();
        return;
      }
      setIsListening(false);
      setInterimText('');
      callbacksRef.current.onEnd?.();
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    recognition.start();
    setIsListening(true);
  }

  function stop() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
  }

  return { isListening, interimText, error, start, stop };
}

export function appendText(prev: string, addition: string) {
  const separator = prev && !/\s$/.test(prev) ? ' ' : '';
  return prev + separator + addition;
}
