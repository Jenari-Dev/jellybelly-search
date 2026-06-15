/**
 * JellyBelly Search — Jellyfin Plugin
 * Abyss Theme Edition · by Kain (jenariskywalker)
 *
 * IMPORTANT: This file is injected via <script defer> into index.html.
 * The defer attribute means it executes after HTML parsing — never during splash.
 * ALL logic inside this IIFE is further gated behind navigation events.
 * Nothing runs at module-evaluation time except registering event listeners.
 */
(function () {
  "use strict";

  // ─── Plugin identity ─────────────────────────────────────────────────────
  const PLUGIN_ID = "b8fc5b3c-fd35-4b53-b68d-d48ca8b7ea4d";

  // ─── Search constants ────────────────────────────────────────────────────
  const CFG = {
    searchDelay: 300,
    minSearchChars: 2,
    genreRowLimit: 20,
    maxGenreRows: 30,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getApiInfo() {
    try {
      const creds = JSON.parse(localStorage.getItem("jellyfin_credentials") || "{}");
      const server = creds?.Servers?.[0];
      if (!server) return null;
      return {
        baseUrl: server.ManualAddress || server.LocalAddress || "",
        userId: server.UserId,
        token: server.AccessToken,
        serverId: server.Id,
      };
    } catch {
      return null;
    }
  }

  function makeAuthHeader(info) {
    return `MediaBrowser Client="JellyBelly", Device="Web", DeviceId="jellybelly-plugin", Version="1.0.0", Token="${info.token}"`;
  }

  function apiGet(path, params = {}) {
    const info = getApiInfo();
    if (!info) return Promise.resolve(null);
    const url = new URL(info.baseUrl + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
    return fetch(url.toString(), {
      headers: { "X-Emby-Authorization": makeAuthHeader(info) },
    })
      .then((r) => r.json())
      .catch(() => null);
  }

  function getImageUrl(item, type = "Backdrop", maxWidth = 500) {
    const info = getApiInfo();
    if (!info) return "";
    const b = info.baseUrl;
    if (type === "Backdrop") {
      if (item.BackdropImageTags?.length)
        return `${b}/Items/${item.Id}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
      if (item.ImageTags?.Thumb)
        return `${b}/Items/${item.Id}/Images/Thumb?maxWidth=${maxWidth}&quality=90`;
      if (item.ImageTags?.Primary)
        return `${b}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&quality=90`;
      if (item.ParentBackdropItemId)
        return `${b}/Items/${item.ParentBackdropItemId}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
      if (item.SeriesId)
        return `${b}/Items/${item.SeriesId}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
    }
    if (type === "Primary" && item.ImageTags?.Primary)
      return `${b}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&quality=90`;
    return "";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHERS
  // ═══════════════════════════════════════════════════════════════════════════

  function fetchGenres() {
    const info = getApiInfo();
    if (!info) return Promise.resolve([]);
    return apiGet("/Genres", {
      SortBy: "SortName", SortOrder: "Ascending", Recursive: true,
      IncludeItemTypes: "Movie,Series", userId: info.userId,
    }).then((d) => d?.Items || []);
  }

  function fetchByGenre(genreId) {
    const info = getApiInfo();
    if (!info) return Promise.resolve([]);
    return apiGet(`/Users/${info.userId}/Items`, {
      SortBy: "Random", IncludeItemTypes: "Movie,Series", Recursive: true,
      GenreIds: genreId, Limit: CFG.genreRowLimit,
      Fields: "PrimaryImageAspectRatio,BackdropImageTags",
      ImageTypeLimit: 1, EnableImageTypes: "Primary,Backdrop,Thumb",
    }).then((d) => d?.Items || []);
  }

  function fetchContinueWatching() {
    const info = getApiInfo();
    if (!info) return Promise.resolve([]);
    return apiGet(`/Users/${info.userId}/Items/Resume`, {
      Limit: 20, Recursive: true,
      Fields: "PrimaryImageAspectRatio,BackdropImageTags",
      ImageTypeLimit: 1, EnableImageTypes: "Primary,Backdrop,Thumb",
      MediaTypes: "Video",
    }).then((d) => d?.Items || []);
  }

  function fetchRecentlyAdded() {
    const info = getApiInfo();
    if (!info) return Promise.resolve([]);
    return apiGet(`/Users/${info.userId}/Items/Latest`, {
      IncludeItemTypes: "Movie,Series", Limit: 20,
      Fields: "PrimaryImageAspectRatio,BackdropImageTags",
      ImageTypeLimit: 1, EnableImageTypes: "Primary,Backdrop,Thumb",
      GroupItems: true,
    }).then((d) => d || []);
  }

  function fetchSearchResults(query) {
    const info = getApiInfo();
    if (!info) return Promise.resolve([]);
    return apiGet(`/Users/${info.userId}/Items`, {
      SearchTerm: query, IncludeItemTypes: "Movie,Series", Recursive: true,
      Limit: 50, Fields: "PrimaryImageAspectRatio,BackdropImageTags,ProductionYear",
      ImageTypeLimit: 1, EnableImageTypes: "Primary,Backdrop,Thumb",
    }).then((d) => d?.Items || []);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH — STYLES  (Abyss theme, unchanged from original)
  // ═══════════════════════════════════════════════════════════════════════════

  function injectSearchStyles() {
    if (document.getElementById("jb-css")) return;
    const s = document.createElement("style");
    s.id = "jb-css";
    s.textContent = `
      .jb-wrap { padding: 0 0 40px; width: 100%; box-sizing: border-box; }

      .jb-search-bar {
        display: flex; align-items: center; gap: 16px;
        padding: 20px 3% 16px;
        border-bottom: 2px solid rgba(245,245,247,.12);
        margin-bottom: 8px; position: relative; z-index: 50;
      }
      .jb-search-icon {
        font-family: 'Material Icons Round', sans-serif;
        font-size: 28px; color: rgba(245,245,247,.35);
        flex-shrink: 0; user-select: none;
      }
      .jb-search-input {
        flex: 1; background: transparent !important; border: none !important;
        outline: none !important; font-family: 'Google Sans', sans-serif !important;
        font-size: 26px !important; font-weight: 700 !important;
        color: rgba(245,245,247,.95) !important; letter-spacing: .5px;
        padding: 8px 0 !important; caret-color: rgb(245,245,247); width: 100%;
      }
      .jb-search-input::placeholder { color: rgba(245,245,247,.2) !important; font-weight: 300 !important; }
      .jb-search-bar:focus-within { border-bottom-color: rgba(245,245,247,.4); }
      .jb-search-bar:focus-within .jb-search-icon { color: rgba(245,245,247,.7); }

      .jb-section {
        margin-bottom: 24px;
        animation: jb-fadeUp .7s cubic-bezier(.16,1,.3,1) both;
        opacity: 0;
      }
      .jb-section:nth-child(1) { animation-delay: .05s; }
      .jb-section:nth-child(2) { animation-delay: .1s; }
      .jb-section:nth-child(3) { animation-delay: .15s; }
      .jb-section:nth-child(4) { animation-delay: .2s; }
      .jb-section:nth-child(5) { animation-delay: .25s; }
      .jb-section:nth-child(n+6) { animation-delay: .3s; }
      @keyframes jb-fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .jb-section-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 3% 8px;
      }
      .jb-section-title {
        font-family: 'Google Sans', sans-serif;
        font-size: 1.25rem; font-weight: 600;
        color: rgba(245,245,247,.95); margin: .2em 0;
      }
      .jb-section-count {
        font-family: 'Google Sans', sans-serif;
        font-size: .75rem; color: rgba(245,245,247,.35); font-weight: 500;
      }

      .jb-row {
        display: flex; gap: 12px;
        overflow-x: auto; overflow-y: hidden;
        scroll-behavior: smooth; padding: 4px 3% 8px;
        scrollbar-width: none;
      }
      .jb-row::-webkit-scrollbar { display: none; }
      .jb-row-wrap { position: relative; }

      .jb-arrow {
        position: absolute; top: 50%; transform: translateY(-60%);
        width: 40px; height: 40px; border-radius: 12px;
        border: solid 1px rgba(245,245,247,.2);
        background: rgba(42,42,42,.69);
        backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
        color: rgba(245,245,247,.9); font-size: 1.3rem;
        cursor: pointer; z-index: 20;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: all .37s cubic-bezier(.16,1,.3,1);
      }
      .jb-row-wrap:hover .jb-arrow { opacity: 1; }
      .jb-arrow:hover { background: rgb(245,245,247); color: #121212; border-color: rgb(245,245,247); }
      .jb-arrow--left { left: 6px; }
      .jb-arrow--right { right: 6px; }

      .jb-card {
        flex: 0 0 calc(20% - 12px); min-width: 260px;
        border-radius: 12px; overflow: hidden; cursor: pointer;
        transition: transform .37s cubic-bezier(.16,1,.3,1),
                    box-shadow .37s cubic-bezier(.16,1,.3,1),
                    border-color .15s cubic-bezier(.16,1,.3,1);
        background: #0a0a0a; text-decoration: none; display: block;
        position: relative; border: solid 1px rgba(245,245,247,0);
      }
      .jb-card:hover {
        transform: scale(1.05); box-shadow: 0 12px 36px rgba(0,0,0,.6);
        border-color: rgba(245,245,247,.2); z-index: 10;
      }
      .jb-card-img-wrap {
        position: relative; width: 100%; aspect-ratio: 16/9;
        background: #141414; overflow: hidden;
      }
      .jb-card-img {
        width: 100%; height: 100%; object-fit: cover; display: block;
        transition: filter .37s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1);
      }
      .jb-card:hover .jb-card-img { filter: brightness(1.15); transform: scale(1.04); }
      .jb-card-img-wrap::after {
        content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 70%;
        background: linear-gradient(transparent, rgba(0,0,0,.85)); pointer-events: none;
      }
      .jb-card-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 12px; z-index: 2; }
      .jb-card-title {
        font-family: 'Google Sans', sans-serif; color: rgba(245,245,247,.95);
        font-size: .88rem; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        text-shadow: 0 1px 6px rgba(0,0,0,.7);
      }
      .jb-card-meta {
        font-family: 'Google Sans', sans-serif; color: rgba(245,245,247,.4);
        font-size: .72rem; font-weight: 200; margin-top: 2px;
        text-shadow: 0 1px 3px rgba(0,0,0,.5);
      }
      .jb-card-play {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%,-50%) scale(.8);
        width: 48px; height: 48px;
        background: rgba(0,0,0,.4); backdrop-filter: blur(6px);
        border: solid 1px rgba(245,245,247,.15); border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: all .37s cubic-bezier(.16,1,.3,1);
        z-index: 3; pointer-events: none;
      }
      .jb-card-play::after {
        content: ''; width: 0; height: 0; border-style: solid;
        border-width: 8px 0 8px 16px;
        border-color: transparent transparent transparent rgba(245,245,247,.9);
        margin-left: 3px;
      }
      .jb-card:hover .jb-card-play { opacity: 1; transform: translate(-50%,-50%) scale(1); }
      .jb-card-noimg {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg,#141414 0%,#212121 100%);
        color: rgba(245,245,247,.2); font-size: 2rem;
      }

      .jb-genres {
        display: flex; flex-wrap: nowrap; gap: 8px;
        overflow-x: auto; padding: 4px 3% 12px; scrollbar-width: none;
      }
      .jb-genres::-webkit-scrollbar { display: none; }
      .jb-genre-pill {
        flex-shrink: 0; padding: .5em 1.5em; border-radius: 50px;
        background: rgba(42,42,42,.69); backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: solid 1px rgba(245,245,247,0);
        color: rgba(245,245,247,.8); font-family: 'Google Sans', sans-serif;
        font-size: .85rem; font-weight: 500; cursor: pointer;
        transition: all .37s cubic-bezier(.16,1,.3,1); white-space: nowrap;
      }
      .jb-genre-pill:hover, .jb-genre-pill--active {
        background: rgb(245,245,247); color: #121212; font-weight: 700;
        border-color: rgba(245,245,247,.2);
        box-shadow: 0 0 24px 2px rgba(245,245,247,.1);
      }

      .jb-loading {
        display: flex; align-items: center; justify-content: center;
        padding: 80px 20px; color: rgba(245,245,247,.35);
        font-family: 'Google Sans', sans-serif; font-size: .9rem;
        font-weight: 200; gap: 12px; letter-spacing: 1px;
      }
      .jb-spinner {
        width: 28px; height: 28px;
        border: 3px solid rgba(245,245,247,.08);
        border-top-color: rgba(245,245,247,.8);
        border-radius: 50%; animation: jb-spin .7s linear infinite;
      }
      @keyframes jb-spin { to { transform: rotate(360deg); } }

      .jb-empty { text-align: center; padding: 80px 20px; }
      .jb-empty-title {
        font-family: 'Google Sans', sans-serif; font-size: 1.5rem;
        font-weight: 100; color: rgba(245,245,247,.6);
        letter-spacing: 1.2px; margin-bottom: 8px;
      }
      .jb-empty-sub {
        font-family: 'Google Sans', sans-serif; font-size: .85rem;
        color: rgba(245,245,247,.25); font-weight: 200;
      }

      /* Hide Jellyfin's native search chrome while our UI is active */
      .jb-active .searchSuggestions,
      .jb-active .searchfields-container { display: none !important; }
      .jb-hidden { display: none !important; }

      .page > .jb-search-bar,
      .page > .jb-wrap {
        width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH — RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  function createCard(item) {
    const a = document.createElement("a");
    a.className = "jb-card";
    a.href = "#";

    const imgUrl = getImageUrl(item, "Backdrop", 500);
    const year = item.ProductionYear || "";
    const type = item.Type === "Series" ? "Series" : "Movie";

    const imgHtml = imgUrl
      ? `<img class="jb-card-img" src="${imgUrl}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'jb-card-noimg\\'>🎬</div>'">`
      : `<div class="jb-card-noimg">🎬</div>`;

    a.innerHTML = `
      <div class="jb-card-img-wrap">
        ${imgHtml}
        <div class="jb-card-play"></div>
        <div class="jb-card-overlay">
          <div class="jb-card-title">${escHtml(item.Name || "Unknown")}</div>
          <div class="jb-card-meta">${[year, type].filter(Boolean).join(" · ")}</div>
        </div>
      </div>`;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      const info = getApiInfo();
      if (!info) return;
      window.location.hash = `!/details?id=${item.Id}&serverId=${info.serverId}`;
    });

    return a;
  }

  function createRow(title, items, count) {
    if (!items?.length) return null;

    const section = document.createElement("div");
    section.className = "jb-section";

    const header = document.createElement("div");
    header.className = "jb-section-header";
    header.innerHTML = `
      <h2 class="jb-section-title">${escHtml(title)}</h2>
      ${count ? `<span class="jb-section-count">${count} titles</span>` : ""}`;
    section.appendChild(header);

    const rowWrap = document.createElement("div");
    rowWrap.className = "jb-row-wrap";

    const row = document.createElement("div");
    row.className = "jb-row";
    items.forEach((item) => row.appendChild(createCard(item)));

    const left = document.createElement("button");
    left.className = "jb-arrow jb-arrow--left";
    left.innerHTML = "&#8249;";
    left.onclick = () => row.scrollBy({ left: -800, behavior: "smooth" });

    const right = document.createElement("button");
    right.className = "jb-arrow jb-arrow--right";
    right.innerHTML = "&#8250;";
    right.onclick = () => row.scrollBy({ left: 800, behavior: "smooth" });

    rowWrap.append(left, row, right);
    section.appendChild(rowWrap);
    return section;
  }

  function showLoading(container) {
    container.innerHTML = `<div class="jb-loading"><div class="jb-spinner"></div>Loading your library…</div>`;
  }

  function showEmpty(container, query) {
    container.innerHTML = `
      <div class="jb-empty">
        <div class="jb-empty-title">No results for "${escHtml(query)}"</div>
        <div class="jb-empty-sub">Try a different search term</div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH — LANDING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let cachedLanding = null;

  async function renderLanding(container) {
    if (cachedLanding) {
      container.innerHTML = "";
      container.appendChild(cachedLanding.cloneNode(true));
      reattachAll(container);
      return;
    }

    showLoading(container);

    try {
      const [genres, continueWatching, recentlyAdded] = await Promise.all([
        fetchGenres(), fetchContinueWatching(), fetchRecentlyAdded(),
      ]);

      container.innerHTML = "";

      if (genres.length) {
        const pillSection = document.createElement("div");
        pillSection.className = "jb-section";
        const pillHeader = document.createElement("div");
        pillHeader.className = "jb-section-header";
        pillHeader.innerHTML = '<h2 class="jb-section-title">Browse by Genre</h2>';
        pillSection.appendChild(pillHeader);

        const pillRow = document.createElement("div");
        pillRow.className = "jb-genres";
        genres.forEach((g) => {
          const pill = document.createElement("button");
          pill.className = "jb-genre-pill";
          pill.textContent = g.Name;
          pill.dataset.genreId = g.Id;
          pill.dataset.genreName = g.Name;
          pill.addEventListener("click", () => onGenrePillClick(pill, container));
          pillRow.appendChild(pill);
        });
        pillSection.appendChild(pillRow);
        container.appendChild(pillSection);
      }

      const cwRow = createRow("Continue Watching", continueWatching);
      if (cwRow) container.appendChild(cwRow);

      const raRow = createRow("Recently Added", recentlyAdded);
      if (raRow) container.appendChild(raRow);

      const priority = ["Action","Comedy","Horror","Anime","Drama","Sci-Fi","Thriller","Fantasy","Animation","Romance","Adventure","Crime","Mystery","Documentary","Family"];
      const sorted = [...genres].sort((a, b) => {
        const ai = priority.indexOf(a.Name), bi = priority.indexOf(b.Name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.Name.localeCompare(b.Name);
      });

      for (let i = 0; i < Math.min(sorted.length, CFG.maxGenreRows); i += 4) {
        const batch = sorted.slice(i, i + 4);
        const results = await Promise.all(batch.map((g) => fetchByGenre(g.Id)));
        results.forEach((items, idx) => {
          if (items?.length) {
            const row = createRow(batch[idx].Name, items, items.length);
            if (row) container.appendChild(row);
          }
        });
      }

      cachedLanding = container.cloneNode(true);
    } catch (err) {
      console.error("[JellyBelly] Landing error:", err);
    }
  }

  async function onGenrePillClick(pill, container) {
    const genreName = pill.dataset.genreName;
    const genreId = pill.dataset.genreId;

    container.querySelectorAll(".jb-genre-pill--active").forEach((p) => p.classList.remove("jb-genre-pill--active"));
    pill.classList.add("jb-genre-pill--active");

    // Scroll to existing row if already rendered
    for (const t of container.querySelectorAll(".jb-section-title")) {
      if (t.textContent === genreName) {
        t.closest(".jb-section").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    const items = await fetchByGenre(genreId);
    if (items.length) {
      const row = createRow(genreName, items, items.length);
      if (!row) return;
      const pillSection = container.querySelector(".jb-genres")?.closest(".jb-section");
      if (pillSection?.nextSibling) {
        container.insertBefore(row, pillSection.nextSibling);
      } else {
        container.appendChild(row);
      }
      row.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reattachAll(container) {
    container.querySelectorAll(".jb-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        const info = getApiInfo();
        if (!info) return;
        const href = card.getAttribute("href");
        if (href && href !== "#") window.location.hash = href.replace("#!/", "!/");
      });
    });
    container.querySelectorAll(".jb-arrow--left").forEach((btn) => {
      const row = btn.parentElement.querySelector(".jb-row");
      if (row) btn.onclick = () => row.scrollBy({ left: -800, behavior: "smooth" });
    });
    container.querySelectorAll(".jb-arrow--right").forEach((btn) => {
      const row = btn.parentElement.querySelector(".jb-row");
      if (row) btn.onclick = () => row.scrollBy({ left: 800, behavior: "smooth" });
    });
    container.querySelectorAll(".jb-genre-pill").forEach((pill) => {
      pill.addEventListener("click", () => onGenrePillClick(pill, container));
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH — LIVE SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  let searchTimeout = null;

  async function renderSearch(container, query) {
    if (query.length < CFG.minSearchChars) {
      renderLanding(container);
      return;
    }

    showLoading(container);

    try {
      const results = await fetchSearchResults(query);
      container.innerHTML = "";

      if (!results.length) {
        showEmpty(container, query);
        return;
      }

      // Each item appears exactly once — Movies row then Series row.
      // The original genre-grouping block that caused duplicates has been removed.
      const movies = results.filter((i) => i.Type === "Movie");
      const series = results.filter((i) => i.Type === "Series");

      if (movies.length) {
        const row = createRow(`Movies matching "${query}"`, movies, movies.length);
        if (row) container.appendChild(row);
      }
      if (series.length) {
        const row = createRow(`Series matching "${query}"`, series, series.length);
        if (row) container.appendChild(row);
      }
    } catch (err) {
      console.error("[JellyBelly] Search error:", err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH — PAGE INIT  (called only when the search route is active)
  // ═══════════════════════════════════════════════════════════════════════════

  let searchInitialized = false;

  function initSearchPage() {
    const searchInput = document.querySelector(
      '.page:not(.hide) #searchTextInput, .page:not(.hide) input[type="search"], .page:not(.hide) .searchfields input'
    );
    if (!searchInput) return;

    const page = searchInput.closest(".page") || searchInput.closest('[data-role="page"]');
    if (!page || page.querySelector(".jb-wrap")) return;

    page.classList.add("jb-active");

    Array.from(page.children).forEach((child) => {
      if (!child.classList.contains("jb-search-bar") && !child.classList.contains("jb-wrap")) {
        child.style.display = "none";
      }
    });

    const skinHeader = document.querySelector(".skinHeader");
    if (skinHeader) skinHeader.style.display = "";

    const searchBar = document.createElement("div");
    searchBar.className = "jb-search-bar";
    searchBar.innerHTML = `
      <span class="jb-search-icon material-icons">search</span>
      <input class="jb-search-input" type="text" placeholder="Search by title, character, or genre" autocomplete="off" spellcheck="false">`;
    page.appendChild(searchBar);

    const customInput = searchBar.querySelector(".jb-search-input");
    const container = document.createElement("div");
    container.className = "jb-wrap";
    page.appendChild(container);

    renderLanding(container);

    customInput.addEventListener("input", function () {
      const q = this.value.trim();
      if (searchInput) {
        searchInput.value = this.value;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      clearTimeout(searchTimeout);
      if (q.length < CFG.minSearchChars) {
        renderLanding(container);
        return;
      }
      searchTimeout = setTimeout(() => renderSearch(container, q), CFG.searchDelay);
    });

    customInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        this.value = "";
        if (searchInput) searchInput.value = "";
        clearTimeout(searchTimeout);
        renderLanding(container);
      }
    });

    setTimeout(() => customInput.focus(), 200);
    searchInitialized = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBRARY — iframe embed for remote Jellyfin servers
  // ═══════════════════════════════════════════════════════════════════════════

  let libNavInjected = false;
  let activeLibraryUrl = null;

  function injectLibraryNav(libraries) {
    if (libNavInjected || !libraries?.length) return;

    libraries.forEach((lib) => {
      if (!lib.Url || !lib.Name) return;
      if (lib.Placement === "tab") {
        injectTabEntry(lib);
      } else {
        injectSidebarEntry(lib);
      }
    });

    libNavInjected = true;
  }

  function injectSidebarEntry(lib) {
    // Try common Jellyfin sidebar selectors across versions
    const container =
      document.querySelector(".mainDrawer-scrollContainer") ||
      document.querySelector(".navMenuOptions") ||
      document.querySelector("[data-role='listview'].mainDrawer");

    if (!container) {
      console.warn("[JellyBelly] Sidebar container not found for:", lib.Name);
      return;
    }

    const a = document.createElement("a");
    a.href = "#";
    a.className = "navMenuOption stretchedButton jb-lib-nav";
    a.title = lib.Name;
    a.innerHTML = `
      <span class="material-icons navMenuOption-icon">tv</span>
      <span class="navMenuOption-name">${escHtml(lib.Name)}</span>`;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      toggleLibraryFrame(lib.Url);
    });
    container.appendChild(a);
  }

  function injectTabEntry(lib) {
    // Try to find home-page tab bar
    const tabBar =
      document.querySelector(".emby-tabs-slider") ||
      document.querySelector('[data-role="tabbar"]') ||
      document.querySelector(".pageTabContent");

    if (!tabBar) {
      // Fall back to sidebar if tab bar isn't present
      injectSidebarEntry(lib);
      return;
    }

    const btn = document.createElement("div");
    btn.className = "emby-tab-button jb-lib-tab";
    btn.setAttribute("role", "button");
    btn.textContent = lib.Name;
    btn.addEventListener("click", () => toggleLibraryFrame(lib.Url));
    tabBar.appendChild(btn);
  }

  function toggleLibraryFrame(url) {
    if (activeLibraryUrl === url) {
      removeLibraryFrame();
      return;
    }
    removeLibraryFrame();

    const frame = document.createElement("iframe");
    frame.id = "jb-lib-frame";
    frame.src = url;
    // sandbox isolates the remote server from the host page
    frame.sandbox = "allow-same-origin allow-scripts allow-forms allow-popups allow-presentation";
    frame.allow = "fullscreen; autoplay; encrypted-media";
    frame.style.cssText = [
      "position:fixed", "top:0", "left:0",
      "width:100vw", "height:100vh",
      "z-index:999", "border:none", "background:#000",
    ].join(";");

    const close = document.createElement("button");
    close.id = "jb-lib-close";
    close.textContent = "✕  Close";
    close.style.cssText = [
      "position:fixed", "top:12px", "right:12px", "z-index:1000",
      "background:rgba(0,0,0,.75)", "color:rgba(245,245,247,.9)",
      "border:1px solid rgba(245,245,247,.25)", "border-radius:8px",
      "padding:6px 14px", "cursor:pointer", "font-size:13px",
      "font-family:'Google Sans',sans-serif", "letter-spacing:.5px",
      "backdrop-filter:blur(8px)",
    ].join(";");
    close.addEventListener("click", removeLibraryFrame);

    document.body.appendChild(frame);
    document.body.appendChild(close);
    activeLibraryUrl = url;
  }

  function removeLibraryFrame() {
    document.getElementById("jb-lib-frame")?.remove();
    document.getElementById("jb-lib-close")?.remove();
    activeLibraryUrl = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLUGIN CONFIG — fetched lazily after login, never at module load time
  // ═══════════════════════════════════════════════════════════════════════════

  let pluginConfig = null;
  let configLoading = false;

  async function loadPluginConfig() {
    if (configLoading) return;
    const info = getApiInfo();
    if (!info) return;

    configLoading = true;
    try {
      const resp = await fetch(`${info.baseUrl}/Plugins/JellyBellySearch/PluginConfig`, {
        headers: { "X-Emby-Authorization": makeAuthHeader(info) },
      });
      if (resp.ok) {
        pluginConfig = await resp.json();
      }
    } catch {
      // Non-fatal — fall back to defaults
      pluginConfig = { EnableSearch: true, EnableOtherLibraries: false, RemoteLibraries: [] };
    }
    configLoading = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOTSTRAP — event-driven only, nothing runs at module load time
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleNavigation() {
    // Load config once after the user is logged in
    if (!pluginConfig && !configLoading) {
      await loadPluginConfig();
    }

    const hash = window.location.hash;

    // Inject search UI when the search route is active
    if (pluginConfig?.EnableSearch !== false && hash.includes("/search")) {
      if (!searchInitialized) {
        injectSearchStyles();
        setTimeout(initSearchPage, 150);
      }
    } else {
      searchInitialized = false;
    }

    // Inject library nav entries once the DOM is ready and config allows it
    if (pluginConfig?.EnableOtherLibraries && !libNavInjected) {
      injectLibraryNav(pluginConfig.RemoteLibraries);
    }

    // Remove the library iframe whenever the user navigates away
    if (activeLibraryUrl) removeLibraryFrame();
  }

  // Jellyfin fires 'viewshow' when a page/view becomes visible — after splash, never during it.
  document.addEventListener("viewshow", () => {
    handleNavigation().catch(() => {});
  });

  // hashchange covers SPA navigation between routes
  window.addEventListener("hashchange", () => {
    handleNavigation().catch(() => {});
  });

  console.log("[JellyBelly Search] Plugin script registered (lazy mode).");
})();
