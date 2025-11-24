const apiBase = "http://localhost:3000/api";
let token = null;
let allReservations = [];
let selectedDate = null;

// --- LOGIN ---
document.getElementById('btnAdminLogin').addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value.trim();
  if (!email) return alert('Introdueix el correu admin');

  try {
    const r = await fetch(apiBase + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const j = await r.json();
    if (r.ok) {
      token = j.token;
      await loadReservations();
      renderCalendar();
      highlightToday(); // 🔹 Ressalta el dia actual
      setInterval(loadReservations, 5000); // 🔹 recàrrega automàtica
      document.getElementById('salesCount').addEventListener('click', showCompletedModal);
    } else alert(j.message || "No autoritzat");
  } catch {
    alert("Error al connectar");
  }
});

// --- CÀRREGA DE RESERVES ---
async function loadReservations() {
  if (!token) return;
  const res = await fetch(apiBase + "/reservations", {
    headers: { "Authorization": "Bearer " + token }
  });
  allReservations = await res.json();
  updateStats();
  renderTable(selectedDate);
  updateCalendarBadges(); // 🔹 Actualitza badges del calendari automàticament
}

// --- TAULA DE RESERVES ---
function renderTable(filterDate = null) {
  const tbody = document.querySelector('#reservationsTable tbody');
  tbody.innerHTML = '';

  const data = allReservations.filter(r => {
    if (r.status === 'cancelled' || r.status === 'completed') return false;
    return !filterDate || r.date === filterDate;
  });

  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.firstName || "")} ${escapeHtml(r.lastName || "")}</td>
      <td>${escapeHtml(r.email || "")}<br><small>${escapeHtml(r.phone || "")}</small></td>
      <td>${escapeHtml(r.date || "")} ${escapeHtml(r.time || "")}</td>
      <td>${escapeHtml(r.service || "")}</td>
      <td><span class="status ${escapeHtml(r.status || "")}">${escapeHtml(r.status || "")}</span></td>
      <td><button class="btn-small confirm">Acabar</button></td>
    `;
    tbody.appendChild(tr);
    tr.querySelector(".btn-small.confirm").addEventListener("click", () => completeReservation(r.id, tr));
  });
}

// --- COMPLETAR RESERVA ---
async function completeReservation(id, tr) {
  await fetch(apiBase + "/reservations/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify({ status: "completed" })
  });
  tr.remove();
  updateStats();
  updateCalendarBadges(); // 🔹 refresca badges si s’acaba una reserva
}

// --- ESTADÍSTIQUES ---
function updateStats() {
  document.getElementById('totalCount').textContent = allReservations.length;
  document.getElementById('pendingCount').textContent = allReservations.filter(r => r.status === 'pending').length;
  document.getElementById('confirmedCount').textContent = allReservations.filter(r => r.status === 'confirmed').length;
  document.getElementById('salesCount').textContent =
    (allReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length * 25) + " €";
}

// --- ESCAPE HTML ---
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- MODAL COMPLETED ---
const modal = document.getElementById("completedModal");
const spanClose = modal.querySelector(".close");

async function showCompletedModal() {
  const completed = allReservations.filter(r => r.status === "completed");
  const list = document.getElementById('completedList');
  list.innerHTML = '';
  if (completed.length === 0) list.textContent = "No hi ha reserves completades.";
  else completed.forEach(r => {
    const div = document.createElement('div');
    div.className = "completed-item";
    div.textContent = `${r.firstName} ${r.lastName} - ${r.date} ${r.time} - ${r.service}`;
    list.appendChild(div);
  });
  modal.style.display = "block";
}
spanClose.onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target == modal) modal.style.display = "none"; };

// --- 📅 CALENDARI ---
function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const totalDays = lastDay.getDate();

  const header = document.createElement('div');
  header.className = 'calendar-header';
  header.textContent = today.toLocaleString('ca-ES', { month: 'long', year: 'numeric' });
  calendar.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  calendar.appendChild(grid);

  const days = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
  days.forEach(d => {
    const el = document.createElement('div');
    el.className = 'day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  for (let i = 1; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.textContent = d;

    const count = allReservations.filter(r => r.date === dateStr && r.status !== "cancelled").length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = count;
      dayEl.appendChild(badge);
    }

    dayEl.addEventListener('click', () => {
      selectedDate = dateStr;
      renderTable(selectedDate);
      document.querySelectorAll('.calendar-grid .day').forEach(el => el.classList.remove('selected'));
      dayEl.classList.add('selected');
    });

    grid.appendChild(dayEl);
  }
}

// --- 🌟 RESSALTA DIA D'AVUI ---
function highlightToday() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  selectedDate = todayStr;
  renderTable(selectedDate);

  const allDays = document.querySelectorAll('.calendar-grid .day');
  allDays.forEach(el => {
    const dayNum = el.textContent.trim();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    if (dateStr === todayStr) el.classList.add('selected');
  });
}

// --- 🔹 ACTUALITZACIÓ AUTOMÀTICA BADGES ---
function updateCalendarBadges() {
  const allDays = document.querySelectorAll('.calendar-grid .day');
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  allDays.forEach(el => {
    const dayNum = el.textContent.trim();
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const count = allReservations.filter(r => r.date === dateStr && r.status !== "cancelled").length;

    const oldBadge = el.querySelector('.badge');
    if (oldBadge) oldBadge.remove();

    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = count;
      el.appendChild(badge);
    }
  });
}
