import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
  description:
    "Get current weather information for a location. Returns temperature, humidity, wind speed, and conditions.",
  inputSchema: z.object({
    location: z
      .string()
      .describe("City name or location (e.g. 'Tokyo', 'New York')"),
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    const current = data.current_condition?.[0];

    if (!current) {
      throw new Error(`No weather data found for ${location}`);
    }

    return {
      location,
      temperature: {
        celsius: Number(current.temp_C),
        fahrenheit: Number(current.temp_F),
      },
      feelsLike: {
        celsius: Number(current.FeelsLikeC),
        fahrenheit: Number(current.FeelsLikeF),
      },
      humidity: Number(current.humidity),
      description: current.weatherDesc?.[0]?.value ?? "Unknown",
      windSpeed: {
        kmph: Number(current.windspeedKmph),
        mph: Number(current.windspeedMiles),
      },
      windDirection: current.winddir16Point,
      visibility: Number(current.visibility),
      uvIndex: Number(current.uvIndex),
    };
  },
});

export async function getWeatherDirect(location: string) {
  return weatherTool.execute!({ location }, { toolCallId: "direct", messages: [], abortSignal: undefined as any });
}
