import { createSignal, onCleanup } from "solid-js";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [isPaused, setIsPaused] = createSignal(false);

  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let playResolve: (() => void) | null = null;

  function cleanup() {
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
  }

  function play(blob: Blob): Promise<void> {
    // Resolve any pending play promise before starting a new one
    if (playResolve) {
      playResolve();
      playResolve = null;
    }
    cleanup();

    return new Promise((resolve, reject) => {
      playResolve = resolve;
      objectUrl = URL.createObjectURL(blob);
      audio = new Audio(objectUrl);

      audio.onended = () => {
        playResolve = null;
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        playResolve = null;
        cleanup();
        reject(new Error("Audio playback failed"));
      };

      setIsPlaying(true);
      setIsPaused(false);
      audio.play().catch((err) => {
        playResolve = null;
        cleanup();
        reject(err);
      });
    });
  }

  function pause() {
    if (audio && isPlaying() && !isPaused()) {
      audio.pause();
      setIsPaused(true);
    }
  }

  function resume() {
    if (audio && isPlaying() && isPaused()) {
      audio.play();
      setIsPaused(false);
    }
  }

  function stop() {
    if (playResolve) {
      const resolve = playResolve;
      playResolve = null;
      cleanup();
      resolve();
    } else {
      cleanup();
    }
  }

  onCleanup(() => {
    if (playResolve) {
      playResolve();
      playResolve = null;
    }
    cleanup();
  });

  return { isPlaying, isPaused, play, pause, resume, stop };
}
