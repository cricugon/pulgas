const app = document.querySelector("#worldApp");
const nav = document.querySelector("#worldNav");
const menuButton = document.querySelector("#menuButton");
const toast = document.querySelector("#worldToast");

const state = {
  archivePage: 1,
  archiveArticles: [],
  archiveHasMore: false,
  predictionTeam: "home"
};

const STATUS_LABELS = {
  available: "Disponible",
  doubt: "Duda",
  out: "Baja"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "No se pudo cargar la informacion.");
  return data;
}

function formatDate(value, includeTime = false) {
  if (!value) return "Fecha pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-ES", includeTime
    ? { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "long", year: "numeric" }
  ).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function setActiveNav(section) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === section);
  });
}

function navigate(path) {
  if (window.location.pathname !== path) window.history.pushState({}, "", path);
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  renderRoute();
}

function loading() {
  app.innerHTML = `<div class="page-loader" role="status"><span class="loader-ring"></span><p>Cargando...</p></div>`;
}

function emptyState(title, body) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>`;
}

function storyCard(article) {
  return `
    <a class="story-card" href="/mundolaspulgas/noticias/${encodeURIComponent(article.slug)}">
      <img src="${escapeHtml(article.imageUrl || "/assets/stadium-bg.png")}" alt="" loading="lazy" />
      <div class="story-card-copy">
        <span class="story-meta">${formatDate(article.publishedAt)}</span>
        <h2>${escapeHtml(article.title)}</h2>
        <p>${escapeHtml(article.excerpt || "")}</p>
      </div>
    </a>
  `;
}

function archiveCard(article) {
  return `
    <a class="archive-card" href="/mundolaspulgas/noticias/${encodeURIComponent(article.slug)}">
      <img src="${escapeHtml(article.imageUrl || "/assets/stadium-bg.png")}" alt="" loading="lazy" />
      <div class="archive-card-copy">
        <span class="story-meta">${formatDate(article.publishedAt)}</span>
        <h2>${escapeHtml(article.title)}</h2>
        <p>${escapeHtml(article.excerpt || "")}</p>
      </div>
    </a>
  `;
}

function eventRows(events = [], limit = events.length) {
  if (!events.length) return emptyState("Sin eventos recientes", "Las novedades deportivas apareceran aqui.");
  return `<div class="event-list">${events.slice(0, limit).map((event) => `
    <article class="event-row">
      <span class="event-emoji" aria-hidden="true">${escapeHtml(event.emoji || "•")}</span>
      <div>
        <p>${escapeHtml(event.message)}</p>
        <time datetime="${escapeHtml(event.createdAt)}">${formatDate(event.createdAt, true)}</time>
      </div>
    </article>
  `).join("")}</div>`;
}

function clubName(club, fallback) {
  return club?.name || club?.shortName || fallback;
}

function matchCard(gameweek, match) {
  const home = clubName(match.homeClub, "Local");
  const away = clubName(match.awayClub, "Visitante");
  const isFinal = Boolean(match.isScored);
  const canOpen = isFinal || match.hasPrediction;
  const center = match.homeScore !== null && match.homeScore !== undefined
    ? `${match.homeScore} - ${match.awayScore}`
    : formatDate(match.kickoff, true);
  const detail = isFinal ? "Finalizado - Ver mejor siete" : match.hasPrediction ? "Prediccion disponible" : "Pendiente de prediccion";
  const content = `
    <span class="match-club">${escapeHtml(home)}</span>
    <span class="match-center">
      <strong>${escapeHtml(center)}</strong>
      <small class="${canOpen ? "prediction-flag" : ""}">${detail}</small>
    </span>
    <span class="match-club">${escapeHtml(away)}</span>
  `;
  return canOpen
    ? `<a class="match-link" href="/mundolaspulgas/partidos/${gameweek._id}/${match._id}">${content}</a>`
    : `<div class="match-link">${content}</div>`;
}

function scheduleMarkup(gameweeks = [], compact = false) {
  if (!gameweeks.length) return emptyState("Sin jornadas programadas", "Cuando se creen partidos en la liga apareceran aqui automaticamente.");
  return gameweeks.slice(0, compact ? 1 : gameweeks.length).map((gameweek) => `
    <section class="gameweek-block">
      <div class="gameweek-title">
        <h${compact ? "3" : "2"}>${escapeHtml(gameweek.name)}</h${compact ? "3" : "2"}>
        <span class="status-pill ${gameweek.status}">${escapeHtml(gameweek.status === "live" ? "En juego" : gameweek.status === "finished" ? "Finalizada" : "Programada")}</span>
      </div>
      <div class="schedule-list">
        ${(gameweek.matches || []).map((match) => matchCard(gameweek, match)).join("") || emptyState("Sin partidos", "Esta jornada aun no tiene enfrentamientos.")}
      </div>
    </section>
  `).join("");
}

async function renderHome() {
  setActiveNav("home");
  loading();
  const data = await api("/api/mundo/home");
  const [lead, ...secondary] = data.articles || [];
  app.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Las Pulgas League</p><h1>La liga por dentro</h1></div>
    </div>
    <div class="home-layout">
      <section class="news-feature" aria-label="Ultimas noticias">
        ${lead ? `
          <a class="lead-story" href="/mundolaspulgas/noticias/${encodeURIComponent(lead.slug)}">
            <img src="${escapeHtml(lead.imageUrl)}" alt="" />
            <div class="lead-copy">
              <span class="story-meta">Ultima hora · ${formatDate(lead.publishedAt)}</span>
              <h1>${escapeHtml(lead.title)}</h1>
              <p>${escapeHtml(lead.excerpt || "")}</p>
            </div>
          </a>
          <div class="story-grid">${secondary.map(storyCard).join("")}</div>
        ` : emptyState("La redaccion esta preparando la portada", "Las primeras noticias apareceran aqui al publicarse.")}
      </section>
      <aside class="home-aside">
        <section class="schedule-panel">
          <div class="section-heading"><h2>Proximos partidos</h2><a class="section-link" href="/mundolaspulgas/partidos">Ver agenda</a></div>
          ${scheduleMarkup(data.gameweeks || [], true)}
        </section>
        <section class="events-panel">
          <div class="section-heading"><h2>Ultimos eventos</h2></div>
          ${eventRows(data.events || [], 12)}
        </section>
      </aside>
    </div>
  `;
}

