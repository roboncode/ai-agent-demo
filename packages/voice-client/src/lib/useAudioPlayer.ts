import { createSignal, onCleanup } from "solid-js";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = createSignal(false);

  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  function cleanup() {
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    setIsPlaying(false);
  }

  function play(blob: Blob): Promise<void> {
    cleanup();

    return new Promise((resolve, reject) => {
      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);

      audio.onended = () => {
        setIsPlaying(false);
        resolve();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        reject(new Error("Audio playback failed"));
      };

      setIsPlaying(true);
      audio.play().catch((err) => {
        setIsPlaying(false);
        reject(err);
      });
    });
  }

  function stop() {
    cleanup();
  }

  onCleanup(cleanup);

  return { isPlaying, play, stop };
}
