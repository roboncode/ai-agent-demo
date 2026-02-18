import { generateText, stepCountIs } from "ai";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { weatherTool } from "../tools/weather.js";

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

export async function runWeatherAgent(message: string, model?: string) {
  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: { getWeather: weatherTool },
    stopWhen: stepCountIs(5),
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
    usage: extractUsage(result, startTime),
  };
}
