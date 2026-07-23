/* =========================================================
   LA SALA CHESTER — Calendario de disponibilidad y reservas
   ---------------------------------------------------------
   MODO DEMO: todo vive en memoria (array RESERVATIONS) para
   que puedas probar el flujo completo ahora mismo. Al recargar
   la página se reinicia a los datos de ejemplo.

   PARA PRODUCCIÓN: pon tu URL de Google Apps Script en
   CONFIG.BACKEND_URL (ver /backend/README-backend.md) y las
   funciones apiListReservations / apiCreateReservation /
   apiUpdateReservation harán fetch() de verdad en vez de
   tocar el array local. El resto del código no cambia.
   ========================================================= */

const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbyp3NLK61ztPPDq_c_cg2NizDZVsPjkYrDl3xD-Z1t_hIfQyZTdul_hJ4-XZZreS2uaQw/exec", // <-- pega aquí la URL del Web App de Apps Script cuando la tengas
  ADMIN_PIN: "1216", // PIN de demo. En producción la confirmación se hace desde el backend, no aquí.
  OWNER_WHATSAPP: "34629733085",
  OPEN_HOUR: 9,
};

const TURNOS = [
  { key: "manana", label: "Mañana" },
  { key: "tarde", label: "Tarde" },
  { key: "dia", label: "Día completo" },
];

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS_SEMANA = ["L","M","X","J","V","S","D"];

function pad(n){ return n.toString().padStart(2,"0"); }
function dateKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayKey(){ const t=new Date(); return dateKey(t.getFullYear(), t.getMonth(), t.getDate()); }

/* ---------- datos de ejemplo (modo demo) ---------- */
let RESERVATIONS = [];

function seedDemoData(){
  const now = new Date();
  const mk = (offsetDays, turno, status, nombre, tipo) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      date: dateKey(d.getFullYear(), d.getMonth(), d.getDate()),
      turno, status, nombre, tipo,
      email: "-", telefono: "-", personas: "-", mensaje: "",
      createdAt: new Date().toISOString(),
    };
  };
  RESERVATIONS = [
    mk(3, "dia", "confirmada", "Marta (comunión)", "Celebración familiar"),
    mk(6, "tarde", "pendiente", "Estudio Vela Consulting", "Reunión de empresa"),
    mk(9, "manana", "pendiente", "Colectivo Dansa Roja", "Formación / taller"),
    mk(13, "dia", "confirmada", "Cumpleaños de Iris", "Cumpleaños"),
  ];
}
seedDemoData();

/* ---------- capa de datos (demo <-> backend real) ---------- */
// Guardamos en memoria la última lista traída del servidor. Así, pulsar
// días o franjas es instantáneo: solo volvemos a preguntar al backend
// (que es lento) cuando de verdad cambia algo — al crear, confirmar o
// rechazar una reserva, pasando forceRefresh = true.
let _reservationsCache = null;

async function apiListReservations(forceRefresh = false){
  if (CONFIG.BACKEND_URL){
    if (_reservationsCache && !forceRefresh){
      return _reservationsCache;
    }
    const res = await fetch(`${CONFIG.BACKEND_URL}?action=list`);
    _reservationsCache = await res.json();
    return _reservationsCache;
  }
  return RESERVATIONS;
}

async function apiCreateReservation(payload){
  if (CONFIG.BACKEND_URL){
    const res = await fetch(CONFIG.BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "create", ...payload }),
    });
    return await res.json();
  }
  const record = { id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), status: "pendiente", createdAt: new Date().toISOString(), ...payload };
  RESERVATIONS.push(record);
  return { ok: true, record };
}

async function apiUpdateReservation(id, status){
  if (CONFIG.BACKEND_URL){
    const res = await fetch(CONFIG.BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "update", id, status }),
    });
    return await res.json();
  }
  if (status === "rechazada"){
    RESERVATIONS = RESERVATIONS.filter(r => r.id !== id);
  } else {
    const r = RESERVATIONS.find(r => r.id === id);
    if (r) r.status = status;
  }
  return { ok: true };
}

/* ---------- estado de UI ---------- */
let viewYear, viewMonth;
let selected = { date: null, turno: null };

const today = new Date();
viewYear = today.getFullYear();
viewMonth = today.getMonth();

