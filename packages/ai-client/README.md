# @jombee/ai-client

Shared, framework-agnostic client utilities for AI agent applications. Provides SSE parsing, chunked TTS playback, Web Audio scheduling, and microphone recording.

Zero runtime dependencies — just TypeScript and browser APIs.

## Installation

Already available as a workspace package:

```json
{
  "dependencies": {
    "@jombee/ai-client": "workspace:*"
  }
}
```

Then run `bun install` from the repo root.

## Exports

```ts
import {
  parseSseStream, type SseEvent,
  splitIntoChunks, chunkedSpeak,
  AudioScheduler,
  AudioRecorder,
} from "@jombee/ai-client";
```

---

## SSE Parser

Parse Server-Sent Events from a `fetch` Response. Needed because `EventSource` only supports GET — our agent endpoints use POST.

### `parseSseStream(response: Response): AsyncGenerator<SseEvent>`

```ts
const response = await fetch("/api/agent/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Hello" }),
});

for await (const event of parseSseStream(response)) {
  switch (event.event) {
    case "text-delta":
      console.log(JSON.parse(event.data).text);
      break;
    case "done":
      console.log("Stream complete");
      break;
  }
}
```

### `SseEvent`

```ts
interface SseEvent {
  event: string;  // e.g. "text-delta", "tool-call", "done"
  data: string;   // raw string — parse with JSON.parse() as needed
  id?: string;    // optional SSE id field
}
```

---

## Chunked TTS

Progressive text-to-speech playback that splits text into sentence chunks and pipelines synthesis requests for fast time-to-first-audio.

### `splitIntoChunks(text: string): string[]`

Splits text into sentence groups with exponential growth (1, 2, 3, 5, 8 sentences per chunk). The first chunk is a single sentence for fast initial playback (~200-400ms).

```ts
splitIntoChunks("First. Second. Third. Fourth. Fifth. Sixth.");
// → ["First.", "Second. Third.", "Fourth. Fifth. Sixth."]
```

### `chunkedSpeak(text, synthesize, schedule, waitForEnd, isStopped): Promise<void>`

Orchestrates the full chunked TTS pipeline:

1. Splits text into chunks
2. Fires all synthesis requests in parallel (pipelined)
3. Schedules audio blobs for gapless playback as they resolve (in order)
4. Waits for all audio to finish

```ts
const scheduler = new AudioScheduler();
let stopped = false;

await chunkedSpeak(
  "Long text with multiple sentences. Each one gets synthesized. Playback starts after the first sentence.",
  async (chunk) => {
    // Your TTS API call — return an audio Blob
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunk, speaker: "alloy" }),
    });
    return res.blob();
  },
  (blob) => scheduler.schedule(blob),
  () => scheduler.waitForEnd(),
  () => stopped, // return true to abort
);
```

To cancel mid-playback, set `stopped = true` and call `scheduler.stop()`.

---

## AudioScheduler

Web Audio API wrapper for gapless playback of audio chunks. Handles `AudioContext` lifecycle, leading-silence detection, and precise scheduling.

### Usage

```ts
const scheduler = new AudioScheduler();

// Schedule audio blobs for back-to-back playback
await scheduler.schedule(blob1);
await scheduler.schedule(blob2);

// Wait for everything to finish
await scheduler.waitForEnd();

// Or stop immediately
scheduler.stop();

// Adjust volume (0-1)
scheduler.setVolume(0.5);
```

### API

| Method | Description |
|--------|-------------|
| `schedule(blob: Blob): Promise<void>` | Decode an audio blob and queue it for gapless playback |
| `waitForEnd(): Promise<void>` | Resolves when all scheduled audio finishes playing |
| `stop(): void` | Immediately stop all audio and reset the queue |
| `setVolume(v: number): void` | Set gain (0 = silent, 1 = full volume) |

The scheduler automatically:
- Creates and resumes an `AudioContext` on first use
- Detects leading silence in each chunk and skips it for seamless transitions
- Tracks pending sources and resolves `waitForEnd` when the last one completes

---

## AudioRecorder

Framework-agnostic microphone recorder. Uses a callback pattern so it works with any UI framework (SolidJS, React, vanilla JS, etc.).

### Usage

```ts
const recorder = new AudioRecorder({
  mimeType: "audio/webm",
  onStateChange: (recording) => console.log("Recording:", recording),
});

// Start recording (requests mic permission)
await recorder.start();

// Check state
console.log(recorder.recording); // true

// Stop and get the audio blob
const blob = await recorder.stop(); // releases the mic

// Or cancel without getting data
recorder.cancel();
```

### SolidJS wrapper example

```ts
import { createSignal } from "solid-js";
import { AudioRecorder } from "@jombee/ai-client";

function useAudioRecorder() {
  const [isRecording, setIsRecording] = createSignal(false);
  const recorder = new AudioRecorder({
    onStateChange: setIsRecording,
  });
  return {
    isRecording,
    start: () => recorder.start(),
    stop: () => recorder.stop(),
  };
}
```

### Constructor options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mimeType` | `string` | `"audio/webm"` | MIME type for the `MediaRecorder` |
| `onStateChange` | `(recording: boolean) => void` | — | Called when recording starts or stops |
