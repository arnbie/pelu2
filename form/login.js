// form/login.js
const apiBase = "/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginBox = document.getElementById("loginBox");
  const registerBox = document.getElementById("registerBox");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");
  const formTitle = document.getElementById("formTitle");
  const errorEl = document.getElementById("error");

  // Cambiar a registro
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginBox.style.display = "none";
    registerBox.style.display = "block";
    formTitle.textContent = "Registra't";
    errorEl.textContent = "";
  });

  // Volver a login
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerBox.style.display = "none";
    loginBox.style.display = "block";
    formTitle.textContent = "Inicia sessió";
    errorEl.textContent = "";
  });

  // LOGIN
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      errorEl.textContent = "Falten camps";
      return;
    }

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.message || "Credencials incorrectes";
        return;
      }

      // Guardar sesión
      localStorage.setItem("token", data.token || "");
      localStorage.setItem("email", data.user?.email || email);
      localStorage.setItem("isAdmin", data.user?.admin ? "1" : "0");

      // Redirección según admin
      window.location.href = data.user?.admin ? "admin.html" : "client.html";
    } catch (err) {
      errorEl.textContent = "Error al connectar amb el servidor";
    }
  });

  // REGISTER
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const name = document.getElementById("registerName").value.trim();
    const surname = document.getElementById("registerSurname").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const phone = document.getElementById("registerPhone").value.trim();
    const password = document.getElementById("registerPassword").value;
    const password2 = document.getElementById("registerPassword2").value;

    if (!name || !surname || !email || !phone || !password || !password2) {
      errorEl.textContent = "Falten camps";
      return;
    }
    if (password !== password2) {
      errorEl.textContent = "Les contrasenyes no coincideixen";
      return;
    }

    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email, phone, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registre correcte! Ara pots iniciar sessió.");
        // Volver a login
        registerBox.style.display = "none";
        loginBox.style.display = "block";
        formTitle.textContent = "Inicia sessió";
        errorEl.textContent = "";
      } else {
        errorEl.textContent = data.message || "Error en el registre";
      }
    } catch (err) {
      errorEl.textContent = "Error al connectar amb el servidor";
    }
  });
});
