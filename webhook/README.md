# Weather Dialogflow Webhook

This small Node.js service lets Dialogflow return live weather values from WeatherAPI.

## Supported intent names

- `GetTemperature`
- `GetHumidity`
- `GetWind`
- `GetCurrentWeather`

Each intent should send a city parameter named `city`.

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