function slotStatus(list, dateStr, turnoKey){
  const diaBooking = list.find(r => r.date === dateStr && r.turno === "dia");
  if (diaBooking) return diaBooking.status; // dia bloquea todo
  const specific = list.find(r => r.date === dateStr && r.turno === turnoKey);
  if (specific) return specific.status;
  if (turnoKey === "dia"){
    const m = list.find(r => r.date === dateStr && r.turno === "manana");
    const t = list.find(r => r.date === dateStr && r.turno === "tarde");
    if (m && t) return (m.status === "confirmada" && t.status === "confirmada") ? "confirmada" : "pendiente";
  }
  return "libre";
}

async function renderCalendar(){
  const list = await apiListReservations();
  const grid = document.getElementById("calGrid");
  const label = document.getElementById("calLabel");
  label.textContent = `${MESES[viewMonth]} ${viewYear}`;
  grid.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1);
  let startOffset = firstDay.getDay() - 1; // lunes=0
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tKey = todayKey();

  for (let i = 0; i < startOffset; i++){
    const empty = document.createElement("div");
    empty.className = "cal-day is-empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++){
    const dStr = dateKey(viewYear, viewMonth, d);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-day";
    const isPast = dStr < tKey;
    if (isPast) cell.classList.add("is-past");
    if (dStr === tKey) cell.classList.add("is-today");
    if (selected.date === dStr) cell.classList.add("is-selected");

    const num = document.createElement("span");
    num.className = "daynum";
    num.textContent = d;
    cell.appendChild(num);

    const dots = document.createElement("span");
    dots.className = "cal-dots";
    TURNOS.forEach(t => {
      const st = slotStatus(list, dStr, t.key);
      const dot = document.createElement("span");
      dot.className = `dot ${st === "libre" ? "free" : st === "pendiente" ? "pending" : "confirmed"}`;
      dots.appendChild(dot);
    });
    cell.appendChild(dots);

    if (!isPast){
      cell.addEventListener("click", () => selectDay(dStr));
    }
    grid.appendChild(cell);
  }
}

async function selectDay(dStr){
  selected.date = dStr;
  selected.turno = null;
  await renderCalendar();
  await renderSlotPanel();
}

async function renderSlotPanel(){
  const panel = document.getElementById("slotPanel");
  const formCard = document.getElementById("formCard");
  if (!selected.date){
    panel.style.display = "none";
    formCard.style.display = "none";
    return;
  }
  panel.style.display = "block";
  const list = await apiListReservations();
  const [y,m,d] = selected.date.split("-").map(Number);
  const niceDate = new Date(y, m-1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("slotDateLabel").textContent = niceDate;

  const opts = document.getElementById("slotOptions");
  opts.innerHTML = "";
  TURNOS.forEach(t => {
    const st = slotStatus(list, selected.date, t.key);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `slot-btn status-${st === "libre" ? "free" : st === "pendiente" ? "pending" : "confirmed"}`;
    if (selected.turno === t.key) btn.classList.add("is-active");
    btn.innerHTML = `<b>${t.label}</b><span class="slot-status">${st === "libre" ? "Libre" : st === "pendiente" ? "Pendiente de confirmar" : "Confirmado"}</span>`;
    if (st === "libre"){
      btn.addEventListener("click", () => {
        selected.turno = t.key;
        renderSlotPanel();
      });
    } else {
      btn.disabled = true;
    }
    opts.appendChild(btn);
  });

  const formCardEl = document.getElementById("formCard");
  if (selected.turno){
    formCardEl.style.display = "block";
    const turnoLabel = TURNOS.find(t => t.key === selected.turno).label;
    document.getElementById("selectedSummary").textContent = `${niceDate} · ${turnoLabel}`;
  } else {
    formCardEl.style.display = "none";
  }
}

function changeMonth(delta){
  viewMonth += delta;
  if (viewMonth < 0){ viewMonth = 11; viewYear--; }
  if (viewMonth > 11){ viewMonth = 0; viewYear++; }
  renderCalendar();
}

/* ---------- formulario de reserva ---------- */
function wireForm(){
  const form = document.getElementById("bookingForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById("formMsg");
    msgBox.className = "form-msg";
    if (!selected.date || !selected.turno){
      msgBox.textContent = "Elige primero un día y un turno en el calendario.";
      msgBox.classList.add("show","err");
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.nombre || !data.telefono){
      msgBox.textContent = "Necesitamos al menos tu nombre y un teléfono de contacto.";
      msgBox.classList.add("show","err");
      return;
    }
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";

    const payload = {
      date: selected.date,
      turno: selected.turno,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      tipo: data.tipo,
      personas: data.personas,
      mensaje: data.mensaje,
    };
    await apiCreateReservation(payload);

    msgBox.textContent = "Solicitud enviada. Queda marcada como “reservado sin confirmar” — te escribimos por WhatsApp o email en cuanto lo revisemos para confirmarla.";
    msgBox.classList.add("show","ok");
    submitBtn.disabled = false;
    submitBtn.textContent = "Solicitar esta reserva";
    form.reset();
    selected.turno = null;
    await apiListReservations(true); // refrescar caché: acabamos de crear una reserva
    await renderCalendar();
    await renderSlotPanel();
    await renderAdmin();
  });
}

