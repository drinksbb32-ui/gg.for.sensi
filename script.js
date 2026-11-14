
const $ = id => document.getElementById(id);

let currentUser = "";
let authMode = "cadastro";
let gameMode = "Rush";
let pull = "rapida";
let admLogged = false;
let timerInterval;

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value));

// =======================
// CADASTRO E LOGIN
// =======================

function setAuth(mode) {
  authMode = mode;

  $("authTitle").textContent =
    mode === "cadastro" ? "Criar conta" : "Entrar";

  $("authButton").textContent =
    mode === "cadastro" ? "CRIAR CONTA" : "ENTRAR";

  $("cadTab").classList.toggle("active", mode === "cadastro");
  $("logTab").classList.toggle("active", mode === "login");

  $("authMessage").textContent = "";
}

function auth() {
  const name = $("username").value.trim();
  const pass = $("password").value;
  const users = read("gg_users", {});

  if (name.length < 3 || pass.length < 4) {
    $("authMessage").textContent =
      "Nome mínimo 3 letras e senha mínima 4.";
    return;
  }

  if (authMode === "cadastro") {
    if (users[name]) {
      $("authMessage").textContent = "Usuário já cadastrado!";
      return;
    }

    users[name] = { password: pass };
    save("gg_users", users);
  } else {
    if (!users[name] || users[name].password !== pass) {
      $("authMessage").textContent = "Dados incorretos!";
      return;
    }
  }

  currentUser = name;

  $("authBox").classList.add("hidden");
  $("userBox").classList.remove("hidden");

  $("loggedName").textContent = name;
  $("logout").classList.remove("hidden");

  updateAccess();
}

function logout() {
  currentUser = "";
  clearInterval(timerInterval);

  $("authBox").classList.remove("hidden");
  $("userBox").classList.add("hidden");
  $("logout").classList.add("hidden");

  $("generatorForm").classList.add("hidden");
  $("locked").classList.remove("hidden");

  $("keyMessage").textContent = "";
}

// =======================
// SISTEMA DE KEYS
// =======================

function redeem() {
  if (!currentUser) {
    alert("Faça login primeiro!");
    return;
  }

  const code = $("keyInput").value.trim().toUpperCase();
  const keys = read("gg_keys", []);

  const key = keys.find(k =>
    k.code === code &&
    !k.used &&
    k.created + 30 * 86400000 > Date.now()
  );

  if (!key) {
    $("keyMessage").textContent =
      "Key inválida, expirada ou já utilizada!";
    return;
  }

  // Ativa Key individual
  key.used = true;
  key.user = currentUser;
  key.end = Date.now() + key.hours * 3600000;

  save("gg_keys", keys);

  const access = read("gg_access", {});
  access[currentUser] = key.end;

  save("gg_access", access);

  $("keyMessage").textContent =
    "✅ Acesso liberado por " + key.hours + " hora(s)!";

  updateAccess();
}

// =======================
// TEMPO E BLOQUEIO
// =======================

function getEnd() {
  return read("gg_access", {})[currentUser] || 0;
}

function hasAccess() {
  return getEnd() > Date.now();
}

function updateAccess() {
  clearInterval(timerInterval);

  function refresh() {
    const end = getEnd();
    const active = end > Date.now();

    $("generatorForm").classList.toggle("hidden", !active);
    $("locked").classList.toggle("hidden", active);

    $("keyStatus").textContent =
      active ? "🟢 KEY ATIVA" : "🔒 Acesso bloqueado";

    if (active) {
      const remaining = end - Date.now();

      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      $("timer").textContent =
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

      $("progress").style.width =
        Math.min(100, remaining / 864000) + "%";
    } else {
      $("timer").textContent = "00:00:00";
      $("progress").style.width = "0%";

      $("result").classList.add("hidden");
    }
  }

  refresh();
  timerInterval = setInterval(refresh, 1000);
}

// =======================
// CONFIGURAÇÃO DO GERADOR
// =======================

function setPull(type, button) {
  pull = type;

  document.querySelectorAll(".options button")
    .forEach(b => b.classList.remove("active"));

  button.classList.add("active");
}

