# Weather Dialogflow Webhook

This small Node.js service lets Dialogflow return live weather values from WeatherAPI.

## Supported intent names

- `GetTemperature`
- `GetHumidity`
- `GetWind`
- `GetCurrentWeather`

Each intent should send a city parameter named `city`.

If Dialogflow sends a different intent name, the webhook now falls back to the full formatted weather summary instead of a plain temperature-only sentence.

For a chat message such as:

```text
weather in Bangalore
```

use the `GetCurrentWeather` intent. It now returns a formatted live response like:

```text
🌤️ Weather in Bangalore

🌡️ Temperature: 28°C
☁️ Condition: scattered clouds
💧 Humidity: 62%
🌬️ Wind Speed: 3.2 m/s
```

## Local setup

1. Copy `.env.example` to `.env`
2. Add your WeatherAPI key to `.env`
3. Start the server with:

```bash
npm start
```

The webhook endpoint is:

```text
POST /webhook
```

## Dialogflow webhook URL

After deployment, paste your public URL ending in `/webhook` into Dialogflow, for example:

```text
https://your-service.example.com/webhook
```
