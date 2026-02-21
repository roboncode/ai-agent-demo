import { runAgent } from "../lib/run-agent.js";
import { weatherTool } from "../tools/weather.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryHandlers } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a weather specialist agent. Your job is to provide accurate, helpful weather information.

When asked about weather:
1. Use the getWeather tool to fetch current conditions
2. Present the data in a clear, conversational format
3. Include temperature, conditions, humidity, and wind info
4. Offer practical advice based on conditions (e.g., "bring an umbrella")

Always use the tool to get real data rather than guessing.`;

export const WEATHER_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools: { getWeather: weatherTool },
};

export const runWeatherAgent = (message: string, model?: string) =>
  runAgent(WEATHER_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "weather",
  description: "Weather specialist agent using open-meteo data",
  toolNames: ["getWeather"],
  defaultFormat: "sse",
  defaultSystem: SYSTEM_PROMPT,
  tools: { getWeather: weatherTool },
  ...makeRegistryHandlers({ tools: { getWeather: weatherTool } }),
});
