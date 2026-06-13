(() => {
  const root = document.getElementById("settings-root");
  const api = "/api/modules/runtime/telegram-bot/api/config";

  render();
  void load();

  async function load() {
    const response = await fetch(api, { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    const config = payload.data?.config;
    if (!response.ok) return showMessage(payload.error?.message || "Could not load Telegram Bot settings.", true);

    document.getElementById("summary").textContent = config?.configured
      ? `${config.botFirstName || "Telegram Bot"}${config.botUsername ? ` · @${config.botUsername}` : ""}`
      : "Bot is not connected.";
    document.getElementById("disconnect").hidden = !config?.configured;
  }

  async function save() {
    const token = document.getElementById("token").value.trim();
    if (!token) return showMessage("Enter the Telegram Bot token.", true);

    setBusy(true);
    const response = await fetch(api, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    showMessage(response.ok ? "Telegram Bot connected." : payload.error?.message || "Telegram Bot connection failed.", !response.ok);
    if (response.ok) {
      document.getElementById("token").value = "";
      await load();
    }
  }

  async function disconnect() {
    setBusy(true);
    const response = await fetch(api, { method: "DELETE", credentials: "same-origin" });
    setBusy(false);
    showMessage(response.ok ? "Telegram Bot disconnected." : "Could not disconnect Telegram Bot.", !response.ok);
    await load();
  }

  function render() {
    root.innerHTML = `
      <section class="module-card">
        <h2>Telegram Bot</h2>
        <p id="summary" class="module-status">Loading...</p>
        <div class="module-form">
          <label>Bot token<input id="token" type="password" placeholder="123456:ABC..."></label>
          <div class="module-actions">
            <button id="disconnect" type="button" hidden>Disconnect</button>
            <button id="save" class="primary" type="button">Connect</button>
          </div>
          <p id="message" class="module-status"></p>
        </div>
      </section>
    `;
    document.getElementById("save").addEventListener("click", () => void save());
    document.getElementById("disconnect").addEventListener("click", () => void disconnect());
  }

  function setBusy(busy) {
    document.getElementById("save").disabled = busy;
    document.getElementById("disconnect").disabled = busy;
  }

  function showMessage(message, error = false) {
    const element = document.getElementById("message");
    element.textContent = message;
    element.classList.toggle("module-status--error", error);
  }
})();
