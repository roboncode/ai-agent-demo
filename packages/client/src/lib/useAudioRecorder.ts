import { createSignal } from "solid-js";
import { AudioRecorder } from "@jombee/ai-client";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const recorder = new AudioRecorder({
    mimeType: "audio/webm",
    onStateChange: setIsRecording,
  });

  async function start(): Promise<void> {
    try {
      setError(null);
      await recorder.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
      throw err;
    }
  }

  function stop(): Promise<Blob> {
    return recorder.stop();
  }

  return { isRecording, error, start, stop };
}
