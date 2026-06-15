# JellyBelly Search

A Jellyfin plugin that replaces the default search page with a Disney+-style full-width UI and lets you embed remote Jellyfin servers as nav entries.

## Features

- **Custom search** — Abyss-themed full-width search with genre pills, Continue Watching, Recently Added, and live search-as-you-type. Results show each item exactly once (Movies / Series rows only — no genre duplication).
- **Other Libraries** — embed a remote Jellyfin server in an iframe. Lazy-loaded on click, removed on navigate away. Configurable name, URL, and placement (sidebar or tab).

## Install

### Option A — Plugin repository

1. In Jellyfin Admin → Plugins → Repositories, add:
   ```
   https://raw.githubusercontent.com/Jenari-Dev/jellybelly-search/main/manifest.json
   ```
2. Go to Catalog, find **JellyBelly Search**, install it.
3. Restart Jellyfin.

### Option B — Manual

1. Download `jellybelly-search_*.zip` from the [Releases](../../releases) page.
2. Extract the DLL into your Jellyfin plugins folder (e.g. `/config/plugins/JellyBellySearch/`).
3. Restart Jellyfin.

## Configuration

Admin → Plugins → JellyBelly Search → Settings:

| Setting | Description |
|---|---|
| Enable custom search page | Toggles the search UI replacement |
| Enable remote library embedding | Toggles the Other Libraries feature |
| Remote Libraries | Add/remove entries: display name + URL + sidebar/tab placement |

**Example remote library entry:**
- Name: `Friend's Library`
- URL: `https://your-friends-jellyfin.example.com/web/index.html`
- Placement: `Sidebar`

## Build from source

```bash
dotnet build JellyBellySearch.csproj --configuration Release
```

The DLL is at `bin/Release/net8.0/Jellyfin.Plugin.JellyBellySearch.dll`.

## Generating a plugin manifest for a custom repo

Create a `manifest.json` at the repo root pointing to your release zip.  
[Jellyfin plugin manifest format →](https://jellyfin.org/docs/general/server/plugins/#installing-plugins-from-a-repository)

## Compatibility

Targets Jellyfin **10.10.x / 10.11.x** (net8.0). To target 10.11.x specifically, bump `Jellyfin.Controller` in the `.csproj` to `10.11.0` once that package is published to NuGet.