async function loadArchive({ append = false } = {}) {
  const page = append ? state.archivePage + 1 : 1;
  const data = await api(`/api/mundo/articles?page=${page}&limit=9`);
  state.archivePage = page;
  state.archiveArticles = append ? [...state.archiveArticles, ...data.articles] : data.articles;
  state.archiveHasMore = data.pagination.hasMore;
}

function renderArchiveContent() {
  app.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Hemeroteca</p><h1>Todas las noticias</h1><p>El archivo completo de Mundo Las Pulgas, de la ultima publicacion a la primera.</p></div>
    </div>
    ${state.archiveArticles.length
      ? `<div class="archive-grid">${state.archiveArticles.map(archiveCard).join("")}</div>`
      : emptyState("Todavia no hay noticias", "La hemeroteca se llenara a medida que publique la redaccion.")}
    ${state.archiveHasMore ? `<button id="loadMoreArticles" class="load-more" type="button">Cargar noticias anteriores</button>` : ""}
  `;
  document.querySelector("#loadMoreArticles")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Cargando...";
    try {
      await loadArchive({ append: true });
      renderArchiveContent();
    } catch (error) {
      showToast(error.message);
      event.currentTarget.disabled = false;
    }
  });
}

async function renderArchive() {
  setActiveNav("archive");
  loading();
  await loadArchive();
  renderArchiveContent();
}

async function renderArticle(slug) {
  setActiveNav("archive");
  loading();
  const { article } = await api(`/api/mundo/articles/${encodeURIComponent(slug)}`);
  document.title = `${article.title} | Mundo Las Pulgas`;
  app.innerHTML = `
    <article class="article-page">
      <a class="back-button" href="/mundolaspulgas/noticias">← Archivo</a>
      <header class="article-header">
        <p class="eyebrow">Mundo Las Pulgas</p>
        <h1>${escapeHtml(article.title)}</h1>
        <span class="story-meta">Publicado ${formatDate(article.publishedAt)} · ${article.views || 0} lecturas</span>
      </header>
      <img class="article-cover" src="${escapeHtml(article.imageUrl)}" alt="" />
      <div class="article-body">${article.bodyHtml || `<p>${escapeHtml(article.body || "").replaceAll("\n", "<br />")}</p>`}</div>
    </article>
  `;
}

async function renderMatches() {
  setActiveNav("matches");
  loading();
  const { gameweeks } = await api("/api/mundo/gameweeks?history=1");
  app.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Agenda y analisis</p><h1>Partidos</h1><p>Consulta las predicciones antes de jugar y el mejor siete oficial cuando se publiquen las puntuaciones.</p></div>
    </div>
    ${scheduleMarkup(gameweeks)}
  `;
}

