// Monitor app JS: fetches history and connects to WS
const BASE_URL = "http://52.4.229.72:5500";
function wsProto() {
  if (location.protocol === "https:") return "wss";
  return "ws";
}
const WS_URL = `${wsProto()}://52.4.229.72:5500/ws/monitor`;

function renderEvent(ev) {
  const container = document.getElementById("events");
  const item = document.createElement("div");
  item.className = "list-group-item";
  const time = ev.fecha_hora
    ? new Date(ev.fecha_hora).toLocaleString()
    : new Date().toLocaleString();
  item.innerHTML = `<div class="fw-bold">#${ev.id_evento || "-"} — ${time}</div>
    <div>device: ${ev.id_dispositivo || "-"} — client: ${
    ev.id_cliente || "-"
  }</div>
    <div>operacion: ${ev.id_operacion || "-"} — obstaculo: ${
    ev.id_obstaculo || "-"
  }</div>`;
  container.prepend(item);
}

async function loadHistory() {
  const id = Number(document.getElementById("deviceId").value || 1);
  const n = Number(document.getElementById("limitInput").value || 10);
  try {
    const res = await fetch(`${BASE_URL}/api/events/${id}?n=${n}`);
    if (!res.ok) {
      const txt = await res.text().catch(() => null);
      alert("Error fetching events: " + res.status + " " + txt);
      return;
    }
    const list = await res.json();
    const container = document.getElementById("events");
    container.innerHTML = "";
    // list is expected ordered desc (most recent first); show in that order
    for (const ev of list) renderEvent(ev);
    // update lastUpdated indicator
    const now = new Date().toLocaleTimeString();
    const lastEl = document.getElementById("lastUpdated");
    if (lastEl) lastEl.textContent = `Última actualización: ${now}`;
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

let ws = null;
function connectWs() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    document.getElementById("btnToggleWs").textContent =
      "Desconectar WebSocket";
    console.info("WS open");
  };
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      // If broadcast payload contains evento, render it
      if (data.evento) renderEvent(data.evento);
      else
        renderEvent({
          id_evento: "-",
          fecha_hora: new Date().toISOString(),
          id_dispositivo: "-",
          id_cliente: "-",
          id_operacion: "-",
          id_obstaculo: "-",
        });
    } catch (e) {
      console.warn("Non-json ws message", ev.data);
    }
  };
  ws.onerror = (e) => {
    console.error("WS error", e);
    alert("WebSocket error (ver consola)");
  };
  ws.onclose = (ev) => {
    document.getElementById("btnToggleWs").textContent = "Conectar WebSocket";
    console.info("WS closed", ev.code, ev.reason);
  };
}

function disconnectWs() {
  if (!ws) return;
  try {
    ws.close(1000, "client");
  } catch (_) {}
  ws = null;
}

// Auto-refresh (polling)
let autoRefresh = false;
let autoInterval = null;
function startAutoRefresh() {
  if (autoInterval) return;
  autoInterval = setInterval(() => {
    loadHistory();
  }, 5000); // every 5s
  autoRefresh = true;
  const btn = document.getElementById("btnAutoToggle");
  if (btn) btn.textContent = "Auto-refresco: ON";
}
function stopAutoRefresh() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = null;
  autoRefresh = false;
  const btn = document.getElementById("btnAutoToggle");
  if (btn) btn.textContent = "Auto-refresco: OFF";
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLoad").addEventListener("click", loadHistory);
  document.getElementById("btnClear").addEventListener("click", () => {
    document.getElementById("events").innerHTML = "";
  });
  document.getElementById("btnToggleWs").addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) disconnectWs();
    else connectWs();
  });
  document.getElementById("btnAutoToggle").addEventListener("click", () => {
    if (autoRefresh) stopAutoRefresh();
    else startAutoRefresh();
  });
  // optional: auto-load on open
  loadHistory();
});
