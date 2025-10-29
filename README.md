# FRONDEND - IoT Carrito (demo)

Pequeña aplicación frontend (Bootstrap + JS) para controlar y monitorear el backend del proyecto.

Rápido resumen:

- UI en `index.html` (panel de control, monitor en tiempo real, simular obstáculos)
- JS en `assets/js/main.js` (fetch async/await y cliente WebSocket)
- CSS mínimo en `assets/css/styles.css`

Endpoints usados (descubiertos en el backend `app/main.py`):

- POST /api/move -> Payload: {id_dispositivo, id_cliente, id_operacion, id_obstaculo}
- POST /api/obstaculo -> Payload: {id_dispositivo, id_cliente, id_obstaculo}
- GET /api/last/{id_dispositivo} -> devuelve el último evento (sin auth)
- GET /api/events/{id_dispositivo}?n=10 -> devuelve los últimos n eventos (historial)
- WS /ws/monitor -> WebSocket para recibir broadcasts de eventos

Cómo probar localmente (desde la carpeta `FRONDEND`):

1. Servir estático con Python (Windows PowerShell):

```powershell
# desde la carpeta FRONDEND
python -m http.server 8000
# abrir http://localhost:8000
```

2. Cambiar la IP/puerto del backend: editar `assets/js/main.js` y ajustar `BASE_URL` y `WS_URL`.

3. No se requiere API Key para las rutas de demo/monitor (autenticación deshabilitada para esta versión de demostración).

Publicar en GitHub Pages:

- Opción rápida: subir la carpeta `FRONDEND` a un repositorio y en Settings > Pages elegir la rama `main` y carpeta `/FRONDEND` como fuente.
- Alternativa: copiar el contenido de `FRONDEND` a la raíz del repo y publicar desde `main` (o usar gh-pages branch).

Notas importantes:

- En esta versión demo no se requiere `x-api-key`. Si deseas reactivar la verificación, revisa `app/main.py` y `app/config.py`.
- Los códigos numéricos de `id_operacion` provienen de la tabla `Operations` en la DB; el frontend usa mapeos sugeridos: 1=Adelante,2=Atrás,3=Detener. Verifica la tabla real antes de automatizar.

Feedback: dime si quieres más controles (joystick virtual, visualización de mapa, historial con paginación) o que adapte UI/colores.
