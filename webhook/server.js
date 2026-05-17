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

async function fetchCurrentWeather(city) {
  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", weatherApiKey);
  url.searchParams.set("q", city);

  const apiResponse = await fetch(url);

  if (!apiResponse.ok) {
    throw new Error(`Weather API returned ${apiResponse.status}`);
  }

  return apiResponse.json();
}

function createWeatherReply(intentName, weather) {
  const cityName = weather.location.name;
  const temperature = weather.current.temp_c;
  const humidity = weather.current.humidity;
  const wind = weather.current.wind_kph;
  const condition = weather.current.condition.text;

  switch (intentName) {
    case "GetTemperature":
      return `The current temperature in ${cityName} is ${temperature}°C.`;
    case "GetHumidity":
      return `The current humidity in ${cityName} is ${humidity}%.`;
    case "GetWind":
      return `The current wind speed in ${cityName} is ${wind} km/h.`;
    case "GetCurrentWeather":
      return `The current weather in ${cityName} is ${condition}, ${temperature}°C, with ${humidity}% humidity and wind at ${wind} km/h.`;
    default:
      return `The current temperature in ${cityName} is ${temperature}°C.`;
  }
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
      const parameters = payload.queryResult?.parameters || {};
      const city = getCity(parameters);

      if (!city) {
        sendJson(
          response,
          200,
          buildDialogflowReply("Which city do you want the weather for?")
        );
        return;
      }

      const weather = await fetchCurrentWeather(city);
      const reply = createWeatherReply(intentName, weather);

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
