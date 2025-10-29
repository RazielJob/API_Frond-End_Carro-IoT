// Monitor app JS: fetches history and connects to WS
const BASE_URL = "http://52.4.229.72:5500";

function wsProto() {
  if (location.protocol === "https:") return "wss";
  return "ws";
}

const WS_URL = `${wsProto()}://52.4.229.72:5500/ws/monitor`;

// Contador de eventos para el badge
let eventCount = 0;

function updateEventCount() {
  const badge = document.getElementById("eventCount");
  if (badge) {
    badge.textContent = `${eventCount} evento${eventCount !== 1 ? "s" : ""}`;
  }
}

function renderEvent(ev) {
  const container = document.getElementById("events");

  // Remover mensaje de "sin eventos" si existe
  const emptyState = container.querySelector(".text-center.text-muted");
  if (emptyState) {
    emptyState.remove();
  }

  const item = document.createElement("div");
  item.className = "list-group-item new-event";

  const time = ev.fecha_hora
    ? new Date(ev.fecha_hora).toLocaleString()
    : new Date().toLocaleString();

  // Generar emoji según tipo de operación (opcional)
  const getOperationEmoji = (opId) => {
    const emojiMap = {
      1: "⬆️",
      2: "⬇️",
      3: "⏹️",
      4: "⬅️",
      5: "➡️",
      6: "↩️",
      7: "↖️",
      8: "🔄",
      9: "↪️",
      10: "↗️",
      11: "🔁",
    };
    return emojiMap[opId] || "🔵";
  };

  const emoji = getOperationEmoji(ev.id_operacion);

  item.innerHTML = `
    <div class="fw-bold">
      ${emoji} #${ev.id_evento || "-"} — ${time}
    </div>
    <div>
      <span class="badge bg-info me-1">Device: ${
        ev.id_dispositivo || "-"
      }</span>
      <span class="badge bg-secondary">Client: ${ev.id_cliente || "-"}</span>
    </div>
    <div class="mt-1">
      Operación: <strong>${ev.id_operacion || "-"}</strong> | 
      Obstáculo: <strong>${ev.id_obstaculo || "-"}</strong>
    </div>
  `;

  container.prepend(item);
  eventCount++;
  updateEventCount();
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
    eventCount = 0;

    // Si no hay eventos, mostrar mensaje
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="list-group-item text-center text-muted py-5">
          <div class="mb-2">📭</div>
          <small>No se encontraron eventos para este dispositivo.</small>
        </div>
      `;
      updateEventCount();
      return;
    }

    // list is expected ordered desc (most recent first); show in that order
    for (const ev of list) {
      renderEvent(ev);
    }

    // Update lastUpdated indicator
    const now = new Date().toLocaleTimeString();
    const lastEl = document.getElementById("lastUpdated");
    if (lastEl) {
      lastEl.textContent = `Última actualización: ${now}`;
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

// WebSocket management
let ws = null;

function updateWsStatus(connected) {
  const badge = document.getElementById("wsStatusBadge");
  if (badge) {
    badge.className = connected ? "badge bg-success" : "badge bg-secondary";
    badge.textContent = connected ? "WebSocket ✓" : "WebSocket ✗";
  }
}

function connectWs() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    document.getElementById("btnToggleWs").textContent =
      "🔌 Desconectar WebSocket";
    document.getElementById("btnToggleWs").classList.remove("btn-success");
    document.getElementById("btnToggleWs").classList.add("btn-warning");
    updateWsStatus(true);
    console.info("WS open");
  };

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      // If broadcast payload contains evento, render it
      if (data.evento) {
        renderEvent(data.evento);
      } else {
        renderEvent({
          id_evento: "-",
          fecha_hora: new Date().toISOString(),
          id_dispositivo: "-",
          id_cliente: "-",
          id_operacion: "-",
          id_obstaculo: "-",
        });
      }
    } catch (e) {
      console.warn("Non-json ws message", ev.data);
    }
  };

  ws.onerror = (e) => {
    console.error("WS error", e);
    alert("WebSocket error (ver consola)");
  };

  ws.onclose = (ev) => {
    document.getElementById("btnToggleWs").textContent =
      "🔌 Conectar WebSocket";
    document.getElementById("btnToggleWs").classList.remove("btn-warning");
    document.getElementById("btnToggleWs").classList.add("btn-success");
    updateWsStatus(false);
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

function updateAutoStatus() {
  const statusEl = document.getElementById("autoStatus");
  if (statusEl) {
    statusEl.textContent = autoRefresh ? "Activado (cada 5s)" : "Desactivado";
  }
}

function startAutoRefresh() {
  if (autoInterval) return;

  autoInterval = setInterval(() => {
    loadHistory();
  }, 5000); // every 5s

  autoRefresh = true;

  const btn = document.getElementById("btnAutoToggle");
  if (btn) {
    btn.textContent = "⏱️ Auto-refresco: ON";
    btn.classList.remove("btn-outline-info");
    btn.classList.add("btn-info");
  }

  updateAutoStatus();
}

function stopAutoRefresh() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = null;
  autoRefresh = false;

  const btn = document.getElementById("btnAutoToggle");
  if (btn) {
    btn.textContent = "⏱️ Auto-refresco: OFF";
    btn.classList.remove("btn-info");
    btn.classList.add("btn-outline-info");
  }

  updateAutoStatus();
}

// Event bindings
window.addEventListener("DOMContentLoaded", () => {
  // Cargar historial
  document.getElementById("btnLoad").addEventListener("click", loadHistory);

  // Limpiar lista
  document.getElementById("btnClear").addEventListener("click", () => {
    document.getElementById("events").innerHTML = `
      <div class="list-group-item text-center text-muted py-5">
        <div class="mb-2">📭</div>
        <small>Lista limpiada. Presiona "Cargar Historial" para ver eventos.</small>
      </div>
    `;
    eventCount = 0;
    updateEventCount();
  });

  // Toggle WebSocket
  document.getElementById("btnToggleWs").addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      disconnectWs();
    } else {
      connectWs();
    }
  });

  // Toggle auto-refresh
  document.getElementById("btnAutoToggle").addEventListener("click", () => {
    if (autoRefresh) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  });

  // Optional: auto-load on open
  loadHistory();
});
