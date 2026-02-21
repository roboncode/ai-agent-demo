export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  VITE_API_KEY: import.meta.env.VITE_API_KEY ?? "demo",
} as const;
