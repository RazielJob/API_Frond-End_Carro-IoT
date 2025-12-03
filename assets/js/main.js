// Frontend logic for IoT control and monitoring
const BASE_URL = "http://52.4.229.72:5500";
const WS_URL = "ws://52.4.229.72:5500/ws/monitor";

function getUi() {
  return {
    deviceId: Number(document.getElementById("deviceId").value || 1),
    clientId: Number(document.getElementById("clientId").value || 1),
  };
}

function logEvent(obj) {
  const events = document.getElementById("events");
  const time = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.textContent = `[${time}] ${
    typeof obj === "string" ? obj : JSON.stringify(obj)
  }`;
  events.prepend(line);
}

function updateStatus(message) {
  const statusEl = document.getElementById("statusText");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

async function postMove(id_operacion, id_obstaculo = null) {
  const ui = getUi();
  const payload = {
    id_dispositivo: ui.deviceId,
    id_cliente: ui.clientId,
    id_operacion,
    id_obstaculo,
  };

  updateStatus(`Enviando operación ${id_operacion}...`);

  try {
    const res = await fetch(`${BASE_URL}/api/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "move:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      updateStatus("Error al enviar");
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "move:response", ok: true, data });
    updateStatus("Comando enviado ✓");
    return data;
  } catch (err) {
    logEvent({ type: "move:error", message: err.message });
    updateStatus("Error de conexión");
    throw err;
  }
}

async function postObstaculo(id_obstaculo) {
  const ui = getUi();
  const payload = {
    id_dispositivo: ui.deviceId,
    id_cliente: ui.clientId,
    id_obstaculo,
  };
  try {
    const res = await fetch(`${BASE_URL}/api/obstaculo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "obstaculo:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "obstaculo:response", ok: true, data });
    return data;
  } catch (err) {
    logEvent({ type: "obstaculo:error", message: err.message });
    throw err;
  }
}

async function getLast(id_dispositivo) {
  try {
    const res = await fetch(`${BASE_URL}/api/last/${id_dispositivo}`);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "last:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "last:response", data });
    return data;
  } catch (err) {
    logEvent({ type: "last:error", message: err.message });
    throw err;
  }
}

// Health check
async function checkBackend() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) {
      logEvent({ type: "health", ok: true, msg: "backend reachable" });
      return { ok: true };
    }
    const text = await res.text().catch(() => null);
    logEvent({ type: "health", ok: false, status: res.status, body: text });
    return { ok: false, status: res.status, body: text };
  } catch (err) {
    logEvent({ type: "health:error", message: err.message });
    return { ok: false, error: err.message };
  }
}

async function getEvents(id_dispositivo, n = 10) {
  try {
    const res = await fetch(`${BASE_URL}/api/events/${id_dispositivo}?n=${n}`);
    const data = await res.json();
    return data;
  } catch (err) {
    logEvent({ type: "events:error", message: err.message });
    throw err;
  }
}

// WebSocket
let ws = null;
function updateWsBadge(connected) {
  const el = document.getElementById("wsStatus");
  el.innerHTML = `WebSocket: <span class="badge ${
    connected ? "bg-success" : "bg-secondary"
  }">${connected ? "Conectado" : "Desconectado"}</span>`;
}

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    logEvent({ type: "ws:error", message: err.message });
    return;
  }
  ws.onopen = () => {
    updateWsBadge(true);
    logEvent("WS abierto");
  };
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      logEvent({ type: "ws:msg", data });
    } catch {
      logEvent({ type: "ws:msg", raw: ev.data });
    }
  };
  ws.onclose = () => {
    updateWsBadge(false);
    logEvent("WS cerrado");
  };
  ws.onerror = (err) => {
    logEvent({ type: "ws:error", err });
  };
}

// Nueva función: Generar secuencia aleatoria
function generateRandomSequence(length = 5) {
  const operaciones = [1, 2, 3, 4, 5]; // 1=Adelante, 2=Atrás, 3=Detener, 4=Izquierda, 5=Derecha
  const sequence = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * operaciones.length);
    sequence.push(operaciones[randomIndex]);
  }
  return sequence;
}

