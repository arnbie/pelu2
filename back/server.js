const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { supabase } = require("./supabaseClient"); // 👈 NUEVO

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Servir fitxers estàtics del directori /form
app.use(express.static(path.join(__dirname, "../form")));

// 🔥 YA NO USAMOS ARRAY EN MEMORIA
// let reservations = [];
let admins = ["bieltrucharte@gmail.com"]; // 👉 Canvia això pel teu correu

// ---------------- API ----------------

// Login administrador
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (admins.includes(email)) {
    return res.json({ token: "fake-jwt-token" });
  }
  res.status(401).json({ message: "No autoritzat" });
});
// Crear reserva (versión simple con Supabase)
// Crear reserva (versión simple + debug de service)
app.post("/api/reservations", async (req, res) => {
  try {
    console.log("BODY RECIBIDO EN /api/reservations:", req.body);

    const {
      firstName,
      lastName,
      email,
      date,
      time,
      service,
      selectedService,
      serviceType,
      phone,
    } = req.body || {};

    // Intentamos deducir el campo de servicio según cómo lo mande el front
    const finalService = service || selectedService || serviceType;

    if (!firstName || !lastName || !email || !date || !time || !finalService) {
      return res.status(400).json({ message: "Dades incompletes" });
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          email: email,
          date: date,
          time: time,
          service: finalService,
          status: "pending",
          // si quieres guardar phone, añade la columna en la tabla y descomenta esto
          // phone: phone || null,
        },
      ])
      .single();

    if (error) {
      console.error("Error Supabase insert:", error);
      return res.status(500).json({ message: "Error guardant la reserva" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error servidor POST /api/reservations:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});


// Obtenir reserves
app.get("/api/reservations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "pending")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("Error Supabase select:", error);
      return res.status(500).json({ message: "Error obtenint reserves" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error servidor GET /api/reservations:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// Actualitzar estat reserva
app.put("/api/reservations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error Supabase update:", error);
      return res.status(500).json({ message: "Error actualitzant reserva" });
    }

    if (!data) {
      return res.status(404).json({ message: "No trobat" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error servidor PUT /api/reservations/:id:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// Esborrar totes les reserves
app.delete("/api/reservations", async (req, res) => {
  try {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .not("id", "is", null); // borra todas

    if (error) {
      console.error("Error Supabase delete:", error);
      return res.status(500).json({ message: "Error eliminant reserves" });
    }

    res.json({ message: "Totes les reserves esborrades" });
  } catch (err) {
    console.error("Error servidor DELETE /api/reservations:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// Hores ocupades per data
app.get("/api/bookings", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.json({ reservedTimes: [] });

    const { data, error } = await supabase
      .from("reservations")
      .select("time, status")
      .eq("status", "pending")
      .eq("date", date)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error Supabase bookings:", error);
      return res.status(500).json({ message: "Error obtenint bookings" });
    }

    const reservedTimes = (data || []).map((r) => r.time);
    res.json({ reservedTimes });
  } catch (err) {
    console.error("Error servidor GET /api/bookings:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Servidor actiu a http://localhost:${PORT}`);
});
