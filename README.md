# Dashboard del clima

Dashboard del clima hecho con HTML, CSS y JavaScript puro. Consume la API de [Open-Meteo](https://open-meteo.com/) y muestra el clima de la ciudad que elijas.

## Características

- **Clima actual:** temperatura, sensación térmica, humedad, viento y lluvia del día.
- Tema claro y oscuro según el sistema.
- **Manejo de errores:** sin conexión, timeout de 10 s, límite de solicitudes (429), errores HTTP y respuestas incompletas, con botón de reintentar.
- Estado de carga mientras llegan los datos.
- **Buscador de ciudades** con geocoding (si hay varias coincidencias, se elige de una lista).

## Roadmap

- [x] Clima actual con Open-Meteo
- [x] Manejo de errores y estados de carga
- [x] Buscador de ciudades
- [ ] Gráficas con Chart.js
- [ ] Unidades °C/°F y ciudad guardada
- [ ] Despliegue en GitHub Pages

## API utilizada

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Pronóstico: `https://api.open-meteo.com/v1/forecast`
