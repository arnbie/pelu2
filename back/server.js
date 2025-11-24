const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Servir fitxers estàtics del directori /form
app.use(express.static(path.join(__dirname, "../form")));

let reservations = [];
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

// Crear reserva
app.post("/api/reservations", (req, res) => {
  const body = req.body || {};
  if (!body.firstName || !body.lastName || !body.email || !body.date || !body.time || !body.service) {
    return res.status(400).json({ message: "Dades incompletes" });
  }
  const newRes = { id: uuidv4(), ...body };
  reservations.push(newRes);
  res.json(newRes);
});

// Obtenir reserves
app.get("/api/reservations", (req, res) => {
  res.json(reservations);
});

// Actualitzar estat reserva
app.put("/api/reservations/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const index = reservations.findIndex(r => r.id === id);
  if (index === -1) return res.status(404).json({ message: "No trobat" });
  reservations[index].status = status;
  res.json(reservations[index]);
});

// Esborrar totes les reserves
app.delete("/api/reservations", (req, res) => {
  reservations = [];
  res.json({ message: "Totes les reserves esborrades" });
});

// Hores ocupades per data
app.get("/api/bookings", (req, res) => {
  const { date } = req.query;
  if (!date) return res.json({ reservedTimes: [] });

  const reservedTimes = reservations
    .filter(r => r.date === date && r.status !== "cancelled")
    .map(r => r.time);

  res.json({ reservedTimes });
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`Servidor actiu a http://localhost:${PORT}`);
});
