# Dashboard del clima

Dashboard del clima hecho con HTML, CSS y JavaScript puro. Consume la API de [Open-Meteo](https://open-meteo.com/) y muestra el clima de la ciudad que elijas con gráficas de [Chart.js](https://www.chartjs.org/).

**Demo:** https://johanbonifacio15.github.io/Dashboard-Clima/

## Características

- **Clima actual:** temperatura, sensación térmica, humedad, viento y lluvia del día.
- Tema claro y oscuro según el sistema.
- **Manejo de errores:** sin conexión, timeout de 10 s, límite de solicitudes (429), errores HTTP y respuestas incompletas, con botón de reintentar.
- Estado de carga mientras llegan los datos.
- **Buscador de ciudades** con geocoding (si hay varias coincidencias, se elige de una lista).
- **Gráfica de 7 días:** temperaturas máximas y mínimas.
- **Gráfica de 24 horas:** temperatura y probabilidad de lluvia.
- Cambio de unidades entre °C y °F.
- Recuerda la última ciudad consultada (`localStorage`).
- **Detección de ubicación:** en la primera visita usa tu ubicación (con tu permiso) y hay un botón para volver a detectarla.


## API utilizada

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Pronóstico: `https://api.open-meteo.com/v1/forecast`
- Nombre de la ubicación: `https://api.bigdatacloud.net/data/reverse-geocode-client` ([BigDataCloud](https://www.bigdatacloud.com/))