function setMode(mode, button) {
  gameMode = mode;

  document.querySelectorAll(".modes button")
    .forEach(b => b.classList.remove("active"));

  button.classList.add("active");
}

function generate() {
  if (!hasAccess()) {
    updateAccess();
    alert("Sua Key expirou!");
    return;
  }

  const phone = $("phone").value;

  if (!phone) {
    alert("Selecione seu celular!");
    return;
  }

  let values = pull === "rapida"
    ? [190, 180, 170, 160, 45, 120]
    : [150, 140, 130, 115, 35, 95];

  if (gameMode === "Rush") {
    values = values.map(v => Math.min(v + 8, 200));
  }

  const names = [
    "Geral",
    "Ponto vermelho",
    "Mira 2x",
    "Mira 4x",
    "AWP",
    "Olhadinha"
  ];

  window.sensiCopy =
    "GG FOR SENSI | " + phone + "\n" +
    names.map((n, i) => n + ": " + values[i]).join("\n");

  $("result").classList.remove("hidden");

  $("result").innerHTML =
    "<h3>🔥 GG FOR SENSI</h3>" +
    "<p>Celular: " + phone + "</p>" +
    "<p>Modo: " + gameMode + "</p>" +
    "<p>Puxada: " + pull + "</p>" +
    names.map((n, i) =>
      "<p>" + n + ": <b>" + values[i] + "</b></p>"
    ).join("") +
    '<button onclick="copySensi()">COPIAR SENSI</button>';
}

function copySensi() {
  if (!hasAccess()) {
    updateAccess();
    alert("Acesso expirado!");
    return;
  }

  navigator.clipboard.writeText(window.sensiCopy)
    .then(() => alert("Sensi copiada!"))
    .catch(() => alert(window.sensiCopy));
}

// =======================
// PAINEL ADM
// =======================

function adminLogin() {
  const ADM_USER = "GGADMIN";
  const ADM_PASS = "GGADM2026";

  if (
    $("admUsername").value !== ADM_USER ||
    $("admPassword").value !== ADM_PASS
  ) {
    $("admMessage").textContent = "Usuário ou senha incorretos!";
    return;
  }

  admLogged = true;

  $("admLogin").classList.add("hidden");
  $("admPanel").classList.remove("hidden");

  listKeys();
}

function createKey() {
  if (!admLogged) return;

  const hours = Number($("keyDuration").value);

  const code =
    "GG-" +
    Math.random().toString(36).substring(2, 7).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const keys = read("gg_keys", []);

  keys.push({
    code,
    hours,
    created: Date.now(),
    used: false
  });

  save("gg_keys", keys);

  $("newKey").innerHTML =
    "<div class='keyItem'><h3>KEY GERADA</h3><b>" +
    code +
    "</b><p>Duração: " +
    hours +
    " hora(s)</p><button onclick='copyKey(\"" +
    code +
    "\")'>COPIAR KEY</button></div>";

  listKeys();
}

function copyKey(code) {
  navigator.clipboard.writeText(code)
    .then(() => alert("Key copiada!"))
    .catch(() => alert(code));
}

function listKeys() {
  if (!admLogged) return;

  const keys = read("gg_keys", []);

  $("keysList").innerHTML = keys.length
    ? keys.map(k => `
      <div class="keyItem">
        <b>${k.code}</b><br>
        Duração: ${k.hours}h<br>
        Status: ${k.used ? "Utilizada" : "Disponível"}
        <button onclick="deleteKey('${k.code}')">
          EXCLUIR
        </button>
      </div>
    `).join("")
    : "<p>Nenhuma Key criada.</p>";
}

function deleteKey(code) {
  if (!admLogged) return;

  const keys = read("gg_keys", [])
    .filter(k => k.code !== code);

  save("gg_keys", keys);
  listKeys();
}

function adminLogout() {
  admLogged = false;

  $("admPanel").classList.add("hidden");
  $("admLogin").classList.remove("hidden");

  $("admUsername").value = "";
  $("admPassword").value = "";
}
