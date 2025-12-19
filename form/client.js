const apiBase = "http://localhost:3000/api";

document.getElementById('reserveForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    firstName: form.firstName.value.trim(),
    lastName: form.lastName.value.trim(),
    email: form.email.value.trim(),
    phone: (form.prefix.value || "") + " " + form.phone.value.trim(),
    service: form.service.value,
    date: form.date.value,
    time: form.time.value,
    notes: form.notes ? form.notes.value.trim() : "",
    status: "pending"
  };

  try {
    const res = await fetch(apiBase + "/reservations", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Error");
    addChatBotMessage(`Reserva rebuda. Hem enviat confirmació a ${data.email}.`);
    form.reset();
  } catch (err) {
    addChatBotMessage(err.message || "Error enviant la reserva.");
  }
});

function generarHores(startHour = 9, endHour = 22, interval = 30) {
  const hores = [];
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  while (currentMinutes <= endMinutes) {
    const hh = String(Math.floor(currentMinutes / 60)).padStart(2, "0");
    const mm = String(currentMinutes % 60).padStart(2, "0");
    hores.push(`${hh}:${mm}`);
    currentMinutes += interval;
  }
  return hores;
}

document.getElementById("date").addEventListener("change", async (e) => {
  const date = e.target.value;
  console.log("📅 Fecha seleccionada:", date);
  
  const selectHora = document.getElementById("time");
  selectHora.innerHTML = "<option value=''>Selecciona hora</option>";
  
  if (!date) return;
  
  let ocupades = [];
  try {
    const url = `${apiBase}/bookings?date=${date}`;
    console.log("🔗 URL fetch:", url);
    
    const res = await fetch(url);
    console.log("📡 Response status:", res.status);
    
    const data = await res.json();
    console.log("📦 Data recibida:", data);
    
    ocupades = data.reservedTimes || [];
    console.log("🚫 Horas ocupadas:", ocupades);
  } catch (err) {
    console.error("❌ Error carregant hores:", err);
  }
  
  const hores = generarHores(9, 22, 30);
  console.log("⏰ Horas generadas:", hores);
  console.log("📊 Total horas generadas:", hores.length);
  
  hores.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = ocupades.includes(h) ? `${h} (ocupada)` : h;
    if (ocupades.includes(h)) opt.disabled = true;
    selectHora.appendChild(opt);
  });
  
  console.log("✅ Options añadidas al select:", selectHora.children.length);
});
function addChatBotMessage(text){
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const el = document.createElement('div');
  el.className = 'bot-message';
  el.textContent = text;
  win.appendChild(el);
  win.scrollTop = win.scrollHeight;
}