function statusBadge(statusData = {}) {
  const status = STATUS_LABELS[statusData.status] ? statusData.status : "available";
  return `<span class="status-label status-${status}" title="${escapeHtml(statusData.note || STATUS_LABELS[status])}"><span class="status-cross">+</span>${escapeHtml(STATUS_LABELS[status])}</span>`;
}

function predictionPlayer(pick, finalMode = false) {
  const starter = pick.starter || {};
  const status = pick.playerStatus?.status || "available";
  const points = Number(pick.points || 0);
  const pointsClass = points > 0 ? "positive" : points < 0 ? "negative" : "neutral";
  return `
    <div class="pitch-player">
      <div class="pitch-player-main">
        <span aria-hidden="true">♟</span>
        ${finalMode
          ? `<span class="pitch-points ${pointsClass}">${points > 0 ? "+" : ""}${points} pts</span>`
          : `<span class="pitch-probability">${Number(pick.probability || 0)}%</span><span class="pitch-status status-${status}" title="${escapeHtml(STATUS_LABELS[status] || "Disponible")}">+</span>`}
      </div>
      <span class="pitch-name">${escapeHtml(starter.name || "Jugador")}</span>
      ${!finalMode && pick.challenger ? `<span class="pitch-challenger">Disputa: ${escapeHtml(pick.challenger.name)}</span>` : ""}
    </div>
  `;
}

function teamPitch(team, finalMode = false) {
  const rows = ["DEL", "MED", "DEF", "POR"];
  return `
    <section class="prediction-team ${finalMode ? "final-lineup" : ""} ${team.side === state.predictionTeam ? "active" : ""}" data-prediction-team="${team.side}">
      <div class="prediction-team-header">
        <h2>${escapeHtml(team.club?.name || "Club")}</h2>
        <div class="lineup-summary">${finalMode ? `<strong>${Number(team.totalPoints || 0)} pts</strong>` : ""}<span class="status-pill">${escapeHtml(team.formation)}</span></div>
      </div>
      <div class="team-pitch">
        ${rows.map((position) => `<div class="pitch-row">${team.picks.filter((pick) => pick.position === position).map((pick) => predictionPlayer(pick, finalMode)).join("")}</div>`).join("")}
      </div>
    </section>
  `;
}

async function renderPrediction(gameweekId, matchId) {
  setActiveNav("matches");
  loading();
  const { gameweek, match, prediction } = await api(`/api/mundo/predictions/${gameweekId}/${matchId}`);
  const teams = [...(prediction.teams || [])].sort((a, b) => a.side === "home" ? -1 : b.side === "home" ? 1 : 0);
  const finalMode = prediction.mode === "final";
  const home = clubName(match.homeClub, "Local");
  const away = clubName(match.awayClub, "Visitante");
  const center = finalMode ? `${match.homeScore} - ${match.awayScore}` : "VS";
  document.title = `${home} - ${away} | Mundo Las Pulgas`;
  app.innerHTML = `
    <section class="match-hero">
      <div class="match-hero-content">
        ${finalMode ? `<span class="finalized-badge">Finalizado</span>` : ""}
        <p class="eyebrow">${escapeHtml(gameweek.name)} · ${finalMode ? "Mejor siete del partido" : "Alineaciones probables"}</p>
        <div class="versus ${finalMode ? "final-score" : ""}"><h1>${escapeHtml(home)}</h1><strong>${escapeHtml(center)}</strong><h1>${escapeHtml(away)}</h1></div>
        <p class="kickoff-line">${formatDate(match.kickoff, true)} · ${finalMode ? "Resultado y puntuaciones oficiales" : `Actualizado ${formatDate(prediction.updatedAt, true)}`}</p>
      </div>
    </section>
    <a class="back-button" href="/mundolaspulgas/partidos">← Todos los partidos</a>
    <div class="prediction-tabs" role="tablist">
      ${teams.map((team) => `<button class="tab-button ${team.side === state.predictionTeam ? "active" : ""}" data-team-tab="${team.side}" type="button">${escapeHtml(team.club?.shortName || team.club?.name)}</button>`).join("")}
    </div>
    <div class="prediction-grid">${teams.map((team) => teamPitch(team, finalMode)).join("")}</div>
  `;
  document.querySelectorAll("[data-team-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.predictionTeam = button.dataset.teamTab;
      document.querySelectorAll("[data-team-tab]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-prediction-team]").forEach((item) => item.classList.toggle("active", item.dataset.predictionTeam === state.predictionTeam));
    });
  });
}

