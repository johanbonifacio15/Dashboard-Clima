(() => {
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
  const DEFAULT_PLACE = { name: "Santo Domingo", admin1: "Distrito Nacional", country: "República Dominicana", latitude: 18.4861, longitude: -69.9312 };

  const WEATHER_CODES = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna intensa",
    61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia fuerte", 71: "Nieve ligera", 73: "Nieve", 75: "Nieve fuerte",
    80: "Chubascos ligeros", 81: "Chubascos", 82: "Chubascos violentos", 95: "Tormenta eléctrica",
    96: "Tormenta con granizo", 99: "Tormenta fuerte con granizo"
  };

  function skyFor(code) {
    if (code <= 1) return "clear";
    if (code <= 3) return "cloudy";
    if (code <= 48) return "fog";
    if (code <= 67) return "rain";
    if (code <= 77) return "snow";
    if (code <= 82) return "rain";
    if (code <= 86) return "snow";
    return "storm";
  }

  function iconFor(code, isDay) {
    switch (skyFor(code)) {
      case "clear": return isDay ? "☀️" : "🌙";
      case "cloudy": return code === 2 && isDay ? "⛅" : "☁️";
      case "fog": return "🌫️";
      case "rain": return code >= 51 && code <= 55 ? "🌦️" : "🌧️";
      case "snow": return "❄️";
      default: return "⛈️";
    }
  }

  const $ = (id) => document.getElementById(id);
  const state = { place: loadPlace(), unit: "celsius", charts: {} };

  function loadPlace() {
    try { return JSON.parse(localStorage.getItem("weather:place")) || DEFAULT_PLACE; }
    catch { return DEFAULT_PLACE; }
  }
  function hasSavedPlace() {
    try { return localStorage.getItem("weather:place") !== null; }
    catch { return false; }
  }
  function savePlace(p) {
    try { localStorage.setItem("weather:place", JSON.stringify(p)); } catch { /* storage no disponible */ }
  }

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

  const searchCities = async (name) => {
    const data = await fetchJson(GEO_URL, { name, count: 5, language: "es", format: "json" });
    return data.results || [];
  };

  const getForecast = async ({ latitude, longitude }, unit) => {
    const data = await fetchJson(FORECAST_URL, {
      latitude, longitude, timezone: "auto", forecast_days: 7, temperature_unit: unit,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
      hourly: "temperature_2m,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum"
    });
    if (!data.current || !data.hourly || !data.daily) throw new ApiError("La respuesta del servicio llegó incompleta.");
    return data;
  };

  // ---------- Estados de UI ----------
  function showLoading() {
    $("dashboard").hidden = true;
    $("suggestions").hidden = true;
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
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const dayLabel = (iso) => new Date(iso + "T12:00").toLocaleDateString("es", { weekday: "short", day: "numeric" });
  const hourLabel = (iso) => new Date(iso).toLocaleTimeString("es", { hour: "numeric", hour12: true });
  const deg = (n) => `${Math.round(n)}°`;

  function render(data) {
    const { current: c, daily, hourly } = data;
    const sym = state.unit === "celsius" ? "C" : "F";

    $("place").textContent = [state.place.name, state.place.admin1, state.place.country].filter(Boolean).join(", ");
    $("temp").textContent = Math.round(c.temperature_2m);
    $("unit").textContent = `°${sym}`;
    $("cond").textContent = WEATHER_CODES[c.weather_code] ?? "Condición desconocida";

    const isDay = c.is_day === 1;
    document.body.dataset.sky = skyFor(c.weather_code);
    document.body.dataset.day = isDay ? "1" : "0";
    $("icon").textContent = iconFor(c.weather_code, isDay);

    $("feels").textContent = deg(c.apparent_temperature);
    $("humidity").textContent = `${c.relative_humidity_2m}%`;
    $("humidity").closest(".stat").style.setProperty("--v", c.relative_humidity_2m);
    $("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    $("rain").textContent = `${daily.precipitation_sum[0].toFixed(1)} mm`;

    $("status").hidden = true;
    $("dashboard").hidden = false;

    // Gráfica diaria: máxima y mínima
    drawChart("dailyChart", {
      type: "line",
      data: {
        labels: daily.time.map(dayLabel),
        datasets: [
          { label: `Máx (°${sym})`, data: daily.temperature_2m_max, borderColor: css("--warm"), backgroundColor: css("--warm"), tension: .35 },
          { label: `Mín (°${sym})`, data: daily.temperature_2m_min, borderColor: css("--cold"), backgroundColor: css("--cold"), tension: .35 }
        ]
      },
      options: baseOptions({ y: { ticks: { callback: (v) => v + "°" } } })
    });

    // Gráfica por hora: desde la hora actual, 24 horas
    const start = Math.max(0, hourly.time.findIndex((t) => t.startsWith(c.time.slice(0, 13))));
    const slice = (arr) => arr.slice(start, start + 24);
    drawChart("hourlyChart", {
      data: {
        labels: slice(hourly.time).map(hourLabel),
        datasets: [
          { type: "bar", label: "Prob. de lluvia (%)", data: slice(hourly.precipitation_probability), backgroundColor: css("--rain") + "99", yAxisID: "y2", order: 2 },
          { type: "line", label: `Temp (°${sym})`, data: slice(hourly.temperature_2m), borderColor: css("--warm"), backgroundColor: css("--warm"), pointRadius: 0, tension: .35, yAxisID: "y", order: 1 }
        ]
      },
      options: baseOptions({
        y: { position: "left", ticks: { callback: (v) => v + "°" } },
        y2: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + "%" } },
        x: { ticks: { maxTicksLimit: 8 } }
      })
    });
  }

  function baseOptions(scales) {
    const muted = css("--muted"), line = css("--line");
    const withTheme = Object.fromEntries(Object.entries({ x: {}, y: {}, ...scales }).map(([k, v]) => [
      k, { ...v, grid: { color: line, ...(v.grid || {}) }, ticks: { color: muted, ...(v.ticks || {}) } }
    ]));
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: muted, usePointStyle: true, boxWidth: 8 } } },
      scales: withTheme
    };
  }

  function drawChart(id, config) {
    Chart.defaults.font.family = css("--body");
    state.charts[id]?.destroy();
    state.charts[id] = new Chart($(id), config);
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

  async function onSearch(e) {
    e.preventDefault();
    const name = $("q").value.trim();
    if (name.length < 2) { showError("Escribe al menos 2 letras del nombre de la ciudad."); return; }
    showLoading();
    try {
      const results = await searchCities(name);
      if (!results.length) { showError(`No se encontró ninguna ciudad llamada "${name}". Revisa la ortografía.`); return; }
      if (results.length === 1) return selectPlace(results[0]);
      showSuggestions(results);
      $("status").hidden = true;
    } catch (err) {
      showError(err.message, () => onSearch(e));
    }
  }

  function showSuggestions(results) {
    const box = $("suggestions");
    box.innerHTML = "";
    results.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
      b.addEventListener("click", () => selectPlace(r));
      box.append(b);
    });
    box.hidden = false;
    if (lastData) $("dashboard").hidden = false;
  }

  // ---------- Ubicación del usuario ----------
  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        return reject(new ApiError("Tu navegador no soporta la geolocalización."));
      }
      const messages = {
        1: "Permiso de ubicación denegado. Puedes buscar tu ciudad manualmente.",
        2: "No se pudo determinar tu ubicación.",
        3: "La ubicación tardó demasiado en responder."
      };
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => reject(new ApiError(messages[err.code] || "No se pudo obtener tu ubicación.")),
        { timeout: 10000, maximumAge: 600000 }
      );
    });
  }

  async function getPlaceName(latitude, longitude) {
    try {
      const data = await fetchJson(REVERSE_URL, { latitude, longitude, localityLanguage: "es" });
      return {
        name: data.city || data.locality || "Mi ubicación",
        admin1: data.principalSubdivision,
        country: data.countryName?.replace(/\s*\(.*\)$/, "")
      };
    } catch {
      return { name: "Mi ubicación" };
    }
  }

  async function useMyLocation({ silent = false } = {}) {
    showLoading();
    try {
      const { coords } = await getPosition();
      const info = await getPlaceName(coords.latitude, coords.longitude);
      selectPlace({ ...info, latitude: coords.latitude, longitude: coords.longitude });
    } catch (err) {
      if (silent) return load();
      showError(err.message, () => useMyLocation());
    }
  }

  function selectPlace(r) {
    state.place = { name: r.name, admin1: r.admin1, country: r.country, latitude: r.latitude, longitude: r.longitude };
    savePlace(state.place);
    $("suggestions").hidden = true;
    $("q").value = "";
    load();
  }

  $("search").addEventListener("submit", onSearch);
  $("locate").addEventListener("click", () => useMyLocation());
  document.querySelectorAll("[data-unit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (state.unit === btn.dataset.unit) return;
      state.unit = btn.dataset.unit;
      document.querySelectorAll("[data-unit]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      load();
    })
  );

  if (hasSavedPlace()) load();
  else useMyLocation({ silent: true });
})();
