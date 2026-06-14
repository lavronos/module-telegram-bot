(async () => {
  const root = document.getElementById("module-root");
  const mode = document.body.dataset.mode === "dashboard" ? "dashboard" : "page";
  const api = "/api/modules/runtime/telegram-bot/api/config";

  try {
    const [manifest, payload] = await Promise.all([
      requestJson("module.json", "Не удалось загрузить Telegram Bot."),
      requestJson(api, "Не удалось получить настройки Telegram Bot.")
    ]);
    const state = payload.data || payload;

    renderShell(manifest);

    if (!state.config?.configured) {
      renderSetupState();
      return;
    }

    renderOverview(state);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Не удалось открыть Telegram Bot.");
  }

  function renderShell(manifest) {
    root.innerHTML = `
      <header class="module-heading">
        <div class="min-width-0">
          <p class="module-eyebrow">${escapeHtml(manifest.categoryLabel || "Automation")}</p>
          <h1>${escapeHtml(manifest.name || "Telegram Bot")}</h1>
          <p class="module-summary">${escapeHtml(manifest.summary || manifest.description || "")}</p>
        </div>
        <button class="refresh-button" id="refresh" type="button">Обновить</button>
      </header>
      <div id="module-content"><div class="module-loading"><span class="spinner"></span>Получаю данные Telegram Bot...</div></div>
    `;
    document.getElementById("refresh")?.addEventListener("click", () => window.location.reload());
  }

  function renderSetupState() {
    const content = document.getElementById("module-content") || root;
    content.innerHTML = `
      <section class="connection-state">
        <div class="connection-icon">TG</div>
        <div>
          <p class="module-eyebrow">Требуется подключение</p>
          <h2>Telegram Bot не подключён</h2>
          <p>Создайте бота через BotFather и укажите полученный токен в настройках модуля.</p>
          <a class="module-button" href="/settings#module-telegram-bot" target="_top">Открыть настройки Telegram Bot</a>
        </div>
      </section>
    `;
  }

  function renderOverview(state) {
    const content = document.getElementById("module-content");
    const config = state.config || {};
    const users = Array.isArray(state.users) ? state.users : [];
    const menu = Array.isArray(state.menu) ? state.menu : [];
    const actions = Array.isArray(state.actions) ? state.actions : [];
    const modules = Array.isArray(state.modules) ? state.modules : [];
    const activeUsers = users.filter((user) => user.approved && !user.banned);
    const pendingUsers = users.filter((user) => !user.approved && !user.banned);
    const bannedUsers = users.filter((user) => user.banned);
    const botName = config.botFirstName || "Telegram Bot";
    const username = config.botUsername ? `@${config.botUsername}` : "Telegram";

    if (mode === "dashboard") {
      content.innerHTML = `
        <section class="dashboard-card">
          <div class="dashboard-header">
            ${avatar(config, "avatar avatar--small")}
            <div class="min-width-0 dashboard-identity"><p class="module-eyebrow">Telegram Bot</p><h2>${escapeHtml(botName)}</h2><span>${escapeHtml(username)}</span></div>
            <span class="status-pill"><span></span>Подключено</span>
          </div>
          <div class="dashboard-stats">
            ${smallMetric("Пользователи", activeUsers.length)}
            ${smallMetric("Ожидают", pendingUsers.length)}
            ${smallMetric("Кнопки", menu.length)}
            ${smallMetric("Действия", actions.length)}
          </div>
        </section>
      `;
      return;
    }

    content.innerHTML = `
      <section class="bot-hero">
        ${avatar(config, "avatar")}
        <div class="min-width-0 bot-identity">
          <span class="status-pill"><span></span>Бот подключён</span>
          <h2>${escapeHtml(botName)}</h2>
          <p>${escapeHtml(username)}</p>
          <div class="hero-meta">
            <span>Проверен: ${escapeHtml(formatDate(config.lastCheckedAt))}</span>
            <span>Токен: ${escapeHtml(config.maskedToken || "сохранён")}</span>
          </div>
          <div class="hero-actions">
            ${config.botLink ? `<a class="module-button" href="${escapeAttribute(config.botLink)}" target="_blank" rel="noreferrer">Открыть в Telegram</a>` : ""}
            <a class="module-button module-button--secondary" href="/settings#module-telegram-bot" target="_top">Настройки подключения</a>
          </div>
        </div>
      </section>

      <section class="metric-grid">
        ${metric("Активные пользователи", activeUsers.length, `${users.length} всего`, "blue")}
        ${metric("Ожидают решения", pendingUsers.length, "Новые пользователи", pendingUsers.length ? "amber" : "green")}
        ${metric("Кнопки меню", menu.length, `${rootMenuCount(menu)} на главном экране`, "violet")}
        ${metric("Действия модулей", actions.length, `${modules.length} источников`, "green")}
      </section>

      <section class="content-grid">
        <article class="panel">
          <div class="panel-heading"><div><p class="module-eyebrow">Пользователи</p><h2>Доступ к боту</h2></div><span class="count-pill">${users.length}</span></div>
          <div class="list">${renderUsers(activeUsers, pendingUsers, bannedUsers)}</div>
        </article>
        <article class="panel">
          <div class="panel-heading"><div><p class="module-eyebrow">Меню</p><h2>Главные кнопки</h2></div><span class="count-pill">${rootMenuCount(menu)}</span></div>
          <div class="menu-grid">${renderMenu(menu)}</div>
        </article>
      </section>
    `;
  }

  function renderUsers(active, pending, banned) {
    const rows = [
      ...pending.map((user) => userRow(user, "Ожидает", "pending")),
      ...active.map((user) => userRow(user, user.role === "admin" ? "Администратор" : "Разрешён", "active")),
      ...banned.map((user) => userRow(user, "Заблокирован", "banned"))
    ];
    return rows.length ? rows.join("") : '<div class="empty">Пользователи появятся после команды /start.</div>';
  }

  function userRow(user, status, tone) {
    const title = user.name || (user.username ? `@${user.username}` : `Chat ${user.chatId}`);
    const detail = user.username ? `@${user.username}` : `ID ${user.chatId}`;
    return `
      <div class="list-row">
        <div class="user-avatar">${escapeHtml(initials(title))}</div>
        <div class="min-width-0"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>
        <span class="user-status user-status--${tone}">${escapeHtml(status)}</span>
      </div>
    `;
  }

  function renderMenu(menu) {
    const buttons = menu
      .filter((button) => !button.parentId)
      .sort((left, right) => Number(left.rowIndex) - Number(right.rowIndex) || Number(left.sortOrder) - Number(right.sortOrder));
    if (!buttons.length) return '<div class="empty">Главное меню пока пустое.</div>';
    return buttons
      .map((button) => `<div class="menu-button"><span>${escapeHtml(button.icon || "•")}</span><strong title="${escapeAttribute(button.label)}">${escapeHtml(button.label)}</strong></div>`)
      .join("");
  }

  function avatar(config, className) {
    if (config.botPhotoUrl) {
      return `<div class="${className}"><img src="${escapeAttribute(config.botPhotoUrl)}" alt="${escapeAttribute(config.botFirstName || "Telegram Bot")}" onerror="this.parentElement.textContent='${escapeAttribute(initials(config.botFirstName || "TG"))}'"></div>`;
    }
    return `<div class="${className}">${escapeHtml(initials(config.botFirstName || "TG"))}</div>`;
  }

  function metric(label, value, detail, tone) {
    return `<article class="metric metric--${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(detail)}</small></article>`;
  }

  function smallMetric(label, value) {
    return `<div class="small-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  }

  function rootMenuCount(menu) {
    return menu.filter((button) => !button.parentId).length;
  }

  async function requestJson(url, fallback) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(payload, fallback));
    return payload;
  }

  function errorMessage(payload, fallback) {
    if (typeof payload === "string" && payload.trim()) return payload;
    if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
    if (typeof payload?.error?.message === "string" && payload.error.message.trim()) return payload.error.message;
    if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
    return fallback;
  }

  function renderError(message) {
    root.innerHTML = `<section class="connection-state connection-state--error"><div class="connection-icon">!</div><div><h2>Не удалось открыть Telegram Bot</h2><p>${escapeHtml(message)}</p><a class="module-button" href="/settings#module-telegram-bot" target="_top">Проверить настройки</a></div></section>`;
  }

  function formatDate(value) {
    if (!value) return "Нет данных";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