async function renderClubs() {
  setActiveNav("clubs");
  loading();
  const { clubs } = await api("/api/mundo/clubs");
  app.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Plantillas oficiales</p><h1>Clubes</h1><p>Jugadores disponibles, dudas y bajas de cada equipo de Las Pulgas League.</p></div>
    </div>
    ${clubs.length ? `<div class="club-grid">${clubs.map((club) => `
      <a class="club-card" href="/mundolaspulgas/clubes/${club._id}" style="--club-color:${escapeHtml(club.primaryColor || "#3d8bff")}">
        <span class="club-code">${escapeHtml(club.shortName)}</span>
        <h2>${escapeHtml(club.name)}</h2>
        <p>${club.players.length} jugadores · ${club.players.filter((player) => player.mundoStatus?.status === "out").length} bajas · ${club.players.filter((player) => player.mundoStatus?.status === "doubt").length} dudas</p>
      </a>
    `).join("")}</div>` : emptyState("No hay clubes", "Los clubes creados en la liga apareceran aqui automaticamente.")}
  `;
}

async function renderClub(id) {
  setActiveNav("clubs");
  loading();
  const { club, players } = await api(`/api/mundo/clubs/${id}`);
  document.title = `${club.name} | Mundo Las Pulgas`;
  app.innerHTML = `
    <a class="back-button" href="/mundolaspulgas/clubes">← Todos los clubes</a>
    <div class="page-heading">
      <div><p class="eyebrow">${escapeHtml(club.shortName)} · Plantilla</p><h1>${escapeHtml(club.name)}</h1><p>${escapeHtml(club.city || "Las Pulgas League")}</p></div>
    </div>
    ${players.length ? `<div class="roster-list">${players.map((player) => `
      <article class="roster-row">
        <span class="player-avatar" aria-hidden="true">♟</span>
        <div><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.position)}${player.shirtNumber ? ` · #${player.shirtNumber}` : ""}${player.mundoStatus?.note ? ` · ${escapeHtml(player.mundoStatus.note)}` : ""}</small></div>
        ${statusBadge(player.mundoStatus)}
      </article>
    `).join("")}</div>` : emptyState("Plantilla vacia", "Este club aun no tiene jugadores registrados.")}
  `;
}

async function renderRoute() {
  document.title = "Mundo Las Pulgas";
  const parts = window.location.pathname.replace(/^\/mundolaspulgas\/?/, "").split("/").filter(Boolean);
  try {
    if (!parts.length) return await renderHome();
    if (parts[0] === "noticias" && parts[1]) return await renderArticle(decodeURIComponent(parts[1]));
    if (parts[0] === "noticias") return await renderArchive();
    if (parts[0] === "partidos" && parts[1] && parts[2]) return await renderPrediction(parts[1], parts[2]);
    if (parts[0] === "partidos") return await renderMatches();
    if (parts[0] === "clubes" && parts[1]) return await renderClub(parts[1]);
    if (parts[0] === "clubes") return await renderClubs();
    navigate("/mundolaspulgas");
  } catch (error) {
    app.innerHTML = emptyState("No se pudo abrir esta pagina", error.message);
    showToast(error.message);
  } finally {
    app.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/mundolaspulgas")) return;
  event.preventDefault();
  navigate(url.pathname);
});

window.addEventListener("popstate", renderRoute);
renderRoute();
