(() => {
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const DEFAULT_PLACE = { name: "San Pedro de Macorís", country: "República Dominicana", latitude: 18.4617, longitude: -69.3086 };

  const WEATHER_CODES = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna intensa",
    61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia fuerte", 71: "Nieve ligera", 73: "Nieve", 75: "Nieve fuerte",
    80: "Chubascos ligeros", 81: "Chubascos", 82: "Chubascos violentos", 95: "Tormenta eléctrica",
    96: "Tormenta con granizo", 99: "Tormenta fuerte con granizo"
  };

  const $ = (id) => document.getElementById(id);
  const state = { place: DEFAULT_PLACE, unit: "celsius" };

  async function getForecast({ latitude, longitude }, unit) {
    const params = new URLSearchParams({
      latitude, longitude, timezone: "auto", forecast_days: 7, temperature_unit: unit,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum"
    });
    const res = await fetch(`${FORECAST_URL}?${params}`);
    return res.json();
  }

  // ---------- Render ----------
  const deg = (n) => `${Math.round(n)}°`;

  function render(data) {
    const { current: c, daily, hourly } = data;
    const sym = state.unit === "celsius" ? "C" : "F";

    $("place").textContent = [state.place.name, state.place.admin1, state.place.country].filter(Boolean).join(", ");
    $("temp").textContent = Math.round(c.temperature_2m);
    $("unit").textContent = `°${sym}`;
    $("cond").textContent = WEATHER_CODES[c.weather_code] ?? "Condición desconocida";
    $("feels").textContent = deg(c.apparent_temperature);
    $("humidity").textContent = `${c.relative_humidity_2m}%`;
    $("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    $("rain").textContent = `${daily.precipitation_sum[0].toFixed(1)} mm`;

    $("dashboard").hidden = false;
  }

  // ---------- Flujo principal ----------
  async function load() {
    try {
      render(await getForecast(state.place, state.unit));
    } catch (err) {
      console.error(err);
    }
  }

  load();
})();
