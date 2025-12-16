const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const bcrypt = require("bcryptjs"); // ✅ usa bcryptjs
const { supabase } = require("./supabaseClient");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Servir fitxers estàtics del directori /form
app.use(express.static(path.join(__dirname, "../form")));

// ---------------- API ----------------

// ---------------- AUTH ----------------

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("BODY RECIBIDO EN /api/auth/register:", req.body);

    const { name, surname, email, phone, password } = req.body || {};
    if (!name || !surname || !email || !phone || !password) {
      return res.status(400).json({ message: "Falten camps" });
    }

    // (opcional pero útil) evitar duplicados
    const { data: existing, error: errExisting } = await supabase
      .from("Usuaris")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (errExisting) {
      console.error("Error Supabase select (register existing):", errExisting);
      return res.status(500).json({ message: "Error intern del servidor" });
    }

    if (existing) {
      return res.status(409).json({ message: "Aquest correu ja està registrat" });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from("Usuaris")
      .insert([
        {
          nom: name,
          cognom: surname,
          email: email,
          telefon: phone,
          password: passwordHash,
          admin: false, // ✅ por defecto NO admin
          created_at: new Date().toISOString(),
        },
      ])
      .single();

    if (error) {
      console.error("Error Supabase insert (register):", error);
      return res.status(500).json({ message: "Error registrant l'usuari" });
    }

    // Por seguridad, no devuelvas el hash
    if (data?.password) delete data.password;

    return res.json(data);
  } catch (err) {
    console.error("Error servidor POST /api/auth/register:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("BODY RECIBIDO EN /api/auth/login:", req.body);

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Falten camps" });
    }

    const { data: user, error } = await supabase
      .from("Usuaris")
      .select("id, email, password, admin")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.error("Error Supabase select (login):", error);
      return res.status(401).json({ message: "Credencials incorrectes" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Credencials incorrectes" });
    }

    return res.json({
      token: "fake-jwt-token", // luego lo hacemos JWT
      user: {
        id: user.id,
        email: user.email,
        admin: !!user.admin,
      },
    });
  } catch (err) {
    console.error("Error servidor POST /api/auth/login:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
});

// ---------------- RESERVATIONS ----------------

// Crear reserva
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
//Saber si admin
// Saber si admin
app.get("/api/isAdmin/:email", async (req, res) => {
  try {
    const { email } = req.params;  // Obtener el email desde los parámetros de la URL
    
    // Buscar el usuario en la base de datos usando el email
    const { data, error } = await supabase
      .from("Usuaris")
      .select("admin")
      .eq("email", email)  // Aquí buscamos por email
      .single();

    if (error) {
      console.error("Error Supabase select (isAdmin):", error);
      return res.status(500).json({ message: "Error obtenint l'usuari" });
    }

    if (!data) {
      return res.status(404).json({ message: "No trobat" });
    }

    res.json({ isAdmin: data.admin });  // Devolver el valor de admin (booleano)
  } catch (err) {
    console.error("Error servidor GET /api/isAdmin/:email:", err);
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
      .not("id", "is", null);

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

// ---------------- FRONT ROUTES ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../form/login.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor actiu a http://localhost:${PORT}`);
});
