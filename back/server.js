const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;
// --- AFEGEIX AIXÒ AL PRINCIPI ---
require('dotenv').config(); // Opcional però recomanat per seguretat
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt'); // Necessari per fer el hash i compare
// --------------------------------
const { supabase } = require("./supabaseClient");
// Middleware de session (debe ir primero)
app.use(session({
  secret: 'Mina',  // Cambia esta clave por una más segura
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Para desarrollo, usa secure: false, cámbialo a true en producción si usas HTTPS
}));

// Middleware de CORS y bodyParser
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../form")));

// Aquí van tus rutas...

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
      .select("id, email, password, admin, nom, cognom, telefon")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.error("Error Supabase select (login):", error);
      return res.status(401).json({ message: "Credencials incorrectes" });
    }

    // 1. Comprobamos contraseña PRIMERO
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Credencials incorrectes" });
    }

    // 2. Si es correcta, guardamos sesión
    req.session.user = user;

    // 3. Enviamos los datos al frontend (incluyendo el NOM)
    return res.json({
      token: "fake-jwt-token",
      user: {
        id: user.id,
        email: user.email,
        admin: !!user.admin,
        nom: user.nom,       // <--- AÑADIDO: Importante para tu HTML
        cognom: user.cognom,  // <--- AÑADIDO: Por si acaso
        telefon: user.telefon
      },
    });
  } catch (err) {
    console.error("Error servidor POST /api/auth/login:", err);
    res.status(500).json({ message: "Error intern del servidor" });
  }
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
})
.then(response => response.json())
.then(data => {
    if (data.user) {
        // --- ESTA ES LA LÍNEA QUE TE FALTA ---
        // Guardamos el usuario entero (con nom y cognom) en la memoria
        localStorage.setItem('usuario', JSON.stringify(data.user)); 
        // -------------------------------------

        console.log("Usuario guardado:", data.user); // Para comprobar en consola
        window.location.href = "/reserva.html"; // O el nombre de tu archivo de reserva
    } else {
        alert("Error: " + data.message);
    }
})
.catch(error => console.error('Error:', error));
// ... dentro de tu función que maneja el submit del login ...

fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password }) // Tus variables aquí
})
.then(res => res.json())
.then(data => {
    if (data.user) {
        // 👇👇 ESTO ES LO QUE TE FALTA 👇👇
        // 1. Guardamos los datos en el navegador
        localStorage.setItem('usuario', JSON.stringify(data.user)); 
        
        // 2. Comprobamos en la consola que se ha guardado (para ver si funciona)
        console.log("GUARDADO EN MEMORIA:", data.user); 

        // 3. Redirigimos a la reserva
        window.location.href = "/"; // O "/reserva.html", la ruta de tu foto
    } else {
        alert("Error: Credencials incorrectes");
    }
})
.catch(err => console.error(err));
});

app.get("/api/auth/me", (req, res) => {
  if (req.session && req.session.user) {
    // Retornem l'usuari guardat a la sessió
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: "No hi ha sessió activa" });
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
// Rutas disponibles para datos
app.get("/api/bookings", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.json({ reservedTimes: [] });
    
    const { data, error } = await supabase
      .from("reservations")
      .select("time, status")
      .eq("date", date)
      .eq("status", "pending"); // Solo esta condición es necesaria
    
    if (error) {
      console.error("Error Supabase bookings:", error);
      return res.status(500).json({ message: "Error obtenint bookings" });
    }
    
    const reservedTimes = (data || []).map((r) => r.time);
    res.json({ reservedTimes });
  } catch (err) {
    console.error("Error servidor GET /api/bookings/", err);
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