// Nueva función: Enviar secuencia al backend
async function postSequence(nombre, movimientos) {
  const ui = getUi();
  const payload = {
    nombre: nombre,
    movimientos: movimientos,
    id_dispositivo: ui.deviceId,
    id_cliente: ui.clientId,
  };

  updateStatus(`Ejecutando secuencia...`);

  try {
    const res = await fetch(`${BASE_URL}/api/sequence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "sequence:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      updateStatus("Error al ejecutar secuencia");
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "sequence:response", ok: true, data });
    updateStatus("Secuencia ejecutada ✓");
    return data;
  } catch (err) {
    logEvent({ type: "sequence:error", message: err.message });
    updateStatus("Error de conexión");
    throw err;
  }
}

// FUNCIONES DE VELOCIDAD AÑADIDAS
async function postSpeed(nivel_velocidad) {
  // nivel_velocidad puede ser un número (id_velocidad) o un alias ('aumentar','reducir','normal')
  const ui = getUi();

  const aliasMap = {
    aumentar: 3,
    normal: 2,
    reducir: 1,
    aumentar_velocidad: 3,
    reducir_velocidad: 1,
  };

  let id_velocidad = null;
  if (typeof nivel_velocidad === "number") {
    id_velocidad = nivel_velocidad;
  } else if (typeof nivel_velocidad === "string") {
    const key = nivel_velocidad.toLowerCase();
    id_velocidad = aliasMap[key] || null;
  }

  // If mapping failed and we didn't receive numeric id, abort with a helpful log
  if (!id_velocidad) {
    const msg = `postSpeed: id_velocidad no determinado para "${nivel_velocidad}"`;
    logEvent({ type: "speed:error", message: msg });
    updateStatus("Velocidad inválida (ver consola)");
    return { ok: false, error: "id_velocidad requerido" };
  }

  const payload = {
    id_dispositivo: ui.deviceId,
    id_cliente: ui.clientId,
    id_velocidad: id_velocidad,
  };

  updateStatus(`Ajustando velocidad...`);

  try {
    const res = await fetch(`${BASE_URL}/api/speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "speed:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      updateStatus("Error al ajustar velocidad");
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "speed:response", ok: true, data });
    updateStatus("Velocidad ajustada ✓");
    return data;
  } catch (err) {
    logEvent({ type: "speed:error", message: err.message });
    updateStatus("Error de conexión");
    throw err;
  }
}

// Bind UI - TODOS LOS BOTONES REGISTRADOS
window.addEventListener("DOMContentLoaded", () => {
  // ========== BOTONES PRINCIPALES ==========
  // Fila 1
  document
    .getElementById("btnTurnLeft")
    .addEventListener("click", () => postMove(6)); // Vuelta izquierda
  document
    .getElementById("btnForward")
    .addEventListener("click", () => postMove(1)); // Adelante
  document
    .getElementById("btnTurnRight")
    .addEventListener("click", () => postMove(9)); // Vuelta derecha

  // Fila 2
  document
    .getElementById("btn360Left")
    .addEventListener("click", () => postMove(8)); // 360° Izquierda
  document
    .getElementById("btn90Left")
    .addEventListener("click", () => postMove(7)); // 90° Izquierda
  document
    .getElementById("btnStop")
    .addEventListener("click", () => postMove(3)); // Detener
  document
    .getElementById("btn90Right")
    .addEventListener("click", () => postMove(10)); // 90° Derecha
  document
    .getElementById("btn360Right")
    .addEventListener("click", () => postMove(11)); // 360° Derecha

  // Fila 3
  document
    .getElementById("btnLeft")
    .addEventListener("click", () => postMove(4)); // Izquierda básica
  document
    .getElementById("btnBack")
    .addEventListener("click", () => postMove(2)); // Atrás
  document
    .getElementById("btnRight")
    .addEventListener("click", () => postMove(5)); // Derecha básica

  // ========== BOTONES DE VELOCIDAD AÑADIDOS ==========
  document.getElementById("btnSpeedUp").addEventListener("click", () => {
    postSpeed("aumentar"); // O el valor que necesites para tu API
  });

  document.getElementById("btnSpeedDown").addEventListener("click", () => {
    postSpeed("reducir"); // O el valor que necesites para tu API
  });

  document.getElementById("btnSpeedNormal").addEventListener("click", () => {
    postSpeed("normal"); // O el valor que necesites para tu API
  });

  // ========== OPERACIÓN MANUAL ==========
  document.getElementById("btnSendOp").addEventListener("click", () => {
    const op = Number(document.getElementById("opId").value || 1);
    postMove(op);
  });

  // ========== OBSTÁCULO ==========
  document.getElementById("btnSendObst").addEventListener("click", () => {
    const obst = Number(document.getElementById("obstId").value || 1);
    postObstaculo(obst);
  });

  // ========== ÚLTIMO EVENTO ==========
  document.getElementById("btnGetLast").addEventListener("click", async () => {
    const id = Number(document.getElementById("lastDeviceId").value || 1);
    const out = await getLast(id);
    document.getElementById("lastOutput").textContent = JSON.stringify(
      out,
      null,
      2
    );
  });

  // ========== WEBSOCKET ==========
  document
    .getElementById("btnConnectWs")
    .addEventListener("click", () => connectWebSocket());

  // ========== BACKEND CHECK ==========
  document
    .getElementById("btnCheckBackend")
    .addEventListener("click", async () => {
      await checkBackend();
    });

  // ========== HISTORIAL ==========
  document
    .getElementById("btnLoadHistory")
    .addEventListener("click", async () => {
      const deviceId = Number(document.getElementById("deviceId").value || 1);
      const count = Number(document.getElementById("historyCount").value || 10);
      try {
        const events = await getEvents(deviceId, count);
        document.getElementById("events").innerHTML = "";
        if (!events || events.length === 0) {
          logEvent("No hay eventos recientes");
          return;
        }
        for (const ev of events) {
          logEvent({ type: "history:event", data: ev });
        }
      } catch (err) {
        logEvent({ type: "history:error", message: err.message });
      }
    });

  // ========== LIMPIAR LOG ==========
  document.getElementById("btnClearLog").addEventListener("click", () => {
    document.getElementById("events").innerHTML = "";
  });

  // ========== GENERAR SECUENCIA ==========
  document
    .getElementById("btnGenerateSeq")
    .addEventListener("click", async () => {
      const length = Number(document.getElementById("seqLength").value || 5);
      const seq = generateRandomSequence(length);
      const nombre = `Secuencia ${new Date().toLocaleTimeString()}`;

      // Mostrar secuencia generada
      document.getElementById("seqOutput").textContent = JSON.stringify(
        seq,
        null,
        2
      );
      logEvent({ type: "sequence:generated", data: seq });

      // Enviar al backend para ejecutar
      await postSequence(nombre, seq);
    });
});
// ============================================
// FUNCIÓN MEJORADA PARA ÚLTIMO EVENTO
// ============================================

