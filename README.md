# LavronOS Telegram Bot Module

Independent LavronOS module package for Telegram users, permissions,
notifications and module actions.

The module owns its page, settings UI and server runtime.
Its runtime page shows the connected bot, active and pending users, main menu
buttons and available module actions. Before a BotFather token is saved, it
shows one setup screen linked directly to the module settings.
The module page restores the complete LavronOS v0.11 workspace with overview
metrics, menu and user tabs, connection details and an interactive Telegram
phone preview. Menu buttons and submenus can be edited and previewed in place,
users can be approved or blocked, and settings show the bot identity plus the
masked saved token. Telegram intentionally does not register a dashboard widget
because it has no useful home-screen data of its own.
LavronOS stores user-entered settings in its encrypted SQLite settings table
so module updates do not overwrite them.

The release workflow validates `module.json`, creates a versioned ZIP and
publishes it from tags matching the module version. The LavronOS WordPress
Marketplace periodically synchronizes published GitHub Releases from this
repository.

Release history is maintained in [CHANGELOG.md](CHANGELOG.md).

```bash
git tag -a v0.1.4 -m "Release Telegram Bot module 0.1.4"
git push origin main
git push origin v0.1.4
```

No WordPress credentials are required in this repository.
