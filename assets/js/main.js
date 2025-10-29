// Frontend logic for IoT control and monitoring
// Adjust BASE_URL and WS_URL if your backend uses a different host/port.
const BASE_URL = "http://52.4.229.72:5500";
const WS_URL = "ws://52.4.229.72:5500/ws/monitor";

// Helper to read UI values
function getUi() {
  return {
    deviceId: Number(document.getElementById("deviceId").value || 1),
    clientId: Number(document.getElementById("clientId").value || 1),
    // API key removed for demo
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

async function postMove(id_operacion, id_obstaculo = null) {
  const ui = getUi();
  const payload = {
    id_dispositivo: ui.deviceId,
    id_cliente: ui.clientId,
    id_operacion,
    id_obstaculo,
  };
  try {
    const res = await fetch(`${BASE_URL}/api/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // body may be empty or non-json
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      logEvent({
        type: "move:error",
        status: res.status,
        statusText: res.statusText,
        body: data,
      });
      return { ok: false, status: res.status, body: data };
    }
    logEvent({ type: "move:response", ok: true, data });
    return data;
  } catch (err) {
    logEvent({ type: "move:error", message: err.message });
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
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
    } catch (e) {
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

// Simple health check to verify backend reachability
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
    } catch (err) {
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

// Bind UI
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btnForward")
    .addEventListener("click", () => postMove(1));
  document
    .getElementById("btnBack")
    .addEventListener("click", () => postMove(2));
  document
    .getElementById("btnLeft")
    .addEventListener("click", () => postMove(4));
  document
    .getElementById("btnRight")
    .addEventListener("click", () => postMove(5));
  document
    .getElementById("btnStop")
    .addEventListener("click", () => postMove(3));

  document.getElementById("btnSendOp").addEventListener("click", () => {
    const op = Number(document.getElementById("opId").value || 1);
    postMove(op);
  });

  document.getElementById("btnSendObst").addEventListener("click", () => {
    const obst = Number(document.getElementById("obstId").value || 1);
    postObstaculo(obst);
  });

  document.getElementById("btnGetLast").addEventListener("click", async () => {
    const id = Number(document.getElementById("lastDeviceId").value || 1);
    const out = await getLast(id);
    document.getElementById("lastOutput").textContent = JSON.stringify(
      out,
      null,
      2
    );
  });

  document
    .getElementById("btnConnectWs")
    .addEventListener("click", () => connectWebSocket());
  document
    .getElementById("btnCheckBackend")
    .addEventListener("click", async () => {
      await checkBackend();
    });
  document
    .getElementById("btnLoadHistory")
    .addEventListener("click", async () => {
      const deviceId = Number(document.getElementById("deviceId").value || 1);
      const count = Number(document.getElementById("historyCount").value || 10);
      try {
        const events = await getEvents(deviceId, count);
        // show history in the events pane
        document.getElementById("events").innerHTML = "";
        if (!events || events.length === 0) {
          logEvent("No hay eventos recientes");
          return;
        }
        // events come ordered desc by fecha_hora in backend (most recent first)
        for (const ev of events) {
          logEvent({ type: "history:event", data: ev });
        }
      } catch (err) {
        logEvent({ type: "history:error", message: err.message });
      }
    });
  document.getElementById("btnClearLog").addEventListener("click", () => {
    document.getElementById("events").innerHTML = "";
  });

  // optional: attempt auto-connect
  // connectWebSocket();
});