/* ---------- panel del propietario (demo) ---------- */
let adminUnlocked = false;

function wireAdmin(){
  const toggle = document.getElementById("adminToggle");
  const panel = document.getElementById("adminPanel");
  toggle.addEventListener("click", () => {
    if (!adminUnlocked){
      const pin = prompt("PIN de acceso del propietario (demo):");
      if (pin !== CONFIG.ADMIN_PIN){
        if (pin !== null) alert("PIN incorrecto.");
        return;
      }
      adminUnlocked = true;
    }
    panel.classList.toggle("show");
    if (panel.classList.contains("show")){
      apiListReservations(true).then(renderAdmin); // datos frescos al abrir el panel
    }
  });
}

async function renderAdmin(){
  const panel = document.getElementById("adminPanel");
  if (!panel.classList.contains("show")) return;
  const list = await apiListReservations();
  const body = document.getElementById("adminList");
  body.innerHTML = "";

  // Botón para traer del servidor las reservas nuevas que hayan entrado
  // mientras tenías la web abierta (la lista está cacheada para ir rápido).
  const refreshBar = document.createElement("div");
  refreshBar.style.cssText = "display:flex;justify-content:flex-end;margin-bottom:12px;";
  refreshBar.innerHTML = `<button class="btn btn-ghost btn-sm" id="adminRefresh" style="border-color:rgba(251,248,241,.5);color:#fff;">↻ Actualizar</button>`;
  body.appendChild(refreshBar);
  refreshBar.querySelector("#adminRefresh").addEventListener("click", async () => {
    await apiListReservations(true);
    await renderAdmin();
    await renderCalendar();
    await renderSlotPanel();
  });

  const sorted = [...list].sort((a,b) => a.date.localeCompare(b.date));
  if (sorted.length === 0){
    body.insertAdjacentHTML("beforeend", `<p class="admin-empty">No hay solicitudes todavía.</p>`);
    return;
  }
  sorted.forEach(r => {
    const [y,m,d] = r.date.split("-").map(Number);
    const niceDate = new Date(y, m-1, d).toLocaleDateString("es-ES", { day:"2-digit", month:"short", year:"numeric" });
    const turnoLabel = TURNOS.find(t => t.key === r.turno)?.label || r.turno;
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <div class="who">${r.nombre || "—"} <span class="pill ${r.status === "confirmada" ? "confirmed" : "pending"}">${r.status}</span></div>
        <div class="meta">${niceDate} · ${turnoLabel} · ${r.tipo || "—"} · ${r.telefono || r.email || ""}</div>
      </div>
      <div class="admin-actions">
        ${r.status !== "confirmada" ? `<button class="btn btn-brass btn-sm" data-act="confirmar" data-id="${r.id}">Confirmar</button>` : ""}
        <button class="btn btn-ghost btn-sm" data-act="rechazar" data-id="${r.id}" style="border-color:rgba(251,248,241,.5); color:#fff;">Rechazar</button>
      </div>`;
    body.appendChild(row);
  });

  body.querySelectorAll("button[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      await apiUpdateReservation(id, act === "confirmar" ? "confirmada" : "rechazada");
      await apiListReservations(true); // refrescar caché: acabamos de cambiar una reserva
      await renderAdmin();
      await renderCalendar();
      await renderSlotPanel();
    });
  });
}

/* ---------- nav móvil ---------- */
function wireNav(){
  const burger = document.getElementById("navBurger");
  const links = document.getElementById("navLinks");
  burger.addEventListener("click", () => links.classList.toggle("mobile-open"));
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("mobile-open")));
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("calPrev").addEventListener("click", () => changeMonth(-1));
  document.getElementById("calNext").addEventListener("click", () => changeMonth(1));
  renderCalendar();
  renderSlotPanel();
  wireForm();
  wireAdmin();
  wireNav();

  const waLink = document.querySelectorAll("[data-wa]");
  waLink.forEach(el => {
    el.href = `https://wa.me/${CONFIG.OWNER_WHATSAPP}?text=${encodeURIComponent("Hola, quiero consultar disponibilidad en La Sala Chester")}`;
  });
});
