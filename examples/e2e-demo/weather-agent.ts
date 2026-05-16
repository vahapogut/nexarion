/**
 * Nexarion E2E Demo — Weather Agent
 *
 * A minimal A2A agent built with nexarion-sdk.
 * Returns weather forecasts for cities.
 *
 * Run: npx tsx weather-agent.ts
 */

import { createAgent } from 'nexarion-sdk';

const agent = createAgent({
  name: 'WeatherAgent',
  description: 'Provides weather forecasts for cities worldwide',
  skills: [
    {
      id: 'forecast',
      name: 'Get Forecast',
      description: 'Get current weather forecast for a given city',
      tags: ['weather', 'forecast', 'temperature'],
      handler: async ({ message }) => {
        const city = message || 'London';
        const temp = Math.round(15 + Math.random() * 20);
        const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)];
        return {
          text: `Weather in ${city}: ${temp}°C, ${conditions}.`,
          data: { city, temperature: temp, condition: conditions, humidity: Math.round(40 + Math.random() * 40) },
        };
      },
    },
    {
      id: 'alert',
      name: 'Weather Alert',
      description: 'Check for severe weather alerts in a region',
      tags: ['weather', 'alert', 'severe'],
      handler: async ({ message }) => {
        const alerts = ['Thunderstorm warning', 'Heat advisory', 'Flood watch', 'No alerts'];
        const alert = alerts[Math.floor(Math.random() * alerts.length)];
        return { text: `${message}: ${alert}.`, data: { region: message, alert } };
      },
    },
  ],
});

agent.start({ port: 3001 });
