# Weather Dialogflow Webhook

This small Node.js service lets Dialogflow return live weather values from WeatherAPI.

## Supported intent names

- `current.weather`
- `city.weather`
- `weekly.forecast`
- `rain.check`
- `aqi.check`

Use a city parameter named `city` for `city.weather`, and optionally for the other intents if you want city-specific answers. If no city is sent, the webhook uses `auto:ip`.

### Example responses

```text
🌤️ Current weather in Bangalore is 28°C with scattered clouds.
🌦️ Weather in Mysore is 26°C with light rain.
📅 The upcoming week in Bangalore will have temperatures around 22–29°C, with the highest rain chance on Friday.
🌧️ Yes, there is a high chance of rain today in Bangalore (78%). Carry an umbrella.
🌫️ AQI in Bangalore is Moderate (AQI index: 2).
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