// Función para formatear JSON con colores
function formatJSON(data) {
  if (!data) return "No hay datos";

  try {
    // Si ya es string, parsearlo
    const obj = typeof data === "string" ? JSON.parse(data) : data;

    // Formatear con indentación
    let formatted = JSON.stringify(obj, null, 2);

    // Añadir colores (opcional)
    formatted = formatted
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g,
        function (match) {
          let cls = "json-number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "json-key";
            } else {
              cls = "json-string";
            }
          } else if (/true|false/.test(match)) {
            cls = "json-boolean";
          } else if (/null/.test(match)) {
            cls = "json-null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      )
      .replace(/\n/g, "<br>")
      .replace(/ /g, "&nbsp;");

    return formatted;
  } catch (e) {
    // Si no es JSON válido, mostrar como texto
    return String(data);
  }
}

// Modificar la función getLast para usar mejor formato
async function getLastEnhanced(id_dispositivo) {
  try {
    const res = await fetch(`${BASE_URL}/api/last/${id_dispositivo}`);
    let data = null;

    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }

    if (!res.ok) {
      logEvent({
        type: "last:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      return { ok: false, status: res.status, body: data };
    }

    logEvent({ type: "last:response", data });

    // Mostrar en el output con formato
    const outputElement = document.getElementById("lastOutput");
    if (outputElement) {
      if (typeof data === "object" && data !== null) {
        outputElement.innerHTML = formatJSON(data);
      } else {
        outputElement.textContent = JSON.stringify(data, null, 2);
      }

      // Ajustar altura automáticamente
      setTimeout(() => {
        const contentHeight = outputElement.scrollHeight;
        const maxHeight = 300; // Altura máxima
        const newHeight = Math.min(contentHeight, maxHeight);
        outputElement.style.height = newHeight + "px";
        outputElement.style.minHeight = "150px";
        outputElement.style.maxHeight = maxHeight + "px";
      }, 10);
    }

    return data;
  } catch (err) {
    logEvent({ type: "last:error", message: err.message });
    throw err;
  }
}

// Reemplazar el event listener original del botón OBTENER ÚLTIMO
document.addEventListener("DOMContentLoaded", function () {
  // Reemplazar el event listener del botón
  const originalBtn = document.getElementById("btnGetLast");
  if (originalBtn) {
    // Clonar el botón y reemplazar para evitar duplicados
    const newBtn = originalBtn.cloneNode(true);
    originalBtn.parentNode.replaceChild(newBtn, originalBtn);

    // Asignar nuevo event listener
    newBtn.addEventListener("click", async () => {
      const id = Number(document.getElementById("lastDeviceId").value || 1);
      await getLastEnhanced(id);
    });
  }

  // Asegurar que el output display tenga suficiente altura inicial
  const lastOutput = document.getElementById("lastOutput");
  if (lastOutput) {
    lastOutput.style.minHeight = "150px";
    lastOutput.style.maxHeight = "300px";
    lastOutput.style.height = "150px";
  }
});

// Función para ajustar automáticamente la altura del output
function autoAdjustOutputHeight() {
  const outputElement = document.getElementById("lastOutput");
  if (!outputElement) return;

  const contentHeight = outputElement.scrollHeight;
  const containerHeight = outputElement.parentElement.clientHeight;
  const availableHeight = containerHeight - 100; // Dejar espacio para otros elementos

  const newHeight = Math.min(contentHeight, availableHeight, 400); // Máximo 400px
  outputElement.style.height = newHeight + "px";
}

// Ajustar al cambiar tamaño de ventana
window.addEventListener("resize", autoAdjustOutputHeight);

// Ajustar cuando se hace click en el botón
document.addEventListener("click", function (e) {
  if (e.target.id === "btnGetLast" || e.target.closest("#btnGetLast")) {
    setTimeout(autoAdjustOutputHeight, 100);
  }
});
