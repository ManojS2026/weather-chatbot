import http from "node:http";
import "dotenv/config";

const port = Number(process.env.PORT || 3000);
const weatherApiKey = process.env.WEATHER_API_KEY;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function getCity(parameters = {}) {
  return parameters.city || parameters["geo-city"] || parameters["sys.geo-city"];
}

function buildDialogflowReply(text) {
  return {
    fulfillmentText: text,
    fulfillmentMessages: [
      {
        text: {
          text: [text],
        },
      },
    ],
  };
}

function isGreetingQuery(text = "") {
  const normalized = text.toLowerCase();
  return ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings"].some(
    (phrase) => normalized.includes(phrase)
  );
}

async function fetchCurrentWeather(city = "auto:ip", includeAqi = false) {
  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", weatherApiKey);
  url.searchParams.set("q", city);
  if (includeAqi) {
    url.searchParams.set("aqi", "yes");
  }

  const apiResponse = await fetch(url);

  if (!apiResponse.ok) {
    throw new Error(`Weather API returned ${apiResponse.status}`);
  }

  return apiResponse.json();
}

async function fetchForecast(city = "auto:ip", days = 1, includeAqi = false) {
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", weatherApiKey);
  url.searchParams.set("q", city);
  url.searchParams.set("days", String(days));
  if (includeAqi) {
    url.searchParams.set("aqi", "yes");
  }

  const apiResponse = await fetch(url);

  if (!apiResponse.ok) {
    throw new Error(`Weather API returned ${apiResponse.status}`);
  }

  return apiResponse.json();
}

function createFormattedWeatherReply(weather, label = "Current weather") {
  const cityName = weather.location.name;
  const temperature = Math.round(weather.current.temp_c);
  const condition = weather.current.condition.text;

  return `🌤️ ${label} in ${cityName} is ${temperature}°C with ${condition}.`;
}

function createWeeklyForecastReply(forecast) {
  const cityName = forecast.location.name;
  const days = forecast.forecast.forecastday;
  const avgMax = Math.round(
    days.reduce((sum, day) => sum + day.day.maxtemp_c, 0) / days.length
  );
  const avgMin = Math.round(
    days.reduce((sum, day) => sum + day.day.mintemp_c, 0) / days.length
  );
  const rainiestDay = days.reduce((best, day) =>
    day.day.daily_chance_of_rain > best.day.daily_chance_of_rain ? day : best
  );
  const rainDate = new Date(`${rainiestDay.date}T00:00:00`);
  const rainDayName = rainDate.toLocaleDateString("en-US", { weekday: "long" });

  return `📅 The upcoming week in ${cityName} will have temperatures around ${avgMin}–${avgMax}°C, with the highest rain chance on ${rainDayName}.`;
}

function createRainReply(forecast) {
  const cityName = forecast.location.name;
  const today = forecast.forecast.forecastday[0].day;
  const chance = today.daily_chance_of_rain;

  if (chance >= 60) {
    return `🌧️ Yes, there is a high chance of rain today in ${cityName} (${chance}%). Carry an umbrella.`;
  }

  if (chance >= 30) {
    return `🌦️ There is a moderate chance of rain today in ${cityName} (${chance}%).`;
  }

  return `☀️ Rain is unlikely today in ${cityName} (${chance}% chance).`;
}

function getAqiLabel(usEpaIndex) {
  switch (usEpaIndex) {
    case 1:
      return "Good";
    case 2:
      return "Moderate";
    case 3:
      return "Unhealthy for sensitive groups";
    case 4:
      return "Unhealthy";
    case 5:
      return "Very unhealthy";
    case 6:
      return "Hazardous";
    default:
      return "Unavailable";
  }
}

function createAqiReply(weather) {
  const cityName = weather.location.name;
  const aqi = weather.current.air_quality?.["us-epa-index"];
  const label = getAqiLabel(aqi);

  if (!aqi) {
    return `🌫️ AQI data is unavailable for ${cityName} right now.`;
  }

  return `🌫️ AQI in ${cityName} is ${label} (AQI index: ${aqi}).`;
}

async function handleWebhook(request, response) {
  if (!weatherApiKey) {
    sendJson(
      response,
      500,
      buildDialogflowReply("Webhook is missing the WEATHER_API_KEY setting.")
    );
    return;
  }

  let body = "";

  request.on("data", (chunk) => {
    body += chunk;
  });

  request.on("end", async () => {
    try {
      const payload = JSON.parse(body || "{}");
      const intentName = payload.queryResult?.intent?.displayName;
      const queryText = payload.queryResult?.queryText || "";
      const normalizedQuery = queryText.toLowerCase();
      const parameters = payload.queryResult?.parameters || {};
      const city = getCity(parameters);
      const cityOrAutoIp = city || "auto:ip";
      const isGreeting = isGreetingQuery(queryText);

      let reply;

      if (isGreeting || intentName === "WELCOME" || intentName === "Default Welcome Intent") {
        reply =
          "Hello! I can help with weather, forecasts, rain chances, or air quality. Try asking something like 'What's the weather today?'";
      } else if (
        normalizedQuery.includes("aqi") ||
        normalizedQuery.includes("air quality") ||
        normalizedQuery.includes("pollution")
      ) {
        const weather = await fetchCurrentWeather(cityOrAutoIp, true);
        reply = createAqiReply(weather);
      } else switch (intentName) {
        case "current.weather": {
          const weather = await fetchCurrentWeather(cityOrAutoIp);
          reply = createFormattedWeatherReply(weather);
          break;
        }
        case "city.weather": {
          if (!city) {
            reply = "Which city do you want the weather for?";
            break;
          }
          const weather = await fetchCurrentWeather(city);
          reply = createFormattedWeatherReply(weather, "Weather");
          break;
        }
        case "weekly.forecast": {
          const forecast = await fetchForecast(cityOrAutoIp, 7);
          reply = createWeeklyForecastReply(forecast);
          break;
        }
        case "rain.check": {
          const forecast = await fetchForecast(cityOrAutoIp, 1);
          reply = createRainReply(forecast);
          break;
        }
        case "aqi.check": {
          const weather = await fetchCurrentWeather(cityOrAutoIp, true);
          reply = createAqiReply(weather);
          break;
        }
        default: {
          if (isGreeting) {
            reply =
              "Hello! I can help with weather, forecasts, rain chances, or air quality. Try asking something like 'What's the weather today?'";
          } else {
            reply =
              "Sorry, I didn't understand that. Ask me about weather, forecast, rain, or air quality.";
          }
        }
      }

      sendJson(response, 200, buildDialogflowReply(reply));
    } catch (error) {
      console.error(error);
      sendJson(
        response,
        200,
        buildDialogflowReply(
          "Sorry, I could not get the weather right now. Please try again."
        )
      );
    }
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/") {
    sendJson(response, 200, {
      status: "ok",
      service: "weather-dialogflow-webhook",
    });
    return;
  }

  if (request.method === "POST" && request.url === "/webhook") {
    handleWebhook(request, response);
    return;
  }

  sendJson(response, 404, {
    error: "Not found",
  });
});

server.listen(port, () => {
  console.log(`Weather webhook listening on port ${port}`);
});
