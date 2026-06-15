# Changelog

All notable changes to the LavronOS Telegram Bot module are documented here.

## [Unreleased]

## [0.1.4] - 2026-06-15

### Fixed
- Restored the complete v0.11 Telegram Bot workspace inside the module package,
  including tabs, user access details, menu navigation and phone preview.
- Restored working menu editing, submenu previews and user approval or blocking actions.
- Restored the Telegram bot avatar, interactive phone buttons and masked saved token.
- Fixed module-owned settings links being blocked by iframe navigation sandboxing.
- Centered Telegram metric, connection and action icons on both axes.
- Added real Telegram user profile photos with a safe initials fallback.
- Changed phone-preview buttons to show current module data instead of placeholder descriptions.
- Restored menu editing as a focused modal instead of an inline browser select.

### Removed
- Removed the Telegram dashboard widget because the module has no useful
  home-screen data to display.

## [0.1.3] - 2026-06-14

### Changed
- Replaced raw configuration JSON with a Telegram Bot dashboard for connection, users, menu buttons and module actions.
- Added a clear first-run connection screen linked to the module settings.

## [0.1.2] - 2026-06-13

### Added
- Added a module-owned settings page and server runtime entry.

### Changed
- Removed direct WordPress uploads from the release workflow; Marketplace now synchronizes published GitHub Releases.
- Included module settings and server runtime files in release ZIP packages.

## [0.1.1] - 2026-06-12

### Changed
- Moved the module manifest, runtime assets and release packaging into an independent repository.
- Added versioned ZIP and SHA-256 release assets for Marketplace publishing.

## [0.1.0] - 2026-06-03

### Added
- Added Telegram users, roles, permissions, notifications and module actions.
