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

  // ---------- Red con timeout y errores legibles ----------
  class ApiError extends Error {}

  async function fetchJson(url, params) {
    const target = `${url}?${new URLSearchParams(params)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(target, { signal: ctrl.signal });
      if (res.status === 429) throw new ApiError("Demasiadas solicitudes. Espera un minuto y vuelve a intentar.");
      if (!res.ok) throw new ApiError(`El servicio respondió con error ${res.status}. Intenta de nuevo en unos minutos.`);
      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err.name === "AbortError") throw new ApiError("La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo.");
      throw new ApiError("No se pudo conectar. Revisa tu conexión a internet.");
    } finally {
      clearTimeout(timer);
    }
  }

  const getForecast = async ({ latitude, longitude }, unit) => {
    const data = await fetchJson(FORECAST_URL, {
      latitude, longitude, timezone: "auto", forecast_days: 7, temperature_unit: unit,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum"
    });
    if (!data.current || !data.hourly || !data.daily) throw new ApiError("La respuesta del servicio llegó incompleta.");
    return data;
  };

  // ---------- Estados de UI ----------
  function showLoading() {
    $("dashboard").hidden = true;
    const s = $("status");
    s.className = "panel state";
    s.innerHTML = '<div class="spinner"></div><div>Cargando datos…</div>';
    s.hidden = false;
  }

  function showError(message, retry) {
    $("dashboard").hidden = true;
    const s = $("status");
    s.className = "panel state error";
    s.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = message;
    s.append(p);
    if (retry) {
      const b = document.createElement("button");
      b.textContent = "Reintentar";
      b.addEventListener("click", retry);
      s.append(b);
    }
    s.hidden = false;
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

    $("status").hidden = true;
    $("dashboard").hidden = false;
  }

  // ---------- Flujo principal ----------
  let lastData = null;

  async function load() {
    showLoading();
    try {
      lastData = await getForecast(state.place, state.unit);
      render(lastData);
    } catch (err) {
      showError(err.message, load);
    }
  }

  load();
})();
