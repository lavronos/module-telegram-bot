(async () => {
  const root = document.getElementById("module-root");
  const apiBase = "/api/modules/runtime/telegram-bot/api";
  const api = `${apiBase}/config`;
  let pageState = null;
  let activeTab = "menu";
  let previewParentId = null;
  let previewMessage = "";
  let editingMenu = false;
  let draftMenu = [];
  let selectedButtonId = "";
  let menuModalOpen = false;

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
    pageState = state;
    draftMenu = cloneMenu(state.menu);
    selectedButtonId = draftMenu[0]?.id || "";
    renderPage();
  }

  function renderPage() {
    if (!pageState) return;

    const content = document.getElementById("module-content");
    const config = pageState.config || {};
    const users = Array.isArray(pageState.users) ? pageState.users : [];
    const menu = Array.isArray(pageState.menu) ? pageState.menu : [];
    const actions = Array.isArray(pageState.actions) ? pageState.actions : [];
    const modules = Array.isArray(pageState.modules) ? pageState.modules : [];
    const activeUsers = users.filter((user) => user.approved && !user.banned);
    const pendingUsers = users.filter((user) => !user.approved && !user.banned);
    const bannedUsers = users.filter((user) => user.banned);
    const botName = config.botFirstName || "Telegram Bot";
    const username = config.botUsername ? `@${config.botUsername}` : "Telegram";

    content.innerHTML = `
      <section class="metric-grid">
        ${metric("Статус", "Подключён", username, "green", "bot")}
        ${metric("Пользователи", activeUsers.length, `${users.length} всего`, "blue", "users")}
        ${metric("Ожидают", pendingUsers.length, "Новые пользователи", pendingUsers.length ? "amber" : "green", "alert")}
        ${metric("Кнопки", menu.length, `${actions.length} действий модулей`, "violet", "menu")}
      </section>

      <nav class="module-tabs" aria-label="Telegram Bot sections">
        ${tabButton("menu", "Меню и кнопки")}
        ${tabButton("users", `Пользователи · ${users.length}`)}
        ${tabButton("connection", "Подключение")}
      </nav>

      <section class="telegram-workspace">
        <div class="telegram-workspace__main">
          ${activeTab === "menu" ? renderMenuEditor(editingMenu ? draftMenu : menu, actions) : ""}
          ${activeTab === "users" ? renderUsersPanel(activeUsers, pendingUsers, bannedUsers) : ""}
          ${activeTab === "connection" ? renderConnectionPanel(config, actions, modules, botName, username) : ""}
        </div>
        <aside class="phone-column">
          ${renderPhonePreview(config, editingMenu ? draftMenu : menu, botName, username)}
        </aside>
      </section>
    `;

    bindPageEvents();
    positionMenuModal();
  }

  function tabButton(id, label) {
    return `<button class="module-tab ${activeTab === id ? "module-tab--active" : ""}" data-tab="${id}" type="button">${escapeHtml(label)}</button>`;
  }

  function renderMenuEditor(menu, actions) {
    const buttons = menu
      .filter((button) => (button.parentId || null) === previewParentId)
      .sort(sortMenuButtons);
    const parent = previewParentId ? menu.find((button) => button.id === previewParentId) : null;
    const selected = menu.find((button) => button.id === selectedButtonId) || buttons[0] || null;
    if (selected && selected.id !== selectedButtonId) selectedButtonId = selected.id;

    return `
      <article class="panel menu-editor">
        <div class="panel-heading">
          <div>
            <p class="module-eyebrow">${parent ? "Подменю" : "Главное меню"}</p>
            <h2>${escapeHtml(parent?.label || "Кнопки Telegram Bot")}</h2>
            <p class="panel-copy">Меню хранится и обслуживается непосредственно модулем Telegram Bot.</p>
          </div>
          <div class="panel-heading__actions">
            <span class="count-pill">${buttons.length}</span>
            ${editingMenu ? `<button class="small-button" data-add-menu-button type="button">${icon("plus")} Добавить</button>` : `<button class="small-button" data-edit-menu type="button">${icon("edit")} Настроить меню</button>`}
          </div>
        </div>
        ${parent ? `<button class="back-button" data-preview-back="${escapeAttribute(parent.parentId || "")}" type="button">← Назад</button>` : ""}
        <div class="menu-list">
          ${buttons.length ? buttons.map((button) => {
            const children = menu.filter((candidate) => candidate.parentId === button.id).length;
            const action = actions.find((candidate) => candidate.id === button.actionType);
            return `
              <button class="menu-row" ${editingMenu ? `data-select-menu-button="${escapeAttribute(button.id)}"` : `data-preview-button="${escapeAttribute(button.id)}"`} type="button">
                <span class="menu-row__icon">${escapeHtml(button.icon || "•")}</span>
                <span class="menu-row__body">
                  <strong>${escapeHtml(button.label || "Кнопка")}</strong>
                  <small>${escapeHtml(button.description || action?.description || action?.label || actionLabel(button))}</small>
                </span>
                <span class="menu-row__action">${children ? `${children} →` : editingMenu ? icon("edit") : "Просмотр"}</span>
              </button>
            `;
          }).join("") : '<div class="empty">В этом разделе меню пока нет кнопок.</div>'}
        </div>
        <div class="editor-footer">
          <span>${menu.length} кнопок · ${actions.length} доступных действий</span>
          ${editingMenu ? `<div><button class="small-button" data-cancel-menu type="button">Отмена</button><button class="module-button" data-save-menu type="button">${icon("save")} Сохранить меню</button></div>` : ""}
        </div>
        <p class="panel-message" id="menu-message"></p>
      </article>
      ${editingMenu && menuModalOpen ? renderMenuButtonModal(selected, actions) : ""}
    `;
  }

  function renderMenuButtonModal(button, actions) {
    if (!button) {
      return "";
    }

    const choices = [
      { id: "noop", label: "Без действия", description: "Кнопка только показывает текст.", source: "system" },
      { id: "submenu", label: "Открыть подменю", description: "Показывает дочерние кнопки.", source: "system" },
      ...actions.filter((action) => !["noop", "submenu"].includes(action.id))
    ];

    return `
      <div class="menu-modal" role="dialog" aria-modal="true" aria-label="Редактирование кнопки">
        <button class="menu-modal__backdrop" data-close-menu-modal type="button" aria-label="Закрыть"></button>
        <section class="menu-modal__dialog">
          <header class="menu-modal__header">
            <div class="min-width-0">
              <p class="module-eyebrow">Редактирование кнопки</p>
              <h2>${escapeHtml(button.label || "Кнопка")}</h2>
            </div>
            <button class="icon-button" data-close-menu-modal type="button" title="Закрыть">×</button>
          </header>
          <div class="menu-modal__body">
            <div class="menu-form">
              <div class="menu-form__row">
                <label class="menu-form__wide">Текст кнопки<input data-menu-field="label" maxlength="32" value="${escapeAttribute(button.label || "")}"></label>
                <label>Иконка<input data-menu-field="icon" maxlength="4" value="${escapeAttribute(button.icon || "")}"></label>
              </div>
              <label>Описание<input data-menu-field="description" maxlength="96" value="${escapeAttribute(button.description || "")}"></label>
            </div>
            <div class="action-picker">
              <div>
                <p class="module-eyebrow">Действие</p>
                <h3>Что произойдёт после нажатия</h3>
              </div>
              <div class="action-picker__grid">
                ${choices.map((action) => `
                  <button class="action-choice ${button.actionType === action.id ? "action-choice--active" : ""}" data-menu-action="${escapeAttribute(action.id)}" type="button">
                    <span class="action-choice__icon">${action.source === "module" ? icon("module") : icon(action.id === "submenu" ? "menu" : "check")}</span>
                    <span class="min-width-0">
                      <strong>${escapeHtml(action.label || action.id)}</strong>
                      <small>${escapeHtml(action.description || "Действие Telegram Bot")}</small>
                    </span>
                  </button>
                `).join("")}
              </div>
            </div>
            <button class="small-button" data-open-child-menu="${escapeAttribute(button.id)}" type="button">${icon("menu")} Открыть подменю этой кнопки</button>
          </div>
          <footer class="menu-modal__footer">
            <button class="small-button danger" data-delete-menu-button type="button">${icon("trash")} Удалить кнопку</button>
            <button class="module-button" data-close-menu-modal type="button">Готово</button>
          </footer>
        </section>
      </div>
    `;
  }

  function renderUsersPanel(active, pending, banned) {
    return `
      <article class="panel">
        <div class="panel-heading">
          <div><p class="module-eyebrow">Права доступа</p><h2>Пользователи Telegram</h2><p class="panel-copy">Разрешённые, ожидающие и заблокированные пользователи бота.</p></div>
          <span class="count-pill">${active.length + pending.length + banned.length}</span>
        </div>
        <div class="user-summary">
          ${smallMetric("Разрешены", active.length)}
          ${smallMetric("Ожидают", pending.length)}
          ${smallMetric("Заблокированы", banned.length)}
        </div>
        <div class="list">${renderUsers(active, pending, banned)}</div>
      </article>
    `;
  }

  function renderConnectionPanel(config, actions, modules, botName, username) {
    return `
      <article class="panel connection-panel">
        <div class="bot-panel__identity">
          ${avatar(config, "avatar avatar--panel")}
          <div class="min-width-0"><h2>${escapeHtml(botName)}</h2><p>${escapeHtml(username)}</p></div>
          <span class="status-pill"><span></span>В сети</span>
        </div>
        <dl class="detail-list">
          <div><dt>Bot ID</dt><dd>${escapeHtml(config.botId || "Нет данных")}</dd></div>
          <div><dt>Последняя проверка</dt><dd>${escapeHtml(formatDate(config.lastCheckedAt))}</dd></div>
          <div><dt>Токен</dt><dd>${escapeHtml(config.maskedToken || "Сохранён")}</dd></div>
          <div><dt>Действия модулей</dt><dd>${actions.length}</dd></div>
          <div><dt>Источники действий</dt><dd>${modules.length}</dd></div>
        </dl>
        <div class="panel-actions">
          ${config.botLink ? `<a class="module-button" href="${escapeAttribute(config.botLink)}" target="_blank" rel="noreferrer">Открыть в Telegram</a>` : ""}
          <a class="module-button module-button--secondary" href="/settings#module-telegram-bot" target="_top">Настройки подключения</a>
        </div>
      </article>
    `;
  }

  function renderPhonePreview(config, menu, botName, username) {
    const buttons = menu
      .filter((button) => (button.parentId || null) === previewParentId)
      .sort(sortMenuButtons);
    const parent = previewParentId ? menu.find((button) => button.id === previewParentId) : null;
    const message = previewMessage || parent?.description || "Выберите действие для управления вашим домом.";

    return `
      <div class="phone">
        <div class="phone__speaker"></div>
        <div class="phone__screen">
          <header class="phone__header">
            ${previewParentId ? '<button class="phone__back" data-preview-back="" type="button">‹</button>' : ""}
            ${avatar(config, "avatar avatar--phone")}
            <div class="min-width-0"><strong>${escapeHtml(botName)}</strong><span>${escapeHtml(username)} · bot</span></div>
          </header>
          <div class="phone__chat">
            <div class="phone__date">Сегодня</div>
            <div class="phone__outgoing">
              <span>/start</span>
              <time>12:44</time>
            </div>
            <div class="phone__thread">
              <div class="phone__message">
                <strong>${escapeHtml(parent?.label || "LavronOS")}</strong>
                <p>${escapeMultiline(message)}</p>
                <time>${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
              <div class="phone__inline-keyboard">
                ${buttons.length ? buttons.map((button) => `<button data-preview-button="${escapeAttribute(button.id)}" type="button"><span>${escapeHtml(button.icon || "")}</span>${escapeHtml(button.label || "Кнопка")}</button>`).join("") : '<span class="phone__empty">Меню пусто</span>'}
              </div>
            </div>
          </div>
          <div class="phone__composer"><span>Сообщение</span><b>➤</b></div>
        </div>
        <div class="phone__home"></div>
      </div>
    `;
  }

  function bindPageEvents() {
    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.tab || "menu";
        renderPage();
      });
    });

    root.querySelectorAll("[data-preview-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.previewButton;
        const menu = editingMenu ? draftMenu : pageState?.menu || [];
        const item = menu.find((candidate) => candidate.id === id);
        if (!item) return;
        const hasChildren = menu.some((candidate) => candidate.parentId === item.id);
        if (hasChildren || item.actionType === "submenu") {
          previewParentId = item.id;
          previewMessage = item.description || "Выберите действие.";
          renderPage();
          return;
        }
        void showActionPreview(item);
      });
    });

    root.querySelectorAll("[data-preview-back]").forEach((button) => {
      button.addEventListener("click", () => {
        const menu = editingMenu ? draftMenu : pageState?.menu || [];
        const current = menu.find((candidate) => candidate.id === previewParentId);
        previewParentId = current?.parentId || null;
        previewMessage = "";
        renderPage();
      });
    });

    document.querySelector("[data-edit-menu]")?.addEventListener("click", () => {
      draftMenu = cloneMenu(pageState?.menu);
      editingMenu = true;
      menuModalOpen = false;
      selectedButtonId = draftMenu.find((button) => (button.parentId || null) === previewParentId)?.id || "";
      renderPage();
    });
    document.querySelector("[data-cancel-menu]")?.addEventListener("click", () => {
      draftMenu = cloneMenu(pageState?.menu);
      editingMenu = false;
      menuModalOpen = false;
      previewParentId = null;
      previewMessage = "";
      renderPage();
    });
    document.querySelector("[data-add-menu-button]")?.addEventListener("click", () => {
      const siblings = draftMenu.filter((button) => (button.parentId || null) === previewParentId);
      const next = {
        id: `button_${Date.now().toString(36)}`,
        parentId: previewParentId,
        label: "Новая кнопка",
        description: "",
        icon: "✨",
        color: "slate",
        actionType: "noop",
        rowIndex: siblings.length,
        sortOrder: siblings.length
      };
      draftMenu.push(next);
      selectedButtonId = next.id;
      menuModalOpen = true;
      renderPage();
    });
    root.querySelectorAll("[data-select-menu-button]").forEach((button) => button.addEventListener("click", () => {
      selectedButtonId = button.dataset.selectMenuButton || "";
      menuModalOpen = true;
      renderPage();
    }));
    root.querySelectorAll("[data-menu-field]").forEach((field) => field.addEventListener("input", () => {
      const button = draftMenu.find((candidate) => candidate.id === selectedButtonId);
      if (!button) return;
      button[field.dataset.menuField] = field.value;
    }));
    root.querySelectorAll("[data-menu-action]").forEach((choice) => choice.addEventListener("click", () => {
      const button = draftMenu.find((candidate) => candidate.id === selectedButtonId);
      if (!button) return;
      button.actionType = choice.dataset.menuAction || "noop";
      renderPage();
    }));
    root.querySelectorAll("[data-close-menu-modal]").forEach((button) => button.addEventListener("click", () => {
      menuModalOpen = false;
      renderPage();
    }));
    document.querySelector("[data-delete-menu-button]")?.addEventListener("click", () => {
      const removeIds = collectMenuDescendants(selectedButtonId);
      removeIds.add(selectedButtonId);
      draftMenu = draftMenu.filter((button) => !removeIds.has(button.id));
      selectedButtonId = draftMenu.find((button) => (button.parentId || null) === previewParentId)?.id || "";
      menuModalOpen = false;
      renderPage();
    });
    document.querySelector("[data-open-child-menu]")?.addEventListener("click", (event) => {
      previewParentId = event.currentTarget.dataset.openChildMenu || null;
      previewMessage = "";
      selectedButtonId = draftMenu.find((button) => button.parentId === previewParentId)?.id || "";
      menuModalOpen = false;
      renderPage();
    });
    document.querySelector("[data-save-menu]")?.addEventListener("click", () => void saveMenu());
    root.querySelectorAll("[data-user-action]").forEach((button) => button.addEventListener("click", () => void updateUser(button)));
  }

  function positionMenuModal() {
    const modal = root.querySelector(".menu-modal");
    if (!modal) return;

    const frame = window.frameElement;
    if (!(frame instanceof HTMLElement)) return;

    const frameRect = frame.getBoundingClientRect();
    const visibleTop = Math.max(0, -frameRect.top);
    const visibleHeight = Math.max(360, Math.min(frameRect.height - visibleTop, window.parent.innerHeight || frameRect.height));

    modal.style.position = "absolute";
    modal.style.inset = "auto 0 auto 0";
    modal.style.top = `${visibleTop}px`;
    modal.style.height = `${visibleHeight}px`;
  }

  async function showActionPreview(item) {
    previewMessage = "Получаю актуальные данные...";
    renderPage();

    try {
      previewMessage = await resolveActionPreview(item);
    } catch (error) {
      previewMessage = error instanceof Error ? error.message : "Не удалось получить данные для этой кнопки.";
    }

    renderPage();
  }

  async function resolveActionPreview(item) {
    const actionType = String(item.actionType || "noop");

    if (actionType.startsWith("transmission.")) {
      const payload = await requestJson("/api/modules/runtime/transmission/api/torrents", "Transmission не отвечает.");
      const torrents = Array.isArray(payload?.data?.torrents) ? payload.data.torrents : Array.isArray(payload?.torrents) ? payload.torrents : [];
      const filtered = actionType === "transmission.active"
        ? torrents.filter((torrent) => ["downloading", "seeding", "checking"].includes(String(torrent.status || "")))
        : actionType === "transmission.completed"
          ? torrents.filter((torrent) => String(torrent.status || "") === "completed" || Number(torrent.progress || 0) >= 100)
          : torrents;
      const visible = filtered.slice(0, 5);

      if (!visible.length) {
        return actionType === "transmission.active" ? "Сейчас нет активных загрузок." : "В Transmission пока нет торрентов.";
      }

      return visible.map((torrent, index) => `${index + 1}. ${torrent.name || "Torrent"} · ${normalizePercent(torrent.progress)}%`).join("\n");
    }

    if (actionType.startsWith("ups.")) {
      const payload = await requestJson("/api/modules/runtime/ups-monitor/api/status", "UPS не отвечает.");
      const data = payload.data || payload;
      const battery = data.battery || {};
      const output = data.output || {};
      const outputLine = Array.isArray(output.lines) ? output.lines[0] || {} : {};
      const lines = [
        `UPS: ${data.statusLabel || data.status || "состояние получено"}`,
        Number.isFinite(Number(battery.chargePercent)) ? `Заряд: ${Math.round(Number(battery.chargePercent))}%` : "",
        Number.isFinite(Number(battery.estimatedMinutesRemaining)) ? `Осталось: ${Math.round(Number(battery.estimatedMinutesRemaining))} мин` : "",
        Number.isFinite(Number(outputLine.loadPercent)) ? `Нагрузка: ${Math.round(Number(outputLine.loadPercent))}%` : ""
      ].filter(Boolean);
      return lines.join("\n");
    }

    if (actionType.startsWith("home-assistant.")) {
      const payload = await requestJson("/api/modules/runtime/home-assistant/api/status", "Home Assistant Bridge не отвечает.");
      if (!payload.connected) return "Home Assistant не подключён. Откройте настройки модуля и завершите pairing.";
      const counts = payload.bridge?.counts || {};
      return [
        "Home Assistant подключён.",
        Number.isFinite(Number(counts.areas)) ? `Помещения: ${Number(counts.areas)}` : "",
        Number.isFinite(Number(counts.devices)) ? `Устройства: ${Number(counts.devices)}` : "",
        Number.isFinite(Number(counts.entities)) ? `Объекты: ${Number(counts.entities)}` : ""
      ].filter(Boolean).join("\n");
    }

    const messages = {
      "menu.home": "Главное меню LavronOS.",
      settings: "Настройки уведомлений и подключённых модулей.",
      "admin.menu": "Редактор меню Telegram Bot.",
      "admin.users": "Управление пользователями и правами доступа.",
      "admin.torrent_notifications": "Настройки уведомлений Transmission.",
      help: "Выберите раздел меню или откройте настройки Telegram Bot.",
      noop: item.description || "Для этой кнопки действие пока не назначено."
    };

    return messages[actionType] || item.description || "Действие выполнится внутри Telegram Bot.";
  }

  async function saveMenu() {
    const button = document.querySelector("[data-save-menu]");
    const message = document.getElementById("menu-message");
    if (button) {
      button.disabled = true;
      button.innerHTML = `${icon("refresh", "spin")} Сохраняю`;
    }
    try {
      const response = await fetch(`${apiBase}/menu`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buttons: draftMenu })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Не удалось сохранить меню."));
      pageState = payload.data || payload;
      draftMenu = cloneMenu(pageState.menu);
      editingMenu = false;
      renderPage();
    } catch (error) {
      if (message) message.textContent = error instanceof Error ? error.message : "Не удалось сохранить меню.";
      if (button) {
        button.disabled = false;
        button.innerHTML = `${icon("save")} Сохранить меню`;
      }
    }
  }

  async function updateUser(button) {
    const chatId = button.dataset.userId;
    const action = button.dataset.userAction;
    if (!chatId || !action) return;
    const patch = action === "approve" ? { approved: true, banned: false } : action === "ban" ? { banned: true } : { banned: false };
    button.disabled = true;
    try {
      const response = await fetch(`${apiBase}/users/${encodeURIComponent(chatId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Не удалось обновить пользователя."));
      pageState = payload.data || payload;
      renderPage();
    } catch (error) {
      button.disabled = false;
      button.title = error instanceof Error ? error.message : "Не удалось обновить пользователя.";
    }
  }

  function collectMenuDescendants(parentId) {
    const ids = new Set();
    const queue = [parentId];
    while (queue.length) {
      const current = queue.shift();
      draftMenu.filter((button) => button.parentId === current).forEach((button) => {
        ids.add(button.id);
        queue.push(button.id);
      });
    }
    return ids;
  }

  function sortMenuButtons(left, right) {
    return Number(left.rowIndex || 0) - Number(right.rowIndex || 0) || Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  }

  function normalizePercent(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, number > 0 && number <= 1 ? number * 100 : number));
  }

  function actionLabel(button) {
    const labels = {
      module_action: "Действие модуля",
      open_menu: "Открыть подменю",
      url: "Открыть ссылку",
      noop: "Без действия"
    };
    return labels[button.actionType] || "Действие Telegram Bot";
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
    const actions = tone === "pending"
      ? `<button data-user-action="approve" data-user-id="${escapeAttribute(user.chatId)}" type="button">${icon("check")} Разрешить</button><button class="danger" data-user-action="ban" data-user-id="${escapeAttribute(user.chatId)}" type="button">${icon("ban")} Заблокировать</button>`
      : tone === "banned"
        ? `<button data-user-action="unban" data-user-id="${escapeAttribute(user.chatId)}" type="button">${icon("unlock")} Разблокировать</button>`
        : `<button class="danger" data-user-action="ban" data-user-id="${escapeAttribute(user.chatId)}" type="button">${icon("ban")} Заблокировать</button>`;
    return `
      <div class="list-row">
        <div class="user-avatar">
          <span>${escapeHtml(initials(title))}</span>
          <img src="${apiBase}/users/${encodeURIComponent(user.chatId)}/avatar?v=${encodeURIComponent(user.lastSeenAt || "")}" alt="${escapeAttribute(title)}" loading="lazy" onerror="this.remove()">
        </div>
        <div class="min-width-0"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>
        <span class="user-status user-status--${tone}">${escapeHtml(status)}</span>
        <div class="user-actions">${actions}</div>
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
      return `<div class="${className}"><span>${escapeHtml(initials(config.botFirstName || "TG"))}</span><img src="${apiBase}/avatar?v=${encodeURIComponent(config.updatedAt || config.lastCheckedAt || "")}" alt="${escapeAttribute(config.botFirstName || "Telegram Bot")}" onerror="this.remove()"></div>`;
    }
    return `<div class="${className}">${escapeHtml(initials(config.botFirstName || "TG"))}</div>`;
  }

  function metric(label, value, detail, tone, iconName) {
    return `<article class="metric metric--${tone}"><span class="metric-icon">${icon(iconName)}</span><div class="min-width-0"><span class="metric-label">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(detail)}</small></div></article>`;
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

  function cloneMenu(menu) {
    return Array.isArray(menu) ? menu.map((button) => ({ ...button })) : [];
  }

  function icon(name, className = "") {
    const paths = {
      alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/>',
      ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
      bot: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M9 12h.01M15 12h.01M12 7V3M9 17h6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      module: '<path d="m12 2 8 4.5v9L12 20l-8-4.5v-9Z"/><path d="m4.5 6.8 7.5 4.3 7.5-4.3M12 11v9"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      refresh: '<path d="M20 11a8 8 0 1 0 2 5M20 4v7h-7"/>',
      save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"/>',
      unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
    };
    return `<svg class="${escapeAttribute(className)}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.bot}</svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  function escapeMultiline(value) {
    return escapeHtml(value).replaceAll("\n", "<br>");
  }
})();
