(() => {
  const root = document.getElementById("settings-root");
  const apiBase = "/api/modules/runtime/telegram-bot/api";
  const api = `${apiBase}/config`;
  let config = null;
  let replacing = false;
  let busy = false;

  renderLoading();
  void load();

  async function load() {
    const response = await fetch(api, { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      renderError(payload.error?.message || "Не удалось загрузить настройки Telegram Bot.");
      return;
    }

    config = payload.data?.config || payload.config || {};
    render();
  }

  async function save() {
    const token = document.getElementById("token")?.value.trim();
    if (!token) {
      showMessage("Введите токен Telegram Bot.", true);
      return;
    }

    setBusy(true);
    const response = await fetch(api, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      showMessage(payload.error?.message || "Не удалось подключить Telegram Bot.", true);
      return;
    }

    config = payload.data?.config || {};
    replacing = false;
    render();
    showMessage("Telegram Bot подключён.");
  }

  async function disconnect() {
    setBusy(true);
    const response = await fetch(api, { method: "DELETE", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      showMessage(payload.error?.message || "Не удалось отключить Telegram Bot.", true);
      return;
    }

    config = payload.data?.config || {};
    replacing = false;
    render();
    showMessage("Telegram Bot отключён.");
  }

  function render() {
    const configured = Boolean(config?.configured);
    const name = config?.botFirstName || "Telegram Bot";
    const username = config?.botUsername ? `@${config.botUsername}` : "Бот не подключён";

    root.innerHTML = `
      <section class="module-card telegram-settings">
        <div class="settings-identity">
          ${configured ? `<div class="avatar avatar--panel"><img src="${apiBase}/avatar?v=${encodeURIComponent(config.updatedAt || "")}" alt="${escapeAttribute(name)}" onerror="this.parentElement.textContent='${escapeAttribute(initials(name))}'"></div>` : '<div class="avatar avatar--panel">TG</div>'}
          <div class="min-width-0">
            <h2>${escapeHtml(name)}</h2>
            <p class="module-status">${escapeHtml(username)}</p>
          </div>
          <span class="settings-state ${configured ? "settings-state--online" : ""}">${configured ? "Подключён" : "Не подключён"}</span>
        </div>

        ${configured && !replacing ? `
          <div class="saved-token">
            <span>Сохранённый токен</span>
            <code>${escapeHtml(config.maskedToken || "••••••••")}</code>
          </div>
          <div class="module-actions">
            <button id="replace" type="button">Заменить токен</button>
            <button id="disconnect" class="danger" type="button">Отключить</button>
          </div>
        ` : `
          <div class="module-form">
            <label>Bot token<input id="token" type="password" autocomplete="off" placeholder="123456:ABC..."></label>
            <div class="module-actions">
              ${configured ? '<button id="cancel" type="button">Отмена</button>' : ""}
              <button id="save" class="primary" type="button">${configured ? "Сохранить новый токен" : "Подключить"}</button>
            </div>
          </div>
        `}
        <p id="message" class="module-status"></p>
      </section>
    `;

    document.getElementById("replace")?.addEventListener("click", () => {
      replacing = true;
      render();
      document.getElementById("token")?.focus();
    });
    document.getElementById("cancel")?.addEventListener("click", () => {
      replacing = false;
      render();
    });
    document.getElementById("save")?.addEventListener("click", () => void save());
    document.getElementById("disconnect")?.addEventListener("click", () => void disconnect());
  }

  function renderLoading() {
    root.innerHTML = '<div class="module-loading module-loading--compact"><span class="spinner"></span>Загружаю настройки Telegram Bot...</div>';
  }

  function renderError(message) {
    root.innerHTML = `<section class="module-card"><h2>Не удалось открыть настройки</h2><p class="module-status module-status--error">${escapeHtml(message)}</p></section>`;
  }

  function setBusy(value) {
    busy = value;
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = busy;
    });
  }

  function showMessage(message, error = false) {
    const element = document.getElementById("message");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("module-status--error", error);
  }

  function initials(value) {
    return String(value || "TG").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "TG";
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();
