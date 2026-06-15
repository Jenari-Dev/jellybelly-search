/**
 * JellyStream Search v3 — Abyss Theme Edition
 * by Kain (jenariskywalker)
 *
 * - Matches Abyss CSS theme (glass, accents, typography)
 * - Full-width edge-to-edge layout like the home page
 * - Preserves the search bar
 * - Horizontal scroll genre rows with all server media
 * - Live visual search as you type
 */

(function () {
  "use strict";

  const CONFIG = {
    searchDelay: 300,
    minSearchChars: 2,
    genreRowLimit: 20,
    maxGenreRows: 30,
  };

  // ========================================================================
  // API
  // ========================================================================
  function getApiInfo() {
    const creds = JSON.parse(localStorage.getItem("jellyfin_credentials") || "{}");
    const server = creds?.Servers?.[0];
    if (!server) return null;
    return {
      baseUrl: server.ManualAddress || server.LocalAddress || "",
      userId: server.UserId,
      token: server.AccessToken,
      serverId: server.Id,
    };
  }

  function apiGet(path, params = {}) {
    const info = getApiInfo();
    if (!info) return Promise.resolve(null);
    const url = new URL(info.baseUrl + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
    return fetch(url.toString(), {
      headers: {
        "X-Emby-Authorization": `MediaBrowser Client="JellyStream", Device="Web", DeviceId="jellystream", Version="3.0.0", Token="${info.token}"`,
      },
    }).then((r) => r.json()).catch(() => null);
  }

  function getImageUrl(item, type = "Backdrop", maxWidth = 500) {
    const info = getApiInfo();
    if (!info) return "";
    if (type === "Backdrop") {
      if (item.BackdropImageTags?.length > 0)
        return `${info.baseUrl}/Items/${item.Id}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
      if (item.ImageTags?.Thumb)
        return `${info.baseUrl}/Items/${item.Id}/Images/Thumb?maxWidth=${maxWidth}&quality=90`;
      if (item.ImageTags?.Primary)
        return `${info.baseUrl}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&quality=90`;
      if (item.ParentBackdropItemId)
        return `${info.baseUrl}/Items/${item.ParentBackdropItemId}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
      if (item.SeriesId)
        return `${info.baseUrl}/Items/${item.SeriesId}/Images/Backdrop/0?maxWidth=${maxWidth}&quality=90`;
    }
    if (type === "Primary" && item.ImageTags?.Primary)
      return `${info.baseUrl}/Items/${item.Id}/Images/Primary?maxWidth=${maxWidth}&quality=90`;
    return "";
  }

  // ========================================================================
  // DATA
  // ========================================================================
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
      GenreIds: genreId, Limit: CONFIG.genreRowLimit,
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
      Limit: 50, Fields: "PrimaryImageAspectRatio,BackdropImageTags,ProductionYear,Genres",
      ImageTypeLimit: 1, EnableImageTypes: "Primary,Backdrop,Thumb",
    }).then((d) => d?.Items || []);
  }

  // ========================================================================
  // STYLES — Abyss-matched
  // ========================================================================
  function injectStyles() {
    if (document.getElementById("js3-css")) return;
    const s = document.createElement("style");
    s.id = "js3-css";
    s.textContent = `
      /* ── Container — full width edge to edge ── */
      .js3-wrap {
        padding: 0 0 40px;
        width: 100%;
        box-sizing: border-box;
      }

      /* ── Custom search bar — Disney+ style ── */
      .js3-search-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px 3% 16px;
        border-bottom: 2px solid rgba(245, 245, 247, 0.12);
        margin-bottom: 8px;
        position: relative;
        z-index: 50;
      }
      .js3-search-icon {
        font-family: 'Material Icons Round', sans-serif;
        font-size: 28px;
        color: rgba(245, 245, 247, 0.35);
        flex-shrink: 0;
        user-select: none;
      }
      .js3-search-input {
        flex: 1;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        font-family: 'Google Sans', sans-serif !important;
        font-size: 26px !important;
        font-weight: 700 !important;
        color: rgba(245, 245, 247, 0.95) !important;
        letter-spacing: 0.5px;
        padding: 8px 0 !important;
        caret-color: rgb(245, 245, 247);
        width: 100%;
      }
      .js3-search-input::placeholder {
        color: rgba(245, 245, 247, 0.2) !important;
        font-weight: 300 !important;
      }
      .js3-search-bar:focus-within {
        border-bottom-color: rgba(245, 245, 247, 0.4);
      }
      .js3-search-bar:focus-within .js3-search-icon {
        color: rgba(245, 245, 247, 0.7);
      }

      /* ── Section ── */
      .js3-section {
        margin-bottom: 24px;
        animation: js3-fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        opacity: 0;
      }
      .js3-section:nth-child(1) { animation-delay: 0.05s; }
      .js3-section:nth-child(2) { animation-delay: 0.1s; }
      .js3-section:nth-child(3) { animation-delay: 0.15s; }
      .js3-section:nth-child(4) { animation-delay: 0.2s; }
      .js3-section:nth-child(5) { animation-delay: 0.25s; }
      .js3-section:nth-child(n+6) { animation-delay: 0.3s; }

      @keyframes js3-fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .js3-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 3% 8px;
      }
      .js3-section-title {
        font-family: 'Google Sans', sans-serif;
        font-size: 1.25rem;
        font-weight: 600;
        color: rgba(245, 245, 247, 0.95);
        margin: 0.2em 0;
      }
      .js3-section-count {
        font-family: 'Google Sans', sans-serif;
        font-size: 0.75rem;
        color: rgba(245, 245, 247, 0.35);
        font-weight: 500;
      }

      /* ── Horizontal scroll row — full width ── */
      .js3-row {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        scroll-behavior: smooth;
        padding: 4px 3% 8px;
        scrollbar-width: none;
      }
      .js3-row::-webkit-scrollbar { display: none; }

      /* Scroll arrows */
      .js3-row-wrap { position: relative; }

      .js3-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-60%);
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: solid 1px rgba(245, 245, 247, 0.2);
        background: rgba(42, 42, 42, 0.69);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        color: rgba(245, 245, 247, 0.9);
        font-size: 1.3rem;
        cursor: pointer;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.37s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .js3-row-wrap:hover .js3-arrow { opacity: 1; }
      .js3-arrow:hover {
        background: rgb(245, 245, 247);
        color: #121212;
        border-color: rgb(245, 245, 247);
      }
      .js3-arrow--left { left: 6px; }
      .js3-arrow--right { right: 6px; }

      /* ── Card — large landscape like Disney+ ── */
      .js3-card {
        flex: 0 0 calc(20% - 12px);
        min-width: 260px;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.37s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow 0.37s cubic-bezier(0.16, 1, 0.3, 1),
                    border-color 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        background: #0a0a0a;
        text-decoration: none;
        display: block;
        position: relative;
        border: solid 1px rgba(245, 245, 247, 0.0);
      }
      .js3-card:hover {
        transform: scale(1.05);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
        border-color: rgba(245, 245, 247, 0.2);
        z-index: 10;
      }

      .js3-card-img-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        background: #141414;
        overflow: hidden;
      }
      .js3-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: filter 0.37s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .js3-card:hover .js3-card-img {
        filter: brightness(1.15);
        transform: scale(1.04);
      }

      /* Bottom gradient */
      .js3-card-img-wrap::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 70%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
        pointer-events: none;
      }

      /* Text overlay */
      .js3-card-overlay {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 10px 12px;
        z-index: 2;
      }
      .js3-card-title {
        font-family: 'Google Sans', sans-serif;
        color: rgba(245, 245, 247, 0.95);
        font-size: 0.88rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
      }
      .js3-card-meta {
        font-family: 'Google Sans', sans-serif;
        color: rgba(245, 245, 247, 0.4);
        font-size: 0.72rem;
        font-weight: 200;
        margin-top: 2px;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      }

      /* Play icon on hover */
      .js3-card-play {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        width: 48px; height: 48px;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(6px);
        border: solid 1px rgba(245, 245, 247, 0.15);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.37s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 3;
        pointer-events: none;
      }
      .js3-card-play::after {
        content: '';
        width: 0; height: 0;
        border-style: solid;
        border-width: 8px 0 8px 16px;
        border-color: transparent transparent transparent rgba(245, 245, 247, 0.9);
        margin-left: 3px;
      }
      .js3-card:hover .js3-card-play {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      /* No-image fallback */
      .js3-card-noimg {
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #141414 0%, #212121 100%);
        color: rgba(245, 245, 247, 0.2);
        font-size: 2rem;
      }

      /* ── Genre pills ── */
      .js3-genres {
        display: flex;
        flex-wrap: nowrap;
        gap: 8px;
        overflow-x: auto;
        padding: 4px 3% 12px;
        scrollbar-width: none;
      }
      .js3-genres::-webkit-scrollbar { display: none; }

      .js3-genre-pill {
        flex-shrink: 0;
        padding: 0.5em 1.5em;
        border-radius: 50px;
        background: rgba(42, 42, 42, 0.69);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: solid 1px rgba(245, 245, 247, 0.0);
        color: rgba(245, 245, 247, 0.8);
        font-family: 'Google Sans', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.37s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
      }
      .js3-genre-pill:hover,
      .js3-genre-pill--active {
        background: rgb(245, 245, 247);
        color: #121212;
        font-weight: 700;
        border-color: rgba(245, 245, 247, 0.2);
        box-shadow: 0 0 24px 2px rgba(245, 245, 247, 0.1);
      }

      /* ── Loading ── */
      .js3-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
        color: rgba(245, 245, 247, 0.35);
        font-family: 'Google Sans', sans-serif;
        font-size: 0.9rem;
        font-weight: 200;
        gap: 12px;
        letter-spacing: 1px;
      }
      .js3-spinner {
        width: 28px; height: 28px;
        border: 3px solid rgba(245, 245, 247, 0.08);
        border-top-color: rgba(245, 245, 247, 0.8);
        border-radius: 50%;
        animation: js3-spin 0.7s linear infinite;
      }
      @keyframes js3-spin { to { transform: rotate(360deg); } }

      /* ── No results ── */
      .js3-empty {
        text-align: center;
        padding: 80px 20px;
      }
      .js3-empty-title {
        font-family: 'Google Sans', sans-serif;
        font-size: 1.5rem;
        font-weight: 100;
        color: rgba(245, 245, 247, 0.6);
        letter-spacing: 1.2px;
        margin-bottom: 8px;
      }
      .js3-empty-sub {
        font-family: 'Google Sans', sans-serif;
        font-size: 0.85rem;
        color: rgba(245, 245, 247, 0.25);
        font-weight: 200;
      }

      /* ── Hide ALL native Jellyfin search page content ── */
      .js3-active .searchSuggestions,
      .js3-active .searchfields-container { display: none !important; }
      .js3-hidden { display: none !important; }

      /* ── Our elements are direct children of .page, force full width ── */
      .page > .js3-search-bar,
      .page > .js3-wrap {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ========================================================================
  // RENDERING
  // ========================================================================
  function createCard(item) {
    const a = document.createElement("a");
    a.className = "js3-card";
    a.href = "#";

    const imgUrl = getImageUrl(item, "Backdrop", 500);
    const year = item.ProductionYear || "";
    const type = item.Type === "Series" ? "Series" : "Movie";

    const imgHtml = imgUrl
      ? `<img class="js3-card-img" src="${imgUrl}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'js3-card-noimg\\'>🎬</div>'">`
      : `<div class="js3-card-noimg">🎬</div>`;

    a.innerHTML = `
      <div class="js3-card-img-wrap">
        ${imgHtml}
        <div class="js3-card-play"></div>
        <div class="js3-card-overlay">
          <div class="js3-card-title">${(item.Name || "Unknown").replace(/</g, "&lt;")}</div>
          <div class="js3-card-meta">${[year, type].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    `;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      const info = getApiInfo();
      if (!info) return;
      window.location.hash = `!/details?id=${item.Id}&serverId=${info.serverId}`;
    });

    return a;
  }

  function createRow(title, items, count) {
    if (!items || items.length === 0) return null;

    const section = document.createElement("div");
    section.className = "js3-section";

    const header = document.createElement("div");
    header.className = "js3-section-header";
    header.innerHTML = `
      <h2 class="js3-section-title">${title}</h2>
      ${count ? `<span class="js3-section-count">${count} titles</span>` : ""}
    `;
    section.appendChild(header);

    const rowWrap = document.createElement("div");
    rowWrap.className = "js3-row-wrap";

    const row = document.createElement("div");
    row.className = "js3-row";
    items.forEach((item) => row.appendChild(createCard(item)));

    const leftArrow = document.createElement("button");
    leftArrow.className = "js3-arrow js3-arrow--left";
    leftArrow.innerHTML = "‹";
    leftArrow.onclick = () => row.scrollBy({ left: -800, behavior: "smooth" });

    const rightArrow = document.createElement("button");
    rightArrow.className = "js3-arrow js3-arrow--right";
    rightArrow.innerHTML = "›";
    rightArrow.onclick = () => row.scrollBy({ left: 800, behavior: "smooth" });

    rowWrap.appendChild(leftArrow);
    rowWrap.appendChild(row);
    rowWrap.appendChild(rightArrow);
    section.appendChild(rowWrap);
    return section;
  }

  function showLoading(container) {
    container.innerHTML = `<div class="js3-loading"><div class="js3-spinner"></div>Loading your library...</div>`;
  }

  function showEmpty(container, query) {
    container.innerHTML = `
      <div class="js3-empty">
        <div class="js3-empty-title">No results for "${(query || "").replace(/</g, "&lt;")}"</div>
        <div class="js3-empty-sub">Try a different search term</div>
      </div>
    `;
  }

  // ========================================================================
  // LANDING
  // ========================================================================
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

      // Genre pills
      if (genres.length > 0) {
        const pillSection = document.createElement("div");
        pillSection.className = "js3-section";
        const pillHeader = document.createElement("div");
        pillHeader.className = "js3-section-header";
        pillHeader.innerHTML = '<h2 class="js3-section-title">Browse by Genre</h2>';
        pillSection.appendChild(pillHeader);

        const pillRow = document.createElement("div");
        pillRow.className = "js3-genres";
        genres.forEach((g) => {
          const pill = document.createElement("button");
          pill.className = "js3-genre-pill";
          pill.textContent = g.Name;
          pill.dataset.genreId = g.Id;
          pill.dataset.genreName = g.Name;
          pill.addEventListener("click", () => onGenrePillClick(pill, container));
          pillRow.appendChild(pill);
        });
        pillSection.appendChild(pillRow);
        container.appendChild(pillSection);
      }

      // Continue Watching
      const cwRow = createRow("Continue Watching", continueWatching);
      if (cwRow) container.appendChild(cwRow);

      // Recently Added
      const raRow = createRow("Recently Added", recentlyAdded);
      if (raRow) container.appendChild(raRow);

      // Genre rows in priority order
      const priority = ["Action", "Comedy", "Horror", "Anime", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Animation", "Romance", "Adventure", "Crime", "Mystery", "Documentary", "Family"];
      const sorted = [...genres].sort((a, b) => {
        const ai = priority.indexOf(a.Name);
        const bi = priority.indexOf(b.Name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.Name.localeCompare(b.Name);
      });

      const batchSize = 4;
      for (let i = 0; i < Math.min(sorted.length, CONFIG.maxGenreRows); i += batchSize) {
        const batch = sorted.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((g) => fetchByGenre(g.Id)));
        results.forEach((items, idx) => {
          if (items?.length > 0) {
            const row = createRow(batch[idx].Name, items, items.length);
            if (row) container.appendChild(row);
          }
        });
      }

      cachedLanding = container.cloneNode(true);
    } catch (err) {
      console.error("[JellyStream] Landing error:", err);
    }
  }

  async function onGenrePillClick(pill, container) {
    const genreName = pill.dataset.genreName;
    const genreId = pill.dataset.genreId;

    container.querySelectorAll(".js3-genre-pill--active").forEach((p) => p.classList.remove("js3-genre-pill--active"));
    pill.classList.add("js3-genre-pill--active");

    // Scroll to existing row
    const titles = container.querySelectorAll(".js3-section-title");
    for (const t of titles) {
      if (t.textContent === genreName) {
        t.closest(".js3-section").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // Fetch and insert
    const items = await fetchByGenre(genreId);
    if (items.length > 0) {
      const row = createRow(genreName, items, items.length);
      if (row) {
        const pillSection = container.querySelector(".js3-genres")?.closest(".js3-section");
        if (pillSection?.nextSibling) {
          container.insertBefore(row, pillSection.nextSibling);
        } else {
          container.appendChild(row);
        }
        row.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function reattachAll(container) {
    container.querySelectorAll(".js3-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        const info = getApiInfo();
        if (!info) return;
        // Extract item ID from existing href or data
        const href = card.getAttribute("href");
        if (href && href !== "#") window.location.hash = href.replace("#!/", "!/");
      });
    });
    container.querySelectorAll(".js3-arrow--left").forEach((btn) => {
      const row = btn.parentElement.querySelector(".js3-row");
      if (row) btn.onclick = () => row.scrollBy({ left: -800, behavior: "smooth" });
    });
    container.querySelectorAll(".js3-arrow--right").forEach((btn) => {
      const row = btn.parentElement.querySelector(".js3-row");
      if (row) btn.onclick = () => row.scrollBy({ left: 800, behavior: "smooth" });
    });
    container.querySelectorAll(".js3-genre-pill").forEach((pill) => {
      pill.addEventListener("click", () => onGenrePillClick(pill, container));
    });
  }

  // ========================================================================
  // LIVE SEARCH
  // ========================================================================
  let searchTimeout = null;

  async function renderSearch(container, query) {
    if (query.length < CONFIG.minSearchChars) {
      renderLanding(container);
      return;
    }

    showLoading(container);

    try {
      const results = await fetchSearchResults(query);
      container.innerHTML = "";

      if (results.length === 0) {
        showEmpty(container, query);
        return;
      }

      const movies = results.filter((i) => i.Type === "Movie");
      const series = results.filter((i) => i.Type === "Series");

      if (movies.length > 0) {
        const row = createRow(`Movies matching "${query}"`, movies, movies.length);
        if (row) container.appendChild(row);
      }
      if (series.length > 0) {
        const row = createRow(`Series matching "${query}"`, series, series.length);
        if (row) container.appendChild(row);
      }

      // Group by genre if enough results
      if (results.length >= 8) {
        const genreMap = {};
        results.forEach((item) => {
          (item.Genres || []).forEach((g) => {
            if (!genreMap[g]) genreMap[g] = [];
            if (!genreMap[g].find((x) => x.Id === item.Id)) genreMap[g].push(item);
          });
        });
        Object.entries(genreMap)
          .filter(([, items]) => items.length >= 2)
          .sort((a, b) => b[1].length - a[1].length)
          .slice(0, 5)
          .forEach(([genre, items]) => {
            const row = createRow(genre, items);
            if (row) container.appendChild(row);
          });
      }
    } catch (err) {
      console.error("[JellyStream] Search error:", err);
    }
  }

  // ========================================================================
  // PAGE HOOK
  // ========================================================================
  let isInitialized = false;

  function initSearchPage() {
    const searchInput = document.querySelector(
      '.page:not(.hide) #searchTextInput, .page:not(.hide) input[type="search"], .page:not(.hide) .searchfields input'
    );
    if (!searchInput) return;

    const page = searchInput.closest(".page") || searchInput.closest('[data-role="page"]');
    if (!page || page.querySelector(".js3-wrap")) return;

    page.classList.add("js3-active");

    // Hide ALL default search page content
    Array.from(page.children).forEach((child) => {
      if (!child.classList.contains("js3-search-bar") && !child.classList.contains("js3-wrap")) {
        child.style.display = "none";
      }
    });

    // Keep the header visible (back button, title, etc.)
    const skinHeader = document.querySelector(".skinHeader");
    if (skinHeader) skinHeader.style.display = "";

    // Create our search bar
    const searchBar = document.createElement("div");
    searchBar.className = "js3-search-bar";
    searchBar.innerHTML = `
      <span class="js3-search-icon material-icons">search</span>
      <input class="js3-search-input" type="text" placeholder="Search by title, character, or genre" autocomplete="off" spellcheck="false">
    `;
    page.appendChild(searchBar);

    const customInput = searchBar.querySelector(".js3-search-input");

    // Create content container
    const container = document.createElement("div");
    container.className = "js3-wrap";
    page.appendChild(container);

    renderLanding(container);

    // Wire search
    customInput.addEventListener("input", function () {
      const q = this.value.trim();
      // Mirror to native input
      if (searchInput) {
        searchInput.value = this.value;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      clearTimeout(searchTimeout);
      if (q.length < CONFIG.minSearchChars) {
        renderLanding(container);
        return;
      }
      searchTimeout = setTimeout(() => renderSearch(container, q), CONFIG.searchDelay);
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
    isInitialized = true;
  }

  // ========================================================================
  // OBSERVER
  // ========================================================================
  function start() {
    injectStyles();
    setTimeout(initSearchPage, 500);

    const observer = new MutationObserver(() => {
      if (window.location.hash.includes("/search") || window.location.href.includes("/search")) {
        if (!isInitialized) setTimeout(initSearchPage, 200);
      } else {
        isInitialized = false;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("hashchange", () => {
      if (window.location.hash.includes("/search")) {
        isInitialized = false;
        setTimeout(initSearchPage, 300);
      } else {
        isInitialized = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  console.log("[JellyStream Search v3] Abyss Edition loaded.");
})();
