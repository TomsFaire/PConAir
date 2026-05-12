# companion-module-pconair

Bitfocus Companion module for **PC On Air** — a live event graphics and playout application built on Electron.

## What this module does

Connects Companion to a running PC On Air instance over WebSocket (with HTTP polling fallback). Exposes button actions, dynamic feedbacks, variables, and ready-made preset buttons for controlling:

- Slide deck navigation and loading (Google Slides / A/B instances)
- URL playout mode with A/B instance switching
- Lower thirds cue take/clear and stacking control
- Global mode switching (Slides / URL / Lower Thirds / Idle)
- Connection status display

## Installing in Companion

### Development / manual install

1. Clone this repository and navigate to this package:
   ```
   cd packages/companion-module-pconair
   npm install
   npm run build
   ```
2. In Companion, go to **Settings → Developer modules** and add the path to `packages/companion-module-pconair`.
3. Restart Companion. The **PC On Air** connection type will appear in the module list.

### Via Companion module registry (future)

Once published, search for **PC On Air** in the Companion module browser.

## Configuration

| Field | Default | Description |
|-------|---------|-------------|
| Host | `localhost` | IP address or hostname of the PC On Air machine |
| Port | `8080` | Port for the PC On Air WebSocket/HTTP API |
| Operator PIN | _(empty)_ | Optional PIN for operator-level authentication |
| HTTP Polling Interval (ms) | `2000` | Fallback polling interval when WebSocket is unavailable |

## Actions (22)

| Action | Description |
|--------|-------------|
| Load URL | Load a URL into the URL playout window |
| Load URL Preset | Load a saved URL preset by ID or name |
| Reload Current URL (On-Air) | Reload the active on-air URL |
| Reload Current URL (Off-Air) | Reload the off-air URL instance |
| Switch URL Instance (A ↔ B) | Toggle between A and B URL instances |
| Switch URL Instance To… | Switch to a specific URL instance (A or B) |
| Next Slide | Advance to the next slide |
| Previous Slide | Go back to the previous slide |
| Go to Slide… | Jump to a specific slide number |
| Load Slides Deck | Load a Google Slides deck by URL |
| Reload Slides (Keep Position) | Reload the deck without changing slide position |
| Switch Slides Instance (A ↔ B) | Toggle between A and B slide instances |
| Take Lower Third Cue | Take a lower third cue with optional overrides |
| Clear Lower Third | Clear the active lower third |
| Enable Lower Third Stacking | Turn on stacking mode for lower thirds |
| Disable Lower Third Stacking | Turn off stacking mode |
| Switch Active A/B Instance | Toggle A/B for the current mode |
| Set Target Display | Set the target HDMI display |
| Switch Mode | Switch the active mode (Slides/URL/L3/Idle) |

## Variables (11)

| Variable | Description |
|----------|-------------|
| `$(pconair:current_mode)` | Current active mode |
| `$(pconair:current_url)` | Current URL loaded |
| `$(pconair:current_preset_name)` | Name of the active URL preset |
| `$(pconair:slide_index)` | Current slide number (1-based) |
| `$(pconair:slide_count)` | Total number of slides |
| `$(pconair:deck_title)` | Title of the loaded deck |
| `$(pconair:l3_active_cue)` | Name of the active lower third cue |
| `$(pconair:l3_stacking)` | Lower third stacking state (`on`/`off`) |
| `$(pconair:ab_active_instance)` | Active A/B instance (`A` or `B`) |
| `$(pconair:connected)` | Connection state (`1` connected, `0` disconnected) |
| `$(pconair:connection_status)` | Human-readable connection status |

## Feedbacks (6)

| Feedback | Description |
|----------|-------------|
| Is Connected | Green when connected, red when disconnected |
| Is Mode Active | Highlights when a specified mode is active |
| Is A/B Instance Active | Highlights when a specified A/B instance is active |
| At Slide Number | Highlights when the current slide matches a number |
| Lower Third Stacking On | Highlights when stacking mode is enabled |
| Has Active Lower Third Cue | Highlights when any lower third is on-air |

## Presets (19)

Ready-made button presets organised into categories:

- **Slides**: Next, Previous, Counter display, Load Deck slots 1–3
- **A/B**: Switch toggle, Instance A, Instance B
- **Mode**: Slides, URL, Lower Third, Idle
- **Lower Thirds**: Take slots 1–2, Clear, Stacking On, Stacking Off
- **Status**: Connection status, Current mode display

## Links

- PC On Air repository: <https://github.com/TomsFaire/PConAir>
- Bitfocus Companion: <https://bitfocus.io/companion>
