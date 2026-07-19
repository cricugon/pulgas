const state = {
  token: localStorage.getItem("pl_token"),
  user: null,
  activeView: "dashboard",
  authMode: "login",
  players: [],
  clubs: [],
  marketPlayers: [],
  marketMode: "all",
  gameweeks: [],
  news: [],
  newsPagination: {
    limit: 20,
    offset: 0,
    hasMore: true,
    loading: false
  },
  activeGameweek: null,
  currentLineup: null,
  lineupDraft: null,
  lineupSaving: false,
  lineupPicker: {
    slotKey: "",
    position: ""
  },
  leaderboard: [],
  leaderboardMode: "total",
  activeGameweekLeaderboard: null,
  historyGameweekDetails: {},
  playerStatsCache: {},
  clubBadgeDataUrl: "",
  playerPhotoDataUrl: "",
  promoImageDataUrl: "",
  admin: {
    summary: null,
    settings: null,
    players: [],
    teams: [],
    clubs: [],
    gameweeks: [],
    news: [],
    backups: []
  }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  authView: $("#authView"),
  appView: $("#appView"),
  authForm: $("#authForm"),
  loginTab: $("#loginTab"),
  registerTab: $("#registerTab"),
  teamNameField: $("#teamNameField"),
  emailInput: $("#emailInput"),
  passwordInput: $("#passwordInput"),
  teamNameInput: $("#teamNameInput"),
  accountMenuWrap: $("#accountMenuWrap"),
  accountMenuBtn: $("#accountMenuBtn"),
  accountMenu: $("#accountMenu"),
  profileTopBtn: $("#profileTopBtn"),
  logoutBtn: $("#logoutBtn"),
  adminTab: $("#adminTab"),
  toast: $("#toast"),
  teamTitle: $("#teamTitle"),
  teamSubtitle: $("#teamSubtitle"),
  seasonStatus: $("#seasonStatus"),
  liveBadgeText: $("#liveBadgeText"),
  budgetMetric: $("#budgetMetric"),
  pointsMetric: $("#pointsMetric"),
  squadMetric: $("#squadMetric"),
  squadValue: $("#squadValue"),
  matchesList: $("#matchesList"),
  newsList: $("#newsList"),
  newsScrollSentinel: $("#newsScrollSentinel"),
  squadList: $("#squadList"),
  marketList: $("#marketList"),
  positionFilter: $("#positionFilter"),
  marketClubFilter: $("#marketClubFilter"),
  playerSearch: $("#playerSearch"),
  minPointsFilter: $("#minPointsFilter"),
  maxPriceFilter: $("#maxPriceFilter"),
  marketSort: $("#marketSort"),
  marketModeHint: $("#marketModeHint"),
  lineupForm: $("#lineupForm"),
  formationSelect: $("#formationSelect"),
  lineupPlayers: $("#lineupPlayers"),
  lineupCap: $("#lineupCap"),
  lineupCount: $("#lineupCount"),
  lineupHelp: $("#lineupHelp"),
  lineupSubmitBtn: $("#lineupSubmitBtn"),
  lineupPickerModal: $("#lineupPickerModal"),
  lineupPickerTitle: $("#lineupPickerTitle"),
  lineupPickerBudget: $("#lineupPickerBudget"),
  lineupPickerSearch: $("#lineupPickerSearch"),
  lineupPickerClear: $("#lineupPickerClear"),
  lineupPickerList: $("#lineupPickerList"),
  leaderboardList: $("#leaderboardList"),
  gameweekLeaderboardList: $("#gameweekLeaderboardList"),
  historyGameweeksList: $("#historyGameweeksList"),
  profileInfo: $("#profileInfo"),
  profileTeamForm: $("#profileTeamForm"),
  profileEmailInput: $("#profileEmailInput"),
  profileTeamNameInput: $("#profileTeamNameInput"),
  profilePasswordForm: $("#profilePasswordForm"),
  profileCurrentPasswordInput: $("#profileCurrentPasswordInput"),
  profileNewPasswordInput: $("#profileNewPasswordInput"),
  profileConfirmPasswordInput: $("#profileConfirmPasswordInput"),
  lineupDetailModal: $("#lineupDetailModal"),
  lineupDetailTitle: $("#lineupDetailTitle"),
  lineupDetailBody: $("#lineupDetailBody"),
  playerDetailModal: $("#playerDetailModal"),
  playerDetailTitle: $("#playerDetailTitle"),
  playerDetailBody: $("#playerDetailBody"),
  matchDetailModal: $("#matchDetailModal"),
  matchDetailTitle: $("#matchDetailTitle"),
  matchDetailBody: $("#matchDetailBody"),
  adminSummary: $("#adminSummary"),
  adminRefreshBtn: $("#adminRefreshBtn"),
  resetLeagueBtn: $("#resetLeagueBtn"),
  adminModal: $("#adminModal"),
  adminModalTitle: $("#adminModalTitle"),
  adminModalBody: $("#adminModalBody"),
  settingsForm: $("#settingsForm"),
  initialBudgetInput: $("#initialBudgetInput"),
  promoForm: $("#promoForm"),
  promoEnabledInput: $("#promoEnabledInput"),
  promoDurationInput: $("#promoDurationInput"),
  promoImageInput: $("#promoImageInput"),
  promoAdminPreview: $("#promoAdminPreview"),
  promoAdminStatus: $("#promoAdminStatus"),
  playerForm: $("#playerForm"),
  playerIdInput: $("#playerIdInput"),
  playerNameInput: $("#playerNameInput"),
  playerPositionInput: $("#playerPositionInput"),
  playerClubInput: $("#playerClubInput"),
  playerValueInput: $("#playerValueInput"),
  playerStatusInput: $("#playerStatusInput"),
  playerPhotoInput: $("#playerPhotoInput"),
  playerPhotoPreview: $("#playerPhotoPreview"),
  playerPhotoRemoveField: $("#playerPhotoRemoveField"),
  playerPhotoRemoveInput: $("#playerPhotoRemoveInput"),
  playerResetBtn: $("#playerResetBtn"),
  adminPlayers: $("#adminPlayers"),
  teamForm: $("#teamForm"),
  teamIdInput: $("#teamIdInput"),
  teamNameEditInput: $("#teamNameEditInput"),
  teamBudgetInput: $("#teamBudgetInput"),
  teamStatusInput: $("#teamStatusInput"),
  adminTeams: $("#adminTeams"),
  clubForm: $("#clubForm"),
  clubIdInput: $("#clubIdInput"),
  clubNameInput: $("#clubNameInput"),
  clubShortInput: $("#clubShortInput"),
  clubCityInput: $("#clubCityInput"),
  clubBadgeInput: $("#clubBadgeInput"),
  clubBadgePreview: $("#clubBadgePreview"),
  clubBadgeRemoveField: $("#clubBadgeRemoveField"),
  clubBadgeRemoveInput: $("#clubBadgeRemoveInput"),
  adminClubs: $("#adminClubs"),
  newsForm: $("#newsForm"),
  newsIdInput: $("#newsIdInput"),
  newsTitleInput: $("#newsTitleInput"),
  newsBodyInput: $("#newsBodyInput"),
  newsPinnedInput: $("#newsPinnedInput"),
  newsSubmitBtn: $("#newsSubmitBtn"),
  newsResetBtn: $("#newsResetBtn"),
  adminNews: $("#adminNews"),
  adminBackups: $("#adminBackups"),
  gameweekForm: $("#gameweekForm"),
  gwIdInput: $("#gwIdInput"),
  gwNumberInput: $("#gwNumberInput"),
  gwNameInput: $("#gwNameInput"),
  gwCapInput: $("#gwCapInput"),
  gwStatusInput: $("#gwStatusInput"),
  gwSubmitBtn: $("#gwSubmitBtn"),
  gwResetBtn: $("#gwResetBtn"),
  matchForm: $("#matchForm"),
  matchIdInput: $("#matchIdInput"),
  matchGameweekInput: $("#matchGameweekInput"),
  matchHomeInput: $("#matchHomeInput"),
  matchAwayInput: $("#matchAwayInput"),
  matchKickoffInput: $("#matchKickoffInput"),
  matchStatusInput: $("#matchStatusInput"),
  matchSubmitBtn: $("#matchSubmitBtn"),
  matchResetBtn: $("#matchResetBtn"),
  scoreForm: $("#scoreForm"),
  scoreGameweekInput: $("#scoreGameweekInput"),
  scoreMatchInput: $("#scoreMatchInput"),
  scoreHomeInput: $("#scoreHomeInput"),
  scoreAwayInput: $("#scoreAwayInput"),
  scoreMvpInput: $("#scoreMvpInput"),
  scoreActiveInfo: $("#scoreActiveInfo"),
  scorePlayersList: $("#scorePlayersList"),
  adminGameweeks: $("#adminGameweeks"),
  promoModal: $("#promoModal"),
  promoCloseBtn: $("#promoCloseBtn"),
  promoImage: $("#promoImage"),
  promoProgress: $("#promoProgress")
};

const FORMATIONS = generateFormations();
const POSITION_LABELS = {
  POR: "Portero",
  DEF: "Defensa",
  MED: "Medio",
  DEL: "Delantero"
};
const MUNDO_STATUS_META = {
  available: { label: "Disponible" },
  doubt: { label: "Duda" },
  out: { label: "Baja" }
};
const PLAYER_FORM_META = [
  { min: 88, key: "very-up", label: "Muy por encima de la media", icon: "&#8593;" },
  { min: 63, key: "up", label: "Por encima de la media", icon: "&#8599;" },
  { min: 38, key: "neutral", label: "En la media", icon: "&mdash;" },
  { min: 13, key: "down", label: "Por debajo de la media", icon: "&#8600;" },
  { min: Number.NEGATIVE_INFINITY, key: "very-down", label: "Muy por debajo de la media", icon: "&#8595;" }
];

function playerAvailability(player) {
  const rawStatus = player?.mundoStatus?.status;
  const status = MUNDO_STATUS_META[rawStatus] ? rawStatus : "available";
  return {
    status,
    label: MUNDO_STATUS_META[status].label,
    note: String(player?.mundoStatus?.note || "").trim()
  };
}

function playerFormMeta(player) {
  const value = Number(player?.form ?? 50);
  return PLAYER_FORM_META.find((item) => value >= item.min) || PLAYER_FORM_META[2];
}

function playerFormIndicator(player, { withLabel = false } = {}) {
  const meta = playerFormMeta(player);
  return `
    <span class="player-form-indicator form-${meta.key}${withLabel ? " with-label" : ""}" title="Forma: ${escapeHtml(meta.label)}" aria-label="Forma: ${escapeHtml(meta.label)}">
      <i aria-hidden="true">${meta.icon}</i>
      ${withLabel ? `<b>${escapeHtml(meta.label)}</b>` : ""}
    </span>
  `;
}

function generateFormations() {
  const formations = [];

  for (let defenders = 2; defenders <= 4; defenders += 1) {
    for (let midfielders = 1; midfielders <= 3; midfielders += 1) {
      for (let forwards = 1; forwards <= 3; forwards += 1) {
        const outfield = defenders + midfielders + forwards;
        if (outfield !== 6) continue;
        formations.push(`${defenders}-${midfielders}-${forwards}`);
      }
    }
  }

  return formations.sort((a, b) => {
    const totalA = a.split("-").reduce((sum, part) => sum + Number(part), 1);
    const totalB = b.split("-").reduce((sum, part) => sum + Number(part), 1);
    return totalA - totalB || a.localeCompare(b);
  });
}

function parseFormation(formation) {
  const [defenders, midfielders, forwards] = String(formation || "2-2-2")
    .split("-")
    .map(Number);

  return { POR: 1, DEF: defenders || 2, MED: midfielders || 2, DEL: forwards || 2 };
}

function formationSlots(formation) {
  const counts = parseFormation(formation);
  return [
    { key: "POR-1", position: "POR" },
    ...Array.from({ length: counts.DEF }, (_, index) => ({ key: `DEF-${index + 1}`, position: "DEF" })),
    ...Array.from({ length: counts.MED }, (_, index) => ({ key: `MED-${index + 1}`, position: "MED" })),
    ...Array.from({ length: counts.DEL }, (_, index) => ({ key: `DEL-${index + 1}`, position: "DEL" }))
  ];
}

function formationPlayerCount(formation) {
  return formationSlots(formation).length;
}

function playerById(playerId) {
  return (state.players || []).find((player) => player._id === playerId);
}

function lineupPointsForPlayer(playerId) {
  const player = (state.currentLineup?.players || []).find((item) => item._id === playerId);
  return Number(player?.gameweekPoints || 0);
}

function lineupBudgetLimit() {
  return Number(state.user?.budget || 0);
}

function lineupValueForIds(playerIds = []) {
  const selected = new Set(playerIds.filter(Boolean));
  return (state.players || [])
    .filter((player) => selected.has(player._id))
    .reduce((sum, player) => sum + Number(player.marketValue || 0), 0);
}

function lineupClubIds(gameweek = state.activeGameweek) {
  const clubIds = new Set();
  for (const match of gameweek?.matches || []) {
    if (match.homeClub) clubIds.add(objectId(match.homeClub));
    if (match.awayClub) clubIds.add(objectId(match.awayClub));
  }
  return clubIds;
}

function playerCanPlayLineupGameweek(player, gameweek = state.activeGameweek) {
  const clubIds = lineupClubIds(gameweek);
  return clubIds.has(objectId(player?.club));
}

function eligibleLineupPlayers(position = "") {
  const clubIds = lineupClubIds();
  return (state.players || []).filter((player) => {
    const matchesPosition = !position || player.position === position;
    return matchesPosition && clubIds.has(objectId(player.club));
  });
}

function formatEuro(value = 0) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedEuro(value = 0) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${formatEuro(amount)}`;
}

function formatPoints(value = 0) {
  const points = Number(value || 0);
  return `${points > 0 ? "+" : ""}${points} pts`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const POSITION_META = {
  POR: { label: "Portero", short: "POR" },
  DEF: { label: "Defensa", short: "DEF" },
  MED: { label: "Medio", short: "MED" },
  DEL: { label: "Delantero", short: "DEL" }
};

function positionBadge(position, { compact = false } = {}) {
  const meta = POSITION_META[position] || { label: position || "Jugador", short: position || "-" };
  return `<span class="position-badge position-${escapeHtml(position || "other")}" title="${escapeHtml(meta.label)}">${escapeHtml(compact ? meta.short : meta.label)}</span>`;
}

function clubBadgeUrl(club) {
  if (!club?._id || !club.badgeContentType) return "";
  const version = club.badgeUpdatedAt ? new Date(club.badgeUpdatedAt).getTime() : "1";
  return `/api/clubs/${encodeURIComponent(club._id)}/badge?v=${version}`;
}

function clubBadge(club, className = "club-badge") {
  const shortName = club?.shortName || club?.name || "FA";
  const color = club?.primaryColor || "#2f7cff";
  const imageUrl = clubBadgeUrl(club);
  return `
    <span class="${className} ${imageUrl ? "has-image" : ""}" style="--club-color:${escapeHtml(color)}" title="${escapeHtml(club?.name || shortName)}">
      <span class="club-badge-fallback">${escapeHtml(String(shortName).slice(0, 5))}</span>
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Escudo de ${escapeHtml(club?.name || shortName)}" loading="lazy" decoding="async" />` : ""}
    </span>
  `;
}

function clubIdentity(club, { fullName = false, className = "match-club-identity" } = {}) {
  const label = fullName ? club?.name || club?.shortName : club?.shortName || club?.name;
  return `<span class="${className}">${clubBadge(club, "fixture-club-badge")}<strong>${escapeHtml(label || "Club")}</strong></span>`;
}

function playerPhotoUrl(player) {
  if (!player?._id || !player.photoContentType || !player.photoUpdatedAt) return "";
  const version = new Date(player.photoUpdatedAt).getTime();
  return `/api/players/${encodeURIComponent(player._id)}/photo?v=${Number.isFinite(version) ? version : "latest"}`;
}

function playerPortrait(player, className) {
  const imageUrl = playerPhotoUrl(player);
  return imageUrl
    ? `<div class="${className} has-player-photo"><img src="${escapeHtml(imageUrl)}" alt="Foto de ${escapeHtml(player.name)}" loading="lazy" decoding="async" /></div>`
    : `<div class="${className}" aria-hidden="true"><span></span></div>`;
}

function compactPlayerAvatar(player, className = "avatar") {
  const imageUrl = playerPhotoUrl(player);
  return imageUrl
    ? `<span class="${className} player-photo-avatar"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" /></span>`
    : `<span class="${className}">${initials(player?.name || "Jugador")}</span>`;
}

function stableMarketBadge(player) {
  return marketChangeBadge(player) || `<span class="market-change stable-change">Sin cambios</span>`;
}

function marketChangeBadge(player) {
  const change = Number(player?.marketValueChange || 0);
  if (!change) return "";

  const direction = change > 0 ? "positive-change" : "negative-change";
  return `<span class="market-change ${direction}">${formatSignedEuro(change)}</span>`;
}

function playerMillions(player) {
  return Math.max(Number(player?.marketValue || 0) / 1000000, 1);
}

function valueEfficiency(player) {
  return Number(player?.totalPoints || 0) / playerMillions(player);
}

function undervaluedScore(player) {
  return Number(player?.totalPoints || 0) * 1.35 - playerMillions(player);
}

function showToast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  els.toast.style.borderColor = type === "error" ? "rgba(255,77,109,.45)" : "rgba(68,224,255,.45)";
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Error de servidor.");
  }

  return data;
}

let promoCloseTimer = null;
let promoPreviousFocus = null;
let promoShownThisLoad = false;

function closePromo() {
  window.clearTimeout(promoCloseTimer);
  promoCloseTimer = null;
  els.promoModal?.classList.add("hidden");
  document.body.classList.remove("promo-open");
  promoPreviousFocus?.focus?.({ preventScroll: true });
  promoPreviousFocus = null;
}

function showPromo(promo) {
  if (!els.promoModal || !promo?.enabled || !promo.imageUrl) return;
  const durationMs = Math.max(3000, Math.min(300000, Number(promo.durationSeconds || 15) * 1000));

  promoPreviousFocus = document.activeElement;
  els.promoImage.src = promo.imageUrl;
  els.promoModal.classList.remove("hidden");
  document.body.classList.add("promo-open");

  els.promoProgress.style.animation = "none";
  void els.promoProgress.offsetWidth;
  els.promoProgress.style.animation = `promo-countdown ${durationMs}ms linear forwards`;
  promoCloseTimer = window.setTimeout(closePromo, durationMs);
  window.requestAnimationFrame(() => els.promoCloseBtn?.focus({ preventScroll: true }));
}

async function loadPromoCampaign() {
  try {
    const response = await fetch("/api/promo", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const { promo } = await response.json();
    if (!promo?.enabled || promoShownThisLoad) return;

    promoShownThisLoad = true;
    showPromo(promo);
  } catch {
    // La campaña nunca debe bloquear el acceso a la app.
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginTab.classList.toggle("active", mode === "login");
  els.registerTab.classList.toggle("active", mode === "register");
  els.teamNameField.classList.toggle("hidden", mode !== "register");
}

function setView(view) {
  state.activeView = view;
  document.body.dataset.activeView = view;
  $$(".tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  els.profileTopBtn?.classList.toggle("active", view === "profile");
  $$(".view").forEach((section) => section.classList.remove("active"));
  $(`#${view}View`)?.classList.add("active");

  if (view === "market") loadMarket();
  if (view === "lineup") loadLineup();
  if (view === "leaderboard") loadLeaderboard();
  if (view === "profile") renderProfile();
  if (view === "admin") loadAdmin();
}

function setSession(token, user) {
  state.token = token;
  state.user = user;

  if (token) {
    localStorage.setItem("pl_token", token);
  } else {
    localStorage.removeItem("pl_token");
  }

  renderShell();
}

function closeAccountMenu() {
  els.accountMenu?.classList.add("hidden");
  els.accountMenuBtn?.setAttribute("aria-expanded", "false");
}

function toggleAccountMenu() {
  const willOpen = els.accountMenu?.classList.contains("hidden");
  els.accountMenu?.classList.toggle("hidden", !willOpen);
  els.accountMenuBtn?.setAttribute("aria-expanded", String(willOpen));
}

function renderShell() {
  const isLoggedIn = Boolean(state.token && state.user);
  els.authView.classList.toggle("hidden", isLoggedIn);
  els.appView.classList.toggle("hidden", !isLoggedIn);
  els.accountMenuWrap?.classList.toggle("hidden", !isLoggedIn);
  els.profileTopBtn?.classList.toggle("hidden", !isLoggedIn || state.user?.role === "admin");

  if (!isLoggedIn) {
    closeAccountMenu();
    return;
  }

  const isAdmin = state.user.role === "admin";
  ["dashboard", "market", "lineup", "leaderboard", "profile"].forEach((view) => {
    document.querySelector(`.tab[data-view="${view}"]`)?.classList.toggle("hidden", isAdmin);
  });
  els.adminTab.classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    els.teamTitle.textContent = "Panel de administracion";
    els.teamSubtitle.textContent = `${state.user.email} · sin equipo de juego asignado`;
    els.budgetMetric.textContent = "-";
    els.pointsMetric.textContent = "-";
    els.squadMetric.textContent = "-";
    if (state.activeView !== "admin") setView("admin");
    return;
  }

  if (state.activeView === "admin") setView("dashboard");

  els.teamTitle.textContent = state.user.teamName;
  els.teamSubtitle.textContent = `${state.user.email} - presupuesto de alineacion ${formatEuro(state.user.budget || 0)}`;
  els.budgetMetric.textContent = formatEuro(state.user.budget || 0);
  els.pointsMetric.textContent = state.user.totalPoints || 0;
  els.squadMetric.textContent = state.players.length || 0;
  renderActiveGameweek();
  renderNews();
  renderSquad();
  renderProfile();
}

const NEWS_LABELS = {
  gameweek_started: "Jornada",
  gameweek_finished: "Final",
  match_scored: "Puntos",
  player_created: "Jugador",
  team_registered: "Equipo",
  system: "Liga"
};

function renderNews() {
  if (!els.newsList) return;

  els.newsList.innerHTML = state.news.length
    ? state.news.map(renderNewsItem).join("")
    : `<p class="hint">Todavia no hay noticias publicadas.</p>`;

  if (els.newsScrollSentinel) {
    const { loading, hasMore } = state.newsPagination;
    els.newsScrollSentinel.classList.toggle("done", !hasMore);
    els.newsScrollSentinel.textContent = loading
      ? "Cargando mas noticias..."
      : hasMore
        ? "Baja para cargar mas noticias"
        : "No hay mas noticias.";
  }
}

function renderNewsItem(item) {
  const label = NEWS_LABELS[item.type] || "Liga";
  return `
    <article class="news-item ${item.pinned ? "pinned" : ""}">
      <span class="news-type">${item.pinned ? "Fijada" : escapeHtml(label)}</span>
      <div>
        <strong>${escapeHtml(item.title)}${item.pinned ? ` <span class="news-pin">Fijada</span>` : ""}</strong>
        <small>${formatDateTime(item.createdAt)}${item.body ? ` - ${escapeHtml(item.body)}` : ""}</small>
      </div>
    </article>
  `;
}

async function loadNewsPage({ reset = false } = {}) {
  if (state.newsPagination.loading) return;

  if (reset) {
    state.newsPagination.offset = 0;
    state.newsPagination.hasMore = true;
    state.news = [];
  }

  if (!state.newsPagination.hasMore) {
    renderNews();
    return;
  }

  state.newsPagination.loading = true;
  renderNews();

  try {
    const { limit, offset } = state.newsPagination;
    const data = await api(`/api/news?limit=${limit}&offset=${offset}`);
    const items = data.news || [];
    state.news = reset ? items : [...state.news, ...items];
    state.newsPagination.offset = state.news.length;
    state.newsPagination.hasMore = Boolean(data.pagination?.hasMore);
  } finally {
    state.newsPagination.loading = false;
    renderNews();
  }
}

function setupNewsInfiniteScroll() {
  if (!els.newsScrollSentinel) return;

  if (!("IntersectionObserver" in window)) {
    window.addEventListener("scroll", () => {
      if (state.activeView !== "dashboard") return;
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
      if (nearBottom) loadNewsPage();
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (state.activeView !== "dashboard") return;
      if (entries.some((entry) => entry.isIntersecting)) loadNewsPage();
    },
    { rootMargin: "220px 0px" }
  );
  observer.observe(els.newsScrollSentinel);
}

function renderActiveGameweek() {
  const gw = state.activeGameweek;

  if (!gw) {
    els.seasonStatus.textContent = "Sin jornada activa";
    els.liveBadgeText.textContent = "OFF";
    els.matchesList.innerHTML = `<p class="hint">No hay jornadas creadas todavia.</p>`;
    return;
  }

  els.seasonStatus.textContent = `${gw.name} - ${gw.status.toUpperCase()} - presupuesto ${formatEuro(state.user?.budget || 0)}`;
  els.liveBadgeText.textContent = gw.status.toUpperCase();
  els.matchesList.innerHTML = (gw.matches || [])
    .map((match) => {
      const scores = (match.playerScores || [])
        .filter((score) => score.played !== false)
        .slice()
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
        .map((score) => `${escapeHtml(score.player?.name || "Jugador")} ${score.points > 0 ? "+" : ""}${score.points}`)
        .join(" · ");

      return `
        <button class="match-card match-card-button" type="button" data-match-detail="${match._id}">
          <div class="match-teams">
            ${clubIdentity(match.homeClub)}
            <strong>${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}</strong>
            ${clubIdentity(match.awayClub)}
          </div>
          <div class="score-line match-kickoff">${formatDateTime(match.kickoff)}</div>
          <div class="score-line">${escapeHtml(match.status)}${scores ? ` · ${scores}` : ""}</div>
        </button>
      `;
    })
    .join("") || `<p class="hint">Esta jornada aun no tiene partidos.</p>`;
}

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function matchById(matchId) {
  return (state.activeGameweek?.matches || []).find((match) => objectId(match._id) === String(matchId));
}

function scorePlayerClubId(score) {
  return objectId(score.player?.club);
}

function scoreClass(points) {
  return points > 0 ? "positive" : points < 0 ? "negative" : "";
}

const SCORE_CARD_LABELS = {
  none: "Ninguna",
  second_yellow: "Doble amarilla",
  direct_red: "Roja directa"
};

function scoreCardLabel(card) {
  return SCORE_CARD_LABELS[card] || SCORE_CARD_LABELS.none;
}

function isMatchMvp(match, player) {
  return Boolean(match?.mvp) && objectId(match.mvp) === objectId(player);
}

function scoreActionToken(label, value, title, className = "") {
  return `<span class="score-action-token ${className}" title="${escapeHtml(title)}"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`;
}

function picaSymbols(value, played) {
  const count = played ? Math.max(0, Math.min(3, Number(value || 0))) : 0;
  return count ? "&spades;".repeat(count) : "-";
}

function renderPicaIcons(value, played) {
  const count = played ? Math.max(0, Math.min(3, Number(value || 0))) : 0;
  const icons = picaSymbols(value, played);
  const title = count ? `${count} ${count === 1 ? "pica" : "picas"}` : "Sin picas";
  return `<span class="score-action-token pica-icons" title="${title}" aria-label="${title}">${icons}</span>`;
}

function renderCompactScoreActions(match, score) {
  if (!score.played) {
    return `<span class="score-action-token no-play">No jugo</span>${renderPicaIcons(0, false)}`;
  }

  const actions = [];
  if (Number(score.commonGoals || 0) > 0) actions.push(scoreActionToken("G", score.commonGoals, "Goles en juego"));
  if (Number(score.specialGoals || 0) > 0) actions.push(scoreActionToken("P/D", score.specialGoals, "Goles de penalti o dado"));
  if (Number(score.assists || 0) > 0) actions.push(scoreActionToken("A", score.assists, "Asistencias"));
  if (Number(score.penaltySaves || 0) > 0) actions.push(scoreActionToken("PP", score.penaltySaves, "Penaltis parados"));
  actions.push(renderPicaIcons(score.picas, true));
  if (score.card === "second_yellow") actions.push(scoreActionToken("2A", "", "Doble amarilla", "card-action"));
  if (score.card === "direct_red") actions.push(scoreActionToken("RD", "", "Roja directa", "card-action"));
  if (isMatchMvp(match, score.player)) actions.push(scoreActionToken("MVP", "", "MVP del partido: +3 puntos", "mvp-action"));
  return actions.join("");
}

function matchScoresForClub(match, club) {
  const clubId = objectId(club);
  return (match.playerScores || [])
    .filter((score) => scorePlayerClubId(score) === clubId)
    .slice()
    .sort((a, b) => {
      if (Boolean(b.played) !== Boolean(a.played)) return Number(b.played) - Number(a.played);
      return Number(b.points || 0) - Number(a.points || 0) || String(a.player?.name || "").localeCompare(String(b.player?.name || ""));
    });
}

function renderMatchScoreRows(match, club) {
  const rows = matchScoresForClub(match, club);
  if (!rows.length) return `<p class="hint">Sin puntuaciones guardadas para este equipo.</p>`;

  return rows
    .map((score) => {
      return `
        <article class="match-score-row ${score.played ? "" : "not-played"}">
          <div class="match-score-player">
            <strong>${escapeHtml(score.player?.name || "Jugador")}</strong>
            <small>${escapeHtml(score.player?.position || "-")} · ${score.played ? "Jugado" : "No jugo"}</small>
          </div>
          <div class="match-score-actions" aria-label="Acciones de ${escapeHtml(score.player?.name || "Jugador")}">
            ${renderCompactScoreActions(match, score)}
          </div>
          <strong class="match-score-points ${scoreClass(Number(score.points || 0))}">${formatPoints(score.points)}</strong>
        </article>
      `;
    })
    .join("");
}

function setMatchDetailTeam(team) {
  els.matchDetailBody.querySelectorAll("[data-match-team]").forEach((button) => {
    button.classList.toggle("active", button.dataset.matchTeam === team);
  });
  els.matchDetailBody.querySelectorAll("[data-match-team-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.matchTeamPanel !== team);
  });
}

function openMatchDetail(matchId) {
  const match = matchById(matchId);
  if (!match) return;

  const homeName = match.homeClub?.shortName || match.homeClub?.name || "LOC";
  const awayName = match.awayClub?.shortName || match.awayClub?.name || "VIS";
  const mvpScore = (match.playerScores || []).find((score) => isMatchMvp(match, score.player));
  els.matchDetailTitle.textContent = `${homeName} ${match.homeScore ?? "-"}:${match.awayScore ?? "-"} ${awayName}`;
  els.matchDetailBody.innerHTML = `
    <div class="match-detail-score">
      ${clubIdentity(match.homeClub, { fullName: true, className: "match-detail-club" })}
      <strong>${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}</strong>
      ${clubIdentity(match.awayClub, { fullName: true, className: "match-detail-club" })}
    </div>
    ${mvpScore ? `<div class="match-detail-mvp"><span>MVP del partido</span><strong>${escapeHtml(mvpScore.player?.name || "Jugador")}</strong><b>+3 pts</b></div>` : ""}
    <div class="match-detail-tabs" role="tablist">
      <button class="active" data-match-team="home" type="button">${escapeHtml(homeName)}</button>
      <button data-match-team="away" type="button">${escapeHtml(awayName)}</button>
    </div>
    <div class="match-team-panel" data-match-team-panel="home">
      <div class="match-score-list">${renderMatchScoreRows(match, match.homeClub)}</div>
    </div>
    <div class="match-team-panel hidden" data-match-team-panel="away">
      <div class="match-score-list">${renderMatchScoreRows(match, match.awayClub)}</div>
    </div>
  `;
  els.matchDetailModal.classList.remove("hidden");
}

function closeMatchDetail() {
  els.matchDetailModal.classList.add("hidden");
}

function renderSquad() {
  const squad = state.currentLineup?.players || [];
  const value = squad.reduce((sum, player) => sum + Number(player.marketValue || 0), 0);
  els.squadValue.textContent = formatEuro(value);

  els.squadList.innerHTML = squad.length
    ? squad
        .map((player) => renderPlayerCard(player, { compact: true }))
        .join("")
    : `<p class="hint">Ya no necesitas fichar. Prepara tu siete directamente en Alineacion usando el presupuesto disponible.</p>`;
}

function renderPlayerCard(player, options = {}) {
  const club = player.club?.shortName || player.club?.name || "FA";
  const tag = options.market ? "button" : "article";
  const attrs = options.market ? `type="button" data-player-detail="${player._id}"` : "";

  if (options.market) {
    const availability = playerAvailability(player);
    return `
      <button class="player-card market-player-card sports-player-card" type="button" data-player-detail="${player._id}">
        <div class="sports-player-identity">
          ${clubBadge(player.club)}
          ${positionBadge(player.position, { compact: true })}
        </div>
        ${playerPortrait(player, "sports-player-avatar")}
        <div class="player-main sports-player-main">
          <small>${escapeHtml(player.club?.name || club)}</small>
          <strong>${escapeHtml(player.name)}</strong>
          <div class="sports-player-meta">
            <span class="market-player-status status-${availability.status}" title="${escapeHtml(availability.note || availability.label)}"><i aria-hidden="true"></i>${escapeHtml(availability.label)}</span>
            ${playerFormIndicator(player)}
            <span class="market-player-points">${Number(player.totalPoints || 0)} pts</span>
            <span class="market-player-usage">${Number(player.lineupUsage || 0)} usos</span>
            <span class="market-player-efficiency">${valueEfficiency(player).toFixed(2)} pts/M</span>
          </div>
        </div>
        <div class="sports-player-value">
          <small>Valor</small>
          <strong>${formatEuro(player.marketValue)}</strong>
          ${stableMarketBadge(player)}
        </div>
        <span class="sports-player-chevron" aria-hidden="true">›</span>
      </button>
    `;
  }

  return `
    <${tag} class="player-card" ${attrs}>
      ${compactPlayerAvatar(player)}
      <div class="player-main">
        <strong>${escapeHtml(player.name)}</strong>
        <small>${escapeHtml(player.position)} · ${escapeHtml(club)} · ${formatEuro(player.marketValue)} · ${player.totalPoints || 0} pts</small>
      </div>
      ${playerFormIndicator(player)}
    </${tag}>
  `;
}

async function refreshCore() {
  const [me, activeGameweek, players, clubs] = await Promise.all([
    api("/api/auth/me"),
    api("/api/gameweeks/active"),
    api("/api/players"),
    api("/api/clubs")
  ]);

  state.user = me.user;
  state.activeGameweek = activeGameweek.gameweek;
  state.players = players.players;
  state.clubs = clubs.clubs;
  state.playerStatsCache = {};
  await loadNewsPage({ reset: true });
  renderShell();
}

async function handleAuth(event) {
  event.preventDefault();
  try {
    const body = {
      email: els.emailInput.value,
      password: els.passwordInput.value
    };

    if (state.authMode === "register") {
      body.teamName = els.teamNameInput.value;
    }

    const data = await api(`/api/auth/${state.authMode}`, {
      method: "POST",
      body
    });

    setSession(data.token, data.user);
    await refreshCore();
    await loadLeaderboard();
    showToast("Sesion iniciada.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderProfile() {
  if (!state.user || state.user.role !== "user" || !els.profileInfo) return;

  els.profileEmailInput.value = state.user.email || "";
  els.profileTeamNameInput.value = state.user.teamName || "";
  els.profileInfo.innerHTML = `
    <article class="metric-card"><span>Equipo</span><strong>${escapeHtml(state.user.teamName || "-")}</strong></article>
    <article class="metric-card"><span>Email</span><strong>${escapeHtml(state.user.email || "-")}</strong></article>
    <article class="metric-card"><span>Estado</span><strong>${escapeHtml(state.user.status || "-")}</strong></article>
    <article class="metric-card"><span>Presupuesto</span><strong>${formatEuro(state.user.budget || 0)}</strong></article>
    <article class="metric-card"><span>Puntos</span><strong>${state.user.totalPoints || 0}</strong></article>
    <article class="metric-card"><span>Jugadores liga</span><strong>${state.players.length || 0}</strong></article>
  `;
}

async function saveProfileTeam(event) {
  event.preventDefault();
  try {
    const data = await api("/api/auth/profile", {
      method: "PATCH",
      body: {
        teamName: els.profileTeamNameInput.value
      }
    });

    setSession(state.token, data.user);
    showToast("Nombre de equipo actualizado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function saveProfilePassword(event) {
  event.preventDefault();
  try {
    const data = await api("/api/auth/profile", {
      method: "PATCH",
      body: {
        currentPassword: els.profileCurrentPasswordInput.value,
        newPassword: els.profileNewPasswordInput.value,
        confirmPassword: els.profileConfirmPasswordInput.value
      }
    });

    setSession(state.token, data.user);
    els.profilePasswordForm.reset();
    showToast("Password actualizada.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadMarket() {
  try {
    const data = await api("/api/market");
    state.marketPlayers = data.players;
    state.playerStatsCache = {};
    renderMarketClubFilter();
    renderMarket();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderMarketClubFilter() {
  const current = els.marketClubFilter.value;
  els.marketClubFilter.innerHTML = `
    <option value="">Todos los clubes</option>
    ${(state.clubs || [])
      .map((club) => `<option value="${club._id}">${escapeHtml(club.shortName || club.name)} · ${escapeHtml(club.name)}</option>`)
      .join("")}
  `;
  if ([...els.marketClubFilter.options].some((option) => option.value === current)) {
    els.marketClubFilter.value = current;
  }
}

function renderMarket() {
  const position = els.positionFilter.value;
  const clubId = els.marketClubFilter.value;
  const search = els.playerSearch.value.trim().toLowerCase();
  const minPoints = els.minPointsFilter.value === "" ? null : Number(els.minPointsFilter.value);
  const maxPrice = els.maxPriceFilter.value === "" ? null : Number(els.maxPriceFilter.value);
  const sort = els.marketSort.value;
  const mode = state.marketMode || "all";
  const filtered = state.marketPlayers.filter((player) => {
    const club = player.club?.name || player.club?.shortName || "";
    const matchesPosition = !position || player.position === position;
    const matchesClub = !clubId || objectId(player.club) === clubId;
    const matchesSearch = !search || `${player.name} ${club}`.toLowerCase().includes(search);
    const matchesPoints = minPoints === null || Number(player.totalPoints || 0) >= minPoints;
    const matchesPrice = maxPrice === null || Number(player.marketValue || 0) <= maxPrice;
    return matchesPosition && matchesClub && matchesSearch && matchesPoints && matchesPrice;
  });

  let list = filtered.slice();
  let hint = "Listado completo con los filtros activos.";

  if (mode === "mostUsed") {
    hint = "Top 10 jugadores mas usados en alineaciones.";
    list.sort(
      (a, b) =>
        Number(b.lineupUsage || 0) - Number(a.lineupUsage || 0) ||
        Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
    );
    list = list.slice(0, 10);
  } else if (mode === "undervalued") {
    hint = "Top 10 infravalorados: puntos altos con precio contenido.";
    list = list
      .filter((player) => Number(player.totalPoints || 0) > 0)
      .sort((a, b) => undervaluedScore(b) - undervaluedScore(a) || Number(a.marketValue || 0) - Number(b.marketValue || 0))
      .slice(0, 10);
  } else if (mode === "value") {
    hint = "Top 10 calidad/precio por puntos acumulados por millon.";
    list = list
      .filter((player) => Number(player.totalPoints || 0) > 0)
      .sort((a, b) => valueEfficiency(b) - valueEfficiency(a) || Number(b.totalPoints || 0) - Number(a.totalPoints || 0))
      .slice(0, 10);
  } else if (mode === "risers") {
    hint = "Top 10 mayores subidas tras la ultima actualizacion.";
    list = list
      .filter((player) => Number(player.marketValueChange || 0) > 0)
      .sort((a, b) => Number(b.marketValueChange || 0) - Number(a.marketValueChange || 0))
      .slice(0, 10);
  } else if (mode === "fallers") {
    hint = "Top 10 mayores bajadas tras la ultima actualizacion.";
    list = list
      .filter((player) => Number(player.marketValueChange || 0) < 0)
      .sort((a, b) => Number(a.marketValueChange || 0) - Number(b.marketValueChange || 0))
      .slice(0, 10);
  } else {
    list.sort((a, b) => {
      if (sort === "priceDesc") return Number(b.marketValue || 0) - Number(a.marketValue || 0);
      if (sort === "priceAsc") return Number(a.marketValue || 0) - Number(b.marketValue || 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.totalPoints || 0) - Number(a.totalPoints || 0) || Number(b.marketValue || 0) - Number(a.marketValue || 0);
    });
  }

  $$("[data-market-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.marketMode === mode);
  });
  els.marketModeHint.textContent = hint;

  els.marketList.innerHTML = list.length
    ? list.map((player) => renderPlayerCard(player, { market: true })).join("")
    : `<p class="hint">No hay jugadores con esos filtros.</p>`;
}

async function openPlayerDetail(playerId) {
  try {
    const data = state.playerStatsCache[playerId] || await api(`/api/players/${playerId}/stats`);
    state.playerStatsCache[playerId] = data;
    renderSportsPlayerDetail(data);
    els.playerDetailModal.classList.remove("hidden");
    document.body.classList.add("player-detail-open");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderPlayerDetail(data) {
  const player = data.player;
  const club = player.club?.name || "Sin equipo";
  els.playerDetailTitle.textContent = player.name;
  els.playerDetailBody.innerHTML = `
    <div class="player-detail-hero">
      ${compactPlayerAvatar(player, "person-icon")}
      <div>
        <strong>${escapeHtml(player.name)}</strong>
        ${marketChangeBadge(player)}
        <small>${escapeHtml(player.position)} - ${escapeHtml(club)} - ${formatEuro(player.marketValue)}</small>
      </div>
    </div>
    <div class="metric-grid mini">
      <article class="metric-card"><span>Puntos</span><strong>${data.summary.totalPoints}</strong></article>
      <article class="metric-card"><span>Alineaciones</span><strong>${data.summary.totalLineups}</strong></article>
      <article class="metric-card"><span>Jornadas puntuando</span><strong>${data.summary.scoredGameweeks}</strong></article>
    </div>
    <div class="stats-table">
      <div class="stats-row stats-head">
        <span>Jornada</span>
        <span>Uso</span>
        <span>Puntos</span>
      </div>
      ${(data.byGameweek || [])
        .map((row) => {
          const match = row.match
            ? `${row.match.homeClub?.shortName || "LOC"} ${row.match.homeScore ?? "-"}:${row.match.awayScore ?? "-"} ${row.match.awayClub?.shortName || "VIS"}`
            : "Sin partido";
          const canOpen = row.score ? "" : "disabled";
          return `
            <button class="stats-row stats-row-button" type="button" data-player-score-row="${row.gameweekId}" ${canOpen}>
              <span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(match)} - ${escapeHtml(row.status)}</small></span>
              <span>${row.usedBy}</span>
              <span class="${row.points > 0 ? "positive" : row.points < 0 ? "negative" : ""}">${formatPoints(row.points)}</span>
            </button>
            <div class="player-score-detail hidden" data-player-score-detail="${row.gameweekId}">
              ${renderPlayerScoreDetail(row)}
            </div>
          `;
        })
        .join("") || `<p class="hint">Sin jornadas registradas.</p>`}
    </div>
  `;
}

function renderSportsPlayerDetail(data) {
  const player = data.player;
  const club = player.club?.name || "Sin equipo";
  const rows = data.byGameweek || [];
  const playedRows = rows.filter((row) => row.score?.played);
  const average = playedRows.length
    ? playedRows.reduce((sum, row) => sum + Number(row.points || 0), 0) / playedRows.length
    : 0;
  const nextMatch = rows
    .filter((row) => row.match && !row.match.isScored && ["draft", "live"].includes(row.status))
    .sort((a, b) => Number(a.number) - Number(b.number))[0];
  const currentValue = Number(player.marketValue || 0);
  const previousValue = Number(player.previousMarketValue || currentValue - Number(player.marketValueChange || 0) || currentValue);
  const changePercent = previousValue ? (Number(player.marketValueChange || 0) / previousValue) * 100 : 0;
  const maxUsage = Math.max(...rows.map((row) => Number(row.usedBy || 0)), 1);
  const availability = playerAvailability(player);

  els.playerDetailTitle.textContent = "Ficha de jugador";
  els.playerDetailBody.innerHTML = `
    <section class="sports-profile-hero" style="--club-color:${escapeHtml(player.club?.primaryColor || "#2f7cff")}">
      <div class="sports-profile-club">${clubBadge(player.club, "profile-club-badge")}</div>
      ${playerPortrait(player, "sports-profile-silhouette")}
      <div class="sports-profile-position">${positionBadge(player.position, { compact: true })}</div>
      <div class="sports-profile-copy">
        <small>${escapeHtml(club)}</small>
        <h2>${escapeHtml(player.name)}</h2>
        <span class="player-status-label status-${availability.status}" title="${escapeHtml(availability.note || availability.label)}">${escapeHtml(availability.label)}</span>
      </div>
    </section>
    <nav class="player-detail-tabs" role="tablist" aria-label="Informacion del jugador">
      <button class="active" data-player-detail-tab="summary" type="button">Resumen</button>
      <button data-player-detail-tab="points" type="button">Puntos</button>
      <button data-player-detail-tab="value" type="button">Valor</button>
      <button data-player-detail-tab="usage" type="button">Uso</button>
      <button data-player-detail-tab="news" type="button">Noticias${data.relatedNews?.length ? `<span>${data.relatedNews.length}</span>` : ""}</button>
    </nav>
    <div class="player-detail-panels">
      ${renderProfileSummaryTab({ player, club, data, average, nextMatch, availability })}
      ${renderProfilePointsTab(rows)}
      ${renderProfileValueTab({ player, currentValue, previousValue, changePercent })}
      ${renderProfileUsageTab({ rows, total: data.summary.totalLineups, maxUsage })}
      ${renderProfileNewsTab(data.relatedNews || [])}
    </div>
  `;
}

function renderProfileSummaryTab({ player, club, data, average, nextMatch, availability }) {
  return `
    <section class="player-detail-tab-panel active" data-player-detail-panel="summary">
      <div class="profile-summary-grid">
        <article class="profile-stat primary"><small>Puntos totales</small><strong>${Number(data.summary.totalPoints || 0)}</strong><span>${average.toFixed(1)} de media</span></article>
        <article class="profile-stat"><small>Valor actual</small><strong>${formatEuro(player.marketValue)}</strong>${stableMarketBadge(player)}</article>
        <article class="profile-stat"><small>Usos oficiales</small><strong>${Number(data.summary.totalLineups || 0)}</strong><span>${Number(data.summary.scoredGameweeks || 0)} jornadas puntuando</span></article>
        <article class="profile-stat"><small>Forma</small>${playerFormIndicator(player, { withLabel: true })}<span>Calculada tras la ultima jornada</span></article>
      </div>
      ${nextMatch ? `
        <section class="profile-section">
          <div class="profile-section-title"><h3>Proximo partido</h3><span>${escapeHtml(nextMatch.name)}</span></div>
          <div class="next-match-card">
            ${clubIdentity(nextMatch.match.homeClub, { fullName: true, className: "next-match-club" })}
            <span><b>${formatDateTime(nextMatch.match.kickoff)}</b><small>Jornada ${Number(nextMatch.number)}</small></span>
            ${clubIdentity(nextMatch.match.awayClub, { fullName: true, className: "next-match-club" })}
          </div>
        </section>
      ` : `
        <section class="profile-section">
          <div class="profile-section-title"><h3>Proximo partido</h3><span>Calendario</span></div>
          <div class="profile-next-empty">Sin partidos futuros programados.</div>
        </section>
      `}
      <section class="profile-section">
        <div class="profile-section-title"><h3>Informacion</h3></div>
        <div class="profile-info-list">
          <div><span>Club</span><strong>${escapeHtml(club)}</strong></div>
          <div><span>Posicion</span><strong>${escapeHtml(POSITION_META[player.position]?.label || player.position)}</strong></div>
          <div><span>Dorsal</span><strong>${player.shirtNumber ? `#${Number(player.shirtNumber)}` : "-"}</strong></div>
          <div class="profile-status-info"><span>Estado</span><strong class="status-${availability.status}">${escapeHtml(availability.label)}</strong>${availability.note ? `<small>${escapeHtml(availability.note)}</small>` : ""}</div>
        </div>
      </section>
    </section>
  `;
}

function renderProfilePointsTab(rows) {
  return `
    <section class="player-detail-tab-panel" data-player-detail-panel="points">
      <div class="profile-section-title"><h3>Puntos por jornada</h3><span>Toca una jornada para ver el desglose</span></div>
      <div class="stats-table sports-stats-table">
        <div class="stats-row stats-head"><span>Jornada y partido</span><span>Uso</span><span>Puntos</span></div>
        ${rows.map((row) => {
          const match = row.match
            ? `${row.match.homeClub?.shortName || "LOC"} ${row.match.homeScore ?? "-"}:${row.match.awayScore ?? "-"} ${row.match.awayClub?.shortName || "VIS"}`
            : "Sin partido";
          return `
            <button class="stats-row stats-row-button" type="button" data-player-score-row="${row.gameweekId}" ${row.score ? "" : "disabled"}>
              <span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(match)} - ${escapeHtml(row.status)}</small></span>
              <span>${Number(row.usedBy || 0)}</span>
              <span class="points-result ${row.points > 0 ? "positive" : row.points < 0 ? "negative" : ""}">${formatPoints(row.points)}</span>
            </button>
            <div class="player-score-detail hidden" data-player-score-detail="${row.gameweekId}">${renderPlayerScoreDetail(row)}</div>
          `;
        }).join("") || `<p class="hint">Sin jornadas registradas.</p>`}
      </div>
    </section>
  `;
}

function renderProfileValueTab({ player, currentValue, previousValue, changePercent }) {
  return `
    <section class="player-detail-tab-panel" data-player-detail-panel="value">
      <div class="value-overview"><span>Valor de mercado</span><strong>${formatEuro(currentValue)}</strong>${stableMarketBadge(player)}</div>
      <div class="value-comparison">
        <div><small>Valor anterior</small><strong>${formatEuro(previousValue)}</strong></div>
        <div><small>Ultimo cambio</small><strong class="${Number(player.marketValueChange || 0) > 0 ? "positive" : Number(player.marketValueChange || 0) < 0 ? "negative" : ""}">${formatSignedEuro(player.marketValueChange || 0)}</strong></div>
        <div><small>Variacion</small><strong class="${changePercent > 0 ? "positive" : changePercent < 0 ? "negative" : ""}">${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%</strong></div>
        <div><small>Calidad / precio</small><strong>${valueEfficiency(player).toFixed(2)} pts/M</strong></div>
      </div>
      <div class="value-track" aria-label="Cambio de valor respecto a la actualizacion anterior"><span style="width:${Math.min(100, Math.max(8, 50 + changePercent))}%"></span></div>
      <p class="profile-note">La app conserva el valor anterior y el ultimo cambio calculado al cerrar jornada.</p>
    </section>
  `;
}

function renderProfileUsageTab({ rows, total, maxUsage }) {
  return `
    <section class="player-detail-tab-panel" data-player-detail-panel="usage">
      <div class="usage-summary"><span>Presencia en alineaciones oficiales</span><strong>${Number(total || 0)}</strong></div>
      <div class="usage-history">
        ${rows.map((row) => `
          <div class="usage-row">
            <span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.status)}</small></span>
            <div class="usage-bar"><span style="width:${Math.max(0, Math.min(100, (Number(row.usedBy || 0) / maxUsage) * 100))}%"></span></div>
            <strong>${Number(row.usedBy || 0)}</strong>
          </div>
        `).join("") || `<p class="hint">Todavia no hay usos oficiales.</p>`}
      </div>
    </section>
  `;
}

function renderProfileNewsTab(news) {
  return `
    <section class="player-detail-tab-panel" data-player-detail-panel="news">
      <div class="profile-section-title"><h3>Noticias relacionadas</h3><span>Mundo Las Pulgas</span></div>
      <div class="player-related-news">
        ${news.map((article) => `
          <a href="/mundolaspulgas/noticias/${encodeURIComponent(article.slug)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(article.imageUrl || "/assets/stadium-bg.png")}" alt="" />
            <span><small>${formatDateTime(article.publishedAt)}</small><strong>${escapeHtml(article.title)}</strong><em>${escapeHtml(article.excerpt || "")}</em></span>
          </a>
        `).join("") || `<div class="empty-player-news"><strong>Sin noticias relacionadas</strong><span>Las noticias asociadas desde Mundo Las Pulgas apareceran aqui.</span></div>`}
      </div>
    </section>
  `;
}

function setPlayerDetailTab(tab) {
  els.playerDetailBody.querySelectorAll("[data-player-detail-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.playerDetailTab === tab);
  });
  els.playerDetailBody.querySelectorAll("[data-player-detail-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.playerDetailPanel === tab);
  });
}

function renderPlayerScoreDetail(row) {
  const score = row.score;
  if (!score) return `<p class="hint">Esta jornada no tiene puntuacion detallada para el jugador.</p>`;
  const calculatedPoints = Number(score.calculatedPoints ?? score.points ?? 0);
  const savedPoints = Number(score.points || 0);
  const totalDetail = calculatedPoints === savedPoints ? "Suma del detalle" : `Calculado: ${formatPoints(calculatedPoints)}`;

  const stats = [
    ["Jugo", score.played ? "Si" : "No"],
    ["Goles", score.commonGoals || 0],
    ["Pen/Dado", score.specialGoals || 0],
    ["Asist.", score.assists || 0],
    ["Pen. par.", score.penaltySaves || 0],
    ["Picas", score.picas || 0],
    ["Encajados", score.goalsAgainst || 0],
    ["Tarjeta", scoreCardLabel(score.card)],
    ["MVP", score.isMvp ? "Si (+3)" : "No"]
  ];

  return `
    <div class="player-score-stat-grid">
      ${stats
        .map(
          ([label, value]) => `
            <span>
              <small>${escapeHtml(label)}</small>
              <strong>${label === "Picas" ? picaSymbols(value, score.played) : escapeHtml(value)}</strong>
            </span>
          `
        )
        .join("")}
    </div>
    <div class="player-score-breakdown">
      ${(score.lines || [])
        .map(
          (line) => `
            <div class="score-breakdown-row">
              <span><strong>${escapeHtml(line.label)}</strong><small>${escapeHtml(line.detail || "")}</small></span>
              <strong class="${scoreClass(Number(line.points || 0))}">${formatPoints(line.points)}</strong>
            </div>
          `
        )
        .join("")}
      <div class="score-breakdown-row total">
        <span><strong>Total jornada</strong><small>${escapeHtml(totalDetail)}</small></span>
        <strong class="${scoreClass(Number(score.points || 0))}">${formatPoints(score.points)}</strong>
      </div>
    </div>
  `;
}

function togglePlayerScoreDetail(gameweekId) {
  const detail = [...els.playerDetailBody.querySelectorAll("[data-player-score-detail]")].find(
    (item) => item.dataset.playerScoreDetail === gameweekId
  );
  const button = [...els.playerDetailBody.querySelectorAll("[data-player-score-row]")].find(
    (item) => item.dataset.playerScoreRow === gameweekId
  );

  if (!detail || !button) return;
  detail.classList.toggle("hidden");
  button.classList.toggle("active", !detail.classList.contains("hidden"));
}

function closePlayerDetail() {
  els.playerDetailModal.classList.add("hidden");
  document.body.classList.remove("player-detail-open");
}

async function loadLineup() {
  try {
    await refreshCore();
    const gw = state.activeGameweek;

    if (!gw?._id) {
      state.currentLineup = null;
      state.lineupDraft = null;
      renderLineup();
      return;
    }

    const data = await api(`/api/lineups/${gw._id}`);
    state.currentLineup = data.lineup;
    state.lineupDraft = data.lineup
      ? {
          formation: data.lineup.formation || "2-2-2",
          playerIds: (data.lineup.players || []).map((player) => player._id)
        }
      : null;
    renderLineup();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderLineup() {
  const gw = state.activeGameweek;

  if (!gw) {
    els.lineupPlayers.innerHTML = `<p class="hint">No hay jornada disponible.</p>`;
    els.lineupHelp.textContent = "Selecciona 7 jugadores contando el portero.";
    els.lineupCap.textContent = `Restante ${formatEuro(0)} / Total ${formatEuro(0)}`;
    els.lineupCount.textContent = "0 puestos";
    updateLineupSubmitState();
    return;
  }

  const eligiblePlayers = eligibleLineupPlayers();
  const eligiblePlayerIds = new Set(eligiblePlayers.map((player) => player._id));
  const savedPlayers = (state.currentLineup?.players || [])
    .map((player) => player._id)
    .filter((playerId) => eligiblePlayerIds.has(playerId));
  if (!state.lineupDraft) {
    state.lineupDraft = {
      formation: state.currentLineup?.formation || "2-2-2",
      playerIds: savedPlayers
    };
  }

  state.lineupDraft.playerIds = (state.lineupDraft.playerIds || []).filter((playerId) => eligiblePlayerIds.has(playerId));

  if (!FORMATIONS.includes(state.lineupDraft.formation)) {
    state.lineupDraft.formation = "2-2-2";
  }

  renderFormationSelect();
  els.lineupHelp.textContent =
    gw.status === "draft"
      ? "Elige jugadores de los equipos que juegan esta jornada sin superar tu presupuesto."
      : `La jornada esta ${gw.status}; la alineacion ya no se puede editar.`;

  updateLineupSubmitState();

  if (!eligiblePlayers.length) {
    els.lineupPlayers.innerHTML = `<p class="hint">No hay jugadores alineables: configura primero los partidos de esta jornada.</p>`;
    els.lineupCount.textContent = "0 puestos";
    updateLineupCapFromSelection();
    return;
  }

  renderPitch();

  updateLineupCapFromSelection();
}

function renderFormationSelect() {
  els.formationSelect.disabled = state.activeGameweek?.status !== "draft" || state.lineupSaving;
  els.formationSelect.innerHTML = FORMATIONS.map((formation) => {
    const selected = formation === state.lineupDraft.formation ? "selected" : "";
    return `<option value="${formation}" ${selected}>1-${formation} · ${formationPlayerCount(formation)} jugadores</option>`;
  }).join("");
  els.lineupCount.textContent = `${formationPlayerCount(state.lineupDraft.formation)} puestos`;
}

function renderPitch() {
  const formation = state.lineupDraft.formation;
  const slots = formationSlots(formation);
  const selectedBySlot = alignDraftToSlots(slots);
  const disabled = state.activeGameweek?.status !== "draft" || state.lineupSaving ? "disabled" : "";
  const lines = [
    { position: "DEL", slots: slots.filter((slot) => slot.position === "DEL") },
    { position: "MED", slots: slots.filter((slot) => slot.position === "MED") },
    { position: "DEF", slots: slots.filter((slot) => slot.position === "DEF") },
    { position: "POR", slots: slots.filter((slot) => slot.position === "POR") }
  ];

  els.lineupPlayers.innerHTML = `
    <div class="pitch-mark center-circle"></div>
    <div class="pitch-mark box-top"></div>
    <div class="pitch-mark box-bottom"></div>
    ${lines
      .map(
        (line) => `
        <div class="pitch-line pitch-line-${line.position.toLowerCase()}">
          ${line.slots
            .map((slot) => renderLineupSlot(slot, selectedBySlot.get(slot.key), disabled))
            .join("")}
        </div>
      `
      )
      .join("")}
  `;
}

function alignDraftToSlots(slots) {
  const selectedByPosition = { POR: [], DEF: [], MED: [], DEL: [] };
  for (const playerId of state.lineupDraft.playerIds || []) {
    const player = playerById(playerId);
    if (player?.position) selectedByPosition[player.position].push(playerId);
  }

  const selectedBySlot = new Map();
  for (const slot of slots) {
    const playerId = selectedByPosition[slot.position].shift() || "";
    selectedBySlot.set(slot.key, playerId);
  }

  state.lineupDraft.playerIds = slots.map((slot) => selectedBySlot.get(slot.key)).filter(Boolean);
  return selectedBySlot;
}

function renderLineupSlot(slot, selectedPlayerId, disabled) {
  const player = playerById(selectedPlayerId);
  const points = selectedPlayerId ? lineupPointsForPlayer(selectedPlayerId) : 0;
  const pointClass = points > 0 ? "positive" : points < 0 ? "negative" : "";
  const club = player?.club?.shortName || player?.club?.name || "";
  const disabledAttr = disabled ? "disabled" : "";

  return `
    <label class="lineup-slot" data-position="${slot.position}">
      <span class="slot-token">${slot.position}</span>
      <span class="slot-points ${pointClass}">${selectedPlayerId ? formatPoints(points) : "0 pts"}</span>
      <input type="hidden" name="slotPlayerIds" data-slot="${slot.key}" data-position="${slot.position}" value="${selectedPlayerId || ""}" />
      <button class="lineup-picker-trigger ${player ? "selected" : ""}" type="button" data-open-lineup-picker="${slot.key}" data-position="${slot.position}" ${disabledAttr}>
        <strong>${player ? escapeHtml(player.name) : POSITION_LABELS[slot.position]}</strong>
        <small>${player ? `${escapeHtml(club)} · ${formatEuro(player.marketValue)}` : "Toca para elegir"}</small>
      </button>
    </label>
  `;
}

function updateLineupCapFromSelection() {
  if (!state.activeGameweek) return;

  const selectedIds = getSelectedLineupPlayerIds();
  const selectedValue = lineupValueForIds(selectedIds);
  const budgetLimit = lineupBudgetLimit();
  const remaining = budgetLimit - selectedValue;

  els.lineupCap.textContent = `Restante ${formatEuro(remaining)} / Total ${formatEuro(budgetLimit)}`;
  els.lineupCap.classList.toggle("over-budget", remaining < 0);
  state.lineupDraft.playerIds = selectedIds;
}

function updateLineupSubmitState() {
  const button = els.lineupSubmitBtn || els.lineupForm?.querySelector("button[type='submit']");
  if (!button) return;

  const canEdit = state.activeGameweek?.status === "draft";
  button.disabled = !canEdit || state.lineupSaving;
  button.classList.toggle("loading", state.lineupSaving);
  button.setAttribute("aria-busy", state.lineupSaving ? "true" : "false");

  const label = button.querySelector("[data-lineup-submit-label]");
  if (label) label.textContent = state.lineupSaving ? "Guardando..." : "Guardar alineacion";
}

function setLineupSaving(isSaving) {
  state.lineupSaving = isSaving;
  updateLineupSubmitState();
}

function getSelectedLineupPlayerIds() {
  const valuesBySlot = new Map(
    $$("input[name='slotPlayerIds']").map((input) => [input.dataset.slot, input.value])
  );
  return formationSlots(state.lineupDraft?.formation || "2-2-2")
    .map((slot) => valuesBySlot.get(slot.key))
    .filter(Boolean);
}

function handleFormationChange() {
  const currentSelections = getSelectedLineupPlayerIds();
  state.lineupDraft = {
    formation: els.formationSelect.value,
    playerIds: currentSelections
  };
  renderLineup();
}

function selectedPlayerIdForSlot(slotKey) {
  return $(`input[name='slotPlayerIds'][data-slot="${slotKey}"]`)?.value || "";
}

function lineupPickerContext() {
  const slotKey = state.lineupPicker.slotKey;
  const selectedPlayerId = selectedPlayerIdForSlot(slotKey);
  const selectedIds = getSelectedLineupPlayerIds();
  const selectedInOtherSlots = new Set(selectedIds.filter((playerId) => playerId && playerId !== selectedPlayerId));
  const baseValue = lineupValueForIds(selectedIds.filter((playerId) => playerId && playerId !== selectedPlayerId));
  return {
    slotKey,
    position: state.lineupPicker.position,
    selectedPlayerId,
    selectedInOtherSlots,
    baseValue,
    budgetLimit: lineupBudgetLimit()
  };
}

function pickerPlayerState(player, context) {
  const value = Number(player.marketValue || 0);
  const isSelected = player._id === context.selectedPlayerId;
  const isUsed = context.selectedInOtherSlots.has(player._id);
  const overBudget = !isSelected && context.baseValue + value > context.budgetLimit;
  const unavailable = player.status !== "available";
  const disabled = !isSelected && (isUsed || unavailable || overBudget);
  const remaining = context.budgetLimit - context.baseValue - value;
  let reason = `${formatEuro(Math.max(remaining, 0))} restante`;

  if (isSelected) reason = "Seleccionado";
  else if (isUsed) reason = "Ya usado";
  else if (unavailable) reason = player.status;
  else if (overBudget) reason = "Supera presupuesto";

  return { disabled, isSelected, reason, remaining };
}

function openLineupPicker(slotKey, position) {
  if (state.activeGameweek?.status !== "draft" || state.lineupSaving) return;

  state.lineupPicker = { slotKey, position };
  els.lineupPickerSearch.value = "";
  renderLineupPicker();
  els.lineupPickerModal.classList.remove("hidden");
  els.lineupPickerSearch.focus();
}

function closeLineupPicker() {
  els.lineupPickerModal.classList.add("hidden");
}

function renderLineupPicker() {
  const context = lineupPickerContext();
  if (!context.slotKey) return;

  const query = els.lineupPickerSearch.value.trim().toLowerCase();
  const selectedValue = lineupValueForIds(getSelectedLineupPlayerIds());
  const remaining = context.budgetLimit - selectedValue;
  els.lineupPickerTitle.textContent = `Elegir ${POSITION_LABELS[context.position]}`;
  els.lineupPickerBudget.textContent = `Presupuesto restante actual: ${formatEuro(remaining)} / ${formatEuro(context.budgetLimit)}`;
  els.lineupPickerClear.disabled = !context.selectedPlayerId;

  const players = eligibleLineupPlayers(context.position)
    .filter((player) => {
      const club = player.club?.shortName || player.club?.name || "";
      return !query || `${player.name} ${club}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const stateA = pickerPlayerState(a, context);
      const stateB = pickerPlayerState(b, context);
      if (stateA.isSelected !== stateB.isSelected) return stateA.isSelected ? -1 : 1;
      if (stateA.disabled !== stateB.disabled) return stateA.disabled ? 1 : -1;
      return Number(b.totalPoints || 0) - Number(a.totalPoints || 0) || Number(a.marketValue || 0) - Number(b.marketValue || 0);
    });

  els.lineupPickerList.innerHTML = players.length
    ? players
        .map((player) => {
          const club = player.club?.shortName || player.club?.name || "SIN";
          const itemState = pickerPlayerState(player, context);
          const disabled = itemState.disabled ? "disabled" : "";
          const stateClass = itemState.isSelected ? "selected" : itemState.disabled ? "blocked" : "";
          const reasonClass = itemState.disabled ? "negative" : itemState.isSelected ? "positive" : "";

          return `
            <button class="lineup-picker-option ${stateClass}" type="button" data-pick-lineup-player="${player._id}" ${disabled}>
              ${compactPlayerAvatar(player)}
              <span class="lineup-picker-main">
                <span class="lineup-picker-player-heading"><strong>${escapeHtml(player.name)}</strong>${playerFormIndicator(player)}</span>
                <small>${escapeHtml(club)} · ${escapeHtml(player.position)} · ${formatEuro(player.marketValue)} · ${player.totalPoints || 0} pts</small>
              </span>
              <span class="pill ${reasonClass}">${escapeHtml(itemState.reason)}</span>
            </button>
          `;
        })
        .join("")
    : `<p class="hint">No hay jugadores de ese puesto en los equipos que juegan esta jornada.</p>`;
}

function updateLineupSlotSelection(slotKey, playerId) {
  const slots = formationSlots(state.lineupDraft.formation);
  const valuesBySlot = new Map(
    $$("input[name='slotPlayerIds']").map((input) => [input.dataset.slot, input.value])
  );
  valuesBySlot.set(slotKey, playerId || "");
  state.lineupDraft.playerIds = slots.map((slot) => valuesBySlot.get(slot.key)).filter(Boolean);
  renderPitch();
  updateLineupCapFromSelection();
}

function selectLineupPickerPlayer(playerId) {
  updateLineupSlotSelection(state.lineupPicker.slotKey, playerId);
  closeLineupPicker();
}

function clearLineupPickerSelection() {
  updateLineupSlotSelection(state.lineupPicker.slotKey, "");
  closeLineupPicker();
}

async function saveLineup(event) {
  event.preventDefault();
  if (state.lineupSaving) return;

  try {
    const gw = state.activeGameweek;
    if (!gw?._id) return;

    const slots = formationSlots(state.lineupDraft.formation);
    const playerIds = getSelectedLineupPlayerIds();
    if (playerIds.length !== slots.length) {
      showToast("Completa todos los puestos de la formacion.", "error");
      return;
    }

    const outsideGameweek = playerIds
      .map((playerId) => playerById(playerId))
      .find((player) => !playerCanPlayLineupGameweek(player, gw));
    if (outsideGameweek) {
      showToast(`${outsideGameweek.name} no juega esta jornada.`, "error");
      return;
    }

    if (lineupValueForIds(playerIds) > lineupBudgetLimit()) {
      showToast("La alineacion supera tu presupuesto.", "error");
      return;
    }

    setLineupSaving(true);

    const data = await api(`/api/lineups/${gw._id}`, {
      method: "POST",
      body: {
        formation: state.lineupDraft.formation,
        playerIds
      }
    });

    state.currentLineup = data.lineup;
    await refreshCore();
    showToast("Alineacion guardada correctamente.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLineupSaving(false);
    renderLineup();
  }
}

async function loadLeaderboard() {
  try {
    const [totalData, gameweeksData] = await Promise.all([
      api("/api/leaderboard"),
      api("/api/gameweeks")
    ]);

    state.leaderboard = totalData.leaderboard;
    state.gameweeks = gameweeksData.gameweeks || [];

    const currentGameweek = state.gameweeks.find((gameweek) => gameweek.status === "live") || state.activeGameweek;
    state.activeGameweekLeaderboard = currentGameweek?._id
      ? await api(`/api/gameweeks/${currentGameweek._id}/leaderboard`)
      : null;

    renderLeaderboard();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function loadHistoryGameweek(gameweekId) {
  try {
    state.historyGameweekDetails[gameweekId] = await api(`/api/gameweeks/${gameweekId}/leaderboard`);
    renderLeaderboard();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function setLeaderboardMode(mode) {
  state.leaderboardMode = mode;
  renderLeaderboard();
}

function renderLeaderboard() {
  const mode = state.leaderboardMode || "total";
  $$("[data-leaderboard-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.leaderboardMode === mode);
  });

  els.leaderboardList.classList.toggle("hidden", mode !== "total");
  els.gameweekLeaderboardList.classList.toggle("hidden", mode !== "current");
  els.historyGameweeksList.classList.toggle("hidden", mode !== "history");

  renderTotalLeaderboard();
  renderCurrentGameweekLeaderboard();
  renderHistoryLeaderboard();
}

function renderTotalLeaderboard() {
  els.leaderboardList.innerHTML = state.leaderboard
    .map(
      (team) => `
      <article class="leader-row">
        <div class="rank">#${team.rank}</div>
        <div>
          <strong>${escapeHtml(team.teamName)}</strong>
          <small>Presupuesto ${formatEuro(team.budget)} - <span class="status-${team.status}">${escapeHtml(team.status)}</span></small>
        </div>
        <strong>${team.totalPoints} pts</strong>
      </article>
    `
    )
    .join("") || `<p class="hint">Todavia no hay equipos en la liga.</p>`;
}

function renderCurrentGameweekLeaderboard() {
  const details = state.activeGameweekLeaderboard;
  const gameweek = details?.gameweek;

  if (!gameweek?._id) {
    els.gameweekLeaderboardList.innerHTML = `<p class="hint">No hay jornada activa para clasificar.</p>`;
    return;
  }

  els.gameweekLeaderboardList.innerHTML = `
    <div class="leaderboard-meta">
      <strong>${escapeHtml(gameweek.name)}</strong>
      <span class="status-${gameweek.status}">${escapeHtml(gameweek.status)}</span>
    </div>
    ${renderGameweekRows(details.leaderboard || [], gameweek)}
  `;
}

function renderHistoryLeaderboard() {
  const gameweeks = (state.gameweeks || []).filter((gameweek) => gameweek.status === "finished");

  els.historyGameweeksList.innerHTML = gameweeks
    .map((gameweek) => {
      const details = state.historyGameweekDetails[gameweek._id];
      return `
        <article class="history-card">
          <div class="history-card-header">
            <div>
              <strong>${escapeHtml(gameweek.name)}</strong>
              <small>Jornada ${gameweek.number} - <span class="status-${gameweek.status}">${escapeHtml(gameweek.status)}</span></small>
            </div>
            <button class="mini-button" data-load-history="${gameweek._id}" type="button">
              ${details ? "Actualizar" : "Ver clasificacion"}
            </button>
          </div>
          <div class="history-standings">
            ${details ? renderGameweekRows(details.leaderboard || [], details.gameweek) : `<p class="hint">Carga la jornada para ver clasificacion y alineaciones.</p>`}
          </div>
        </article>
      `;
    })
    .join("") || `<p class="hint">Todavia no hay jornadas finalizadas.</p>`;
}

function renderGameweekRows(leaderboard, gameweek) {
  if (!leaderboard.length) {
    return `<p class="hint">Esta jornada todavia no tiene alineaciones bloqueadas.</p>`;
  }

  const revealLineups = gameweek.status !== "draft";
  return leaderboard
    .map((team) => {
      const rowContent = `
        <span class="rank">#${team.rank}</span>
        <span>
          <strong>${escapeHtml(team.teamName)}</strong>
          <small>${
            revealLineups
              ? `Formacion 1-${escapeHtml(team.formation || "2-2-2")} - ${formatEuro(team.budgetValue || 0)}`
              : "Alineacion oculta hasta que empiece la jornada"
          }</small>
        </span>
        <strong>${formatPoints(team.points)}</strong>
      `;

      return revealLineups
        ? `
          <button class="leader-row leader-row-button" data-lineup-team="${team.teamId}" data-lineup-gameweek="${gameweek._id}" type="button">
            ${rowContent}
          </button>
        `
        : `
          <article class="leader-row leader-row-locked">
            ${rowContent}
          </article>
        `;
    })
    .join("");
}

function findLineupDetails(gameweekId, teamId) {
  const sources = [
    state.activeGameweekLeaderboard,
    ...Object.values(state.historyGameweekDetails)
  ].filter(Boolean);

  return sources
    .filter((details) => details.gameweek?._id === gameweekId)
    .map((details) => ({
      gameweek: details.gameweek,
      lineup: (details.leaderboard || []).find((team) => team.teamId === teamId)
    }))
    .find((entry) => entry.lineup);
}

function openLineupDetail(gameweekId, teamId) {
  const details = findLineupDetails(gameweekId, teamId);
  if (details?.gameweek?.status === "draft") {
    showToast("La alineacion se podra ver cuando empiece la jornada.", "error");
    return;
  }

  if (!details?.lineup) {
    showToast("No se encontro la alineacion.", "error");
    return;
  }

  const { gameweek, lineup } = details;
  els.lineupDetailTitle.textContent = lineup.teamName;
  els.lineupDetailBody.innerHTML = `
    <div class="lineup-detail-summary">
      <span class="pill">${escapeHtml(gameweek.name)}</span>
      <span class="pill">1-${escapeHtml(lineup.formation || "2-2-2")}</span>
      <span class="pill">${formatPoints(lineup.points)}</span>
    </div>
    <div class="lineup-detail-list">
      ${(lineup.players || [])
        .map((player) => {
          const pointClass = player.gameweekPoints > 0 ? "positive" : player.gameweekPoints < 0 ? "negative" : "";
          const club = player.club?.shortName || player.club?.name || "FA";
          return `
            <article class="lineup-detail-player">
              <span class="slot-token">${escapeHtml(player.position)}</span>
              <div>
                <strong>${escapeHtml(player.name)}</strong>
                <small>${escapeHtml(club)} - ${formatEuro(player.marketValue)}</small>
              </div>
              <strong class="${pointClass}">${formatPoints(player.gameweekPoints)}</strong>
            </article>
          `;
        })
        .join("") || `<p class="hint">Sin jugadores alineados.</p>`}
    </div>
  `;
  els.lineupDetailModal.classList.remove("hidden");
}

function closeLineupDetail() {
  els.lineupDetailModal.classList.add("hidden");
}

function setAdminSection(section) {
  $$(".admin-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminSection === section);
  });
  $$(".admin-section-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.adminSectionPanel === section);
  });
}

function openAdminModal(kind, title) {
  const formMap = {
    player: els.playerForm,
    team: els.teamForm,
    club: els.clubForm,
    news: els.newsForm,
    gameweek: els.gameweekForm,
    match: els.matchForm,
    score: els.scoreForm
  };
  const form = formMap[kind];
  if (!form) return;

  $$(".modal-form").forEach((item) => {
    item.classList.add("hidden");
    item.classList.remove("active");
  });

  els.adminModalTitle.textContent = title || "Editar";
  els.adminModal.classList.toggle("score-modal-open", kind === "score");
  els.adminModalBody.appendChild(form);
  form.classList.remove("hidden");
  form.classList.add("active");
  els.adminModal.classList.remove("hidden");
  form.querySelector("input:not([type='hidden']), select, button")?.focus();
}

function closeAdminModal() {
  els.adminModal.classList.add("hidden");
  els.adminModal.classList.remove("score-modal-open");
  $$(".modal-form").forEach((item) => {
    item.classList.add("hidden");
    item.classList.remove("active");
  });
}

function openCreateModal(kind) {
  if (kind === "player") {
    resetPlayerForm();
    openAdminModal("player", "Nuevo jugador");
    return;
  }

  if (kind === "club") {
    resetClubForm();
    openAdminModal("club", "Nuevo club");
    return;
  }

  if (kind === "news") {
    resetNewsForm();
    openAdminModal("news", "Nueva noticia");
    return;
  }

  if (kind === "gameweek") {
    resetGameweekForm();
    els.gwStatusInput.value = "draft";
    openAdminModal("gameweek", "Nueva jornada");
    return;
  }

  if (kind === "match") {
    resetMatchForm();
    els.matchStatusInput.value = "scheduled";
    openAdminModal("match", "Nuevo partido");
    return;
  }

  if (kind === "score") {
    renderScoreMatchOptions();
    openAdminModal("score", "Puntuar jornada activa");
  }
}

async function loadAdmin() {
  if (state.user?.role !== "admin") return;

  try {
    const [summary, settings, players, teams, clubs, gameweeks, news, backups] = await Promise.all([
      api("/api/admin/summary"),
      api("/api/admin/settings"),
      api("/api/admin/players"),
      api("/api/admin/teams"),
      api("/api/admin/clubs"),
      api("/api/gameweeks"),
      api("/api/admin/news"),
      api("/api/admin/backups")
    ]);

    state.admin.summary = summary.summary;
    state.admin.settings = settings.settings;
    state.admin.players = players.players;
    state.admin.teams = teams.teams;
    state.admin.clubs = clubs.clubs;
    state.admin.gameweeks = gameweeks.gameweeks;
    state.admin.news = news.news;
    state.admin.backups = backups.backups;
    renderAdmin();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function optionList(items, labelFn) {
  return items.map((item) => `<option value="${item._id}">${escapeHtml(labelFn(item))}</option>`).join("");
}

function renderAdmin() {
  const summary = state.admin.summary || {};
  if (state.admin.settings) {
    els.initialBudgetInput.value = state.admin.settings.initialBudget || 0;
  }
  renderPromoAdmin();

  els.adminSummary.innerHTML = Object.entries(summary)
    .map(
      ([key, value]) => `
      <article class="metric-card">
        <span>${escapeHtml(key)}</span>
        <strong>${key.toLowerCase().includes("budget") ? formatEuro(value || 0) : escapeHtml(value ?? "-")}</strong>
      </article>
    `
    )
    .join("");

  const clubOptions = optionList(state.admin.clubs, (club) => `${club.shortName} · ${club.name}`);
  els.playerClubInput.innerHTML = clubOptions;
  els.matchHomeInput.innerHTML = clubOptions;
  els.matchAwayInput.innerHTML = clubOptions;

  const gwOptions = optionList(state.admin.gameweeks, (gw) => `${gw.name} · ${gw.status}`);
  els.matchGameweekInput.innerHTML = gwOptions;
  renderScoreMatchOptions();

  els.adminPlayers.innerHTML = state.admin.players
    .map(
      (player) => `
      <article class="admin-row admin-player-row">
        ${compactPlayerAvatar(player, "admin-player-avatar")}
        <div>
          <span class="admin-player-heading"><strong>${escapeHtml(player.name)}</strong>${playerFormIndicator(player)}</span>
          <small>${player.position} · ${escapeHtml(player.club?.shortName || "")} · ${formatEuro(player.marketValue)} · ${player.totalPoints} pts · ${player.status}</small>
        </div>
        <div class="row-actions">
          <button class="mini-button" data-edit-player="${player._id}">Editar</button>
          <button class="mini-button danger" data-delete-player="${player._id}">Borrar</button>
        </div>
      </article>
    `
    )
    .join("");

  els.adminTeams.innerHTML = state.admin.teams
    .map(
      (team) => `
      <article class="admin-row">
        <div>
          <strong>${escapeHtml(team.teamName)}</strong>
          <small>${escapeHtml(team.email)} · ${team.totalPoints} pts · ${formatEuro(team.budget)} · <span class="status-${team.status}">${team.status}</span></small>
        </div>
        <div class="row-actions">
          <button class="mini-button" data-toggle-team="${team._id}" data-status="${team.status === "active" ? "suspended" : "active"}">
            ${team.status === "active" ? "Suspender" : "Activar"}
          </button>
          <button class="mini-button" data-edit-team="${team._id}">Editar nombre</button>
          <button class="mini-button danger" data-delete-team="${team._id}">Borrar</button>
        </div>
      </article>
    `
    )
    .join("");

  els.adminClubs.innerHTML = state.admin.clubs
    .map(
      (club) => `
      <article class="admin-row admin-club-row">
        ${clubBadge(club, "admin-club-badge")}
        <div>
          <strong>${escapeHtml(club.name)}</strong>
          <small>${escapeHtml(club.shortName)} · ${escapeHtml(club.city || "Sin ciudad")}</small>
        </div>
        <div class="row-actions">
          <button class="mini-button" data-edit-club="${club._id}">Editar</button>
          <button class="mini-button danger" data-delete-club="${club._id}">Borrar</button>
        </div>
      </article>
    `
    )
    .join("");

  els.adminNews.innerHTML = state.admin.news.length
    ? state.admin.news
        .map(renderAdminNewsItem)
        .join("")
    : `<p class="hint">Todavia no hay noticias manuales ni automaticas.</p>`;

  els.adminBackups.innerHTML = state.admin.backups.length
    ? state.admin.backups
        .map(renderAdminBackup)
        .join("")
    : `<p class="hint">Todavia no hay backups.</p>`;

  els.adminGameweeks.innerHTML = state.admin.gameweeks.map(renderAdminGameweek).join("");
}

function updatePromoAdminStatus(enabled, hasImage) {
  const ready = enabled && hasImage;
  els.promoAdminStatus.textContent = enabled ? hasImage ? "Activo" : "Falta imagen" : "Desactivado";
  els.promoAdminStatus.classList.toggle("active", ready);
  els.promoAdminStatus.classList.toggle("inactive", !ready);
}

function updatePromoAdminPreview(imageUrl) {
  els.promoAdminPreview.innerHTML = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Vista previa del anuncio" />`
    : `<p>Selecciona una imagen para la campaña.</p>`;
}

function renderPromoAdmin() {
  const promo = state.admin.settings?.promo || {};
  if (!els.promoForm) return;

  const imageUrl = state.promoImageDataUrl || promo.imageUrl;
  els.promoEnabledInput.checked = promo.enabled !== false;
  els.promoDurationInput.value = Number(promo.durationSeconds || 15);
  updatePromoAdminStatus(promo.enabled !== false, Boolean(imageUrl));
  updatePromoAdminPreview(imageUrl);
}

function renderAdminNewsItem(item) {
  const label = NEWS_LABELS[item.type] || "Liga";
  return `
    <article class="admin-row news-admin-row ${item.pinned ? "pinned" : ""}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(label)} - ${formatDateTime(item.createdAt)}${item.pinned ? " - fijada arriba" : ""}</small>
        ${item.body ? `<small>${escapeHtml(item.body)}</small>` : ""}
      </div>
      <div class="row-actions">
        <button class="mini-button" data-toggle-news-pin="${item._id}" data-pinned="${item.pinned ? "false" : "true"}">
          ${item.pinned ? "Desfijar" : "Fijar"}
        </button>
        <button class="mini-button" data-edit-news="${item._id}">Editar</button>
        <button class="mini-button danger" data-delete-news="${item._id}">Borrar</button>
      </div>
    </article>
  `;
}

function renderAdminBackup(backup) {
  const counts = backup.counts || {};
  const reasonLabel = {
    manual: "Manual",
    before_gameweek_start: "Antes de iniciar jornada",
    before_restore: "Antes de restaurar"
  }[backup.reason] || backup.reason;

  return `
    <article class="admin-row backup-row">
      <div>
        <strong>${escapeHtml(backup.name)}</strong>
        <small>${escapeHtml(reasonLabel)} - ${formatDateTime(backup.createdAt)} - ${counts.players || 0} jugadores - ${counts.gameweeks || 0} jornadas - ${counts.lineups || 0} alineaciones - ${counts.news || 0} noticias - ${counts.settings || 0} config.</small>
        <small>Colecciones snapshot: ${counts.collections || 7}</small>
        <small>Usuarios snapshot: ${counts.users || 0}${backup.createdByEmail ? ` - creado por ${escapeHtml(backup.createdByEmail)}` : ""}</small>
        <small>Mundo Las Pulgas: ${counts.mundoArticles || 0} noticias - ${counts.mundoPredictions || 0} predicciones - ${counts.mundoPlayerStatuses || 0} estados</small>
      </div>
      <div class="row-actions">
        <button class="mini-button" data-restore-backup="${backup._id}">Restaurar</button>
        <button class="mini-button danger" data-delete-backup="${backup._id}">Borrar</button>
      </div>
    </article>
  `;
}

function renderAdminGameweek(gw) {
  const matches = (gw.matches || [])
    .map(
      (match) => `
      <div class="match-card">
        <div class="match-teams">
          ${clubIdentity(match.homeClub)}
          <strong>${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}</strong>
          ${clubIdentity(match.awayClub)}
        </div>
        <div class="score-line match-kickoff">${formatDateTime(match.kickoff)}</div>
        <div class="score-line">${match.status} · ${matchScoredPlayers(match)} puntuados</div>
        <div class="row-actions">
          <button class="mini-button" data-edit-match="${match._id}" data-match-gw="${gw._id}">Editar partido</button>
          <button class="mini-button danger" data-delete-match="${match._id}" data-match-gw="${gw._id}">Borrar partido</button>
        </div>
      </div>
    `
    )
    .join("");

  return `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(gw.name)}</strong>
        <small class="status-${gw.status}">Jornada ${gw.number} · ${gw.status} · limite ${formatEuro(gw.lineupBudgetCap)}</small>
      </div>
      <div class="row-actions">
        <button class="mini-button" data-edit-gw="${gw._id}">Editar jornada</button>
        <button class="mini-button buy" data-start-gw="${gw._id}">Iniciar</button>
        <button class="mini-button" data-finish-gw="${gw._id}">Finalizar</button>
        <button class="mini-button danger" data-delete-gw="${gw._id}">Borrar</button>
      </div>
      <div class="match-list">${matches || `<p class="hint">Sin partidos.</p>`}</div>
    </article>
  `;
}

function renderScoreMatchOptions() {
  const gw = activeScoringGameweek();
  els.scoreGameweekInput.value = gw?._id || "";

  if (!gw) {
    els.scoreMatchInput.innerHTML = "";
    els.scoreMatchInput.disabled = true;
    els.scoreHomeInput.value = "";
    els.scoreAwayInput.value = "";
    els.scoreMvpInput.innerHTML = `<option value="">Sin MVP</option>`;
    els.scoreMvpInput.disabled = true;
    els.scoreActiveInfo.innerHTML = `<p class="hint">No hay ninguna jornada en juego. Inicia una jornada para puntuar sus partidos.</p>`;
    els.scorePlayersList.innerHTML = "";
    return;
  }

  els.scoreMatchInput.disabled = false;
  els.scoreActiveInfo.innerHTML = `
    <div class="score-context">
      <strong>${escapeHtml(gw.name)}</strong>
      <span class="status-${gw.status}">${escapeHtml(gw.status)}</span>
    </div>
  `;
  els.scoreMatchInput.innerHTML = (gw.matches || [])
    .map(
      (match) => `
      <option value="${match._id}">
        ${escapeHtml(match.homeClub?.shortName || "LOC")} - ${escapeHtml(match.awayClub?.shortName || "VIS")} - ${matchScoredPlayers(match)} puntuados
      </option>
    `
    )
    .join("");

  renderScorePlayers();
}

function activeScoringGameweek() {
  return state.admin.gameweeks.find((gameweek) => gameweek.status === "live") || null;
}

function selectedScoreMatch() {
  const gw = activeScoringGameweek();
  if (!gw) return null;
  return (gw.matches || []).find((match) => match._id === els.scoreMatchInput.value) || gw.matches?.[0] || null;
}

function playerClubId(player) {
  return player.club?._id || player.club || "";
}

function scorePlayerId(score) {
  return score.player?._id || score.player || "";
}

function existingMatchScore(match, playerId) {
  return (match.playerScores || []).find((score) => scorePlayerId(score) === playerId);
}

function matchScoredPlayers(match) {
  return (match.playerScores || []).filter((score) => score.played !== false).length;
}

function scoreInputValue(row, field) {
  const input = row.querySelector(`[data-score-field="${field}"]`);
  if (!input) return 0;
  if (input.type === "checkbox") return input.checked;
  if (field === "card") return input.value || "none";
  return Number(input.value || 0);
}

function scoreGoalsAgainst(player) {
  const match = selectedScoreMatch();
  const homeScore = Number(els.scoreHomeInput.value || 0);
  const awayScore = Number(els.scoreAwayInput.value || 0);
  const clubId = playerClubId(player);
  const homeClubId = match?.homeClub?._id || match?.homeClub;
  const awayClubId = match?.awayClub?._id || match?.awayClub;

  if (clubId === homeClubId) return awayScore;
  if (clubId === awayClubId) return homeScore;
  return 0;
}

function calculateScorePreview(player, stats) {
  if (!stats.played) return 0;

  const isDefensive = player.position === "POR" || player.position === "DEF";
  const base = { POR: 5, DEF: 4, MED: 2, DEL: 2 }[player.position] || 0;
  let points = base;
  points += Number(stats.commonGoals || 0) * (isDefensive ? 4 : 3);
  points += Number(stats.specialGoals || 0) * 2;
  points += Number(stats.assists || 0);
  points += Number(stats.picas || 0) * 2;
  if (stats.card === "second_yellow") points -= 2;
  if (stats.card === "direct_red") points -= 3;
  if (stats.isMvp) points += 3;

  if (player.position === "POR") points += Number(stats.penaltySaves || 0) * 3;

  if (isDefensive) {
    const against = scoreGoalsAgainst(player);
    if (against === 0) {
      points += player.position === "POR" ? 5 : 3;
    } else {
      points -= Math.floor(against / 2);
    }
  }

  return points;
}

function updateScorePreviews() {
  els.scorePlayersList.querySelectorAll("[data-score-row]").forEach((row) => {
    const player = state.admin.players.find((item) => item._id === row.dataset.scorePlayer);
    if (!player) return;

    const played = Boolean(scoreInputValue(row, "played"));
    const stats = {
      played,
      commonGoals: scoreInputValue(row, "commonGoals"),
      specialGoals: scoreInputValue(row, "specialGoals"),
      assists: scoreInputValue(row, "assists"),
      penaltySaves: player.position === "POR" ? scoreInputValue(row, "penaltySaves") : 0,
      picas: scoreInputValue(row, "picas"),
      card: scoreInputValue(row, "card"),
      isMvp: els.scoreMvpInput.value === player._id
    };
    const points = calculateScorePreview(player, stats);
    const output = row.querySelector("[data-score-preview]");
    if (output) {
      output.textContent = formatPoints(points);
      output.classList.toggle("positive", points > 0);
      output.classList.toggle("negative", points < 0);
    }

    row.classList.toggle("not-played", !played);
  });
}

function statValue(existing, field, fallback = 0) {
  return existing?.[field] ?? fallback;
}

function renderScoreRow(player, match) {
  const existing = existingMatchScore(match, player._id);
  const played = existing ? existing.played !== false : false;
  const club = player.club?.shortName || player.club?.name || "";
  const penaltySaveDisabled = player.position !== "POR" ? "disabled" : "";

  return `
    <article class="score-stat-row" data-score-row data-score-player="${player._id}">
      <div class="score-player-cell">
        <strong>${escapeHtml(player.name)}</strong>
        <small>${escapeHtml(player.position)} - ${escapeHtml(club)}</small>
      </div>
      <label class="score-played" title="Ha participado">
        <input data-score-field="played" type="checkbox" ${played ? "checked" : ""} />
        <span>Jugó</span>
      </label>
      <input class="score-number" data-score-field="commonGoals" type="number" min="0" step="1" value="${statValue(existing, "commonGoals")}" aria-label="Goles en juego de ${escapeHtml(player.name)}" />
      <input class="score-number" data-score-field="specialGoals" type="number" min="0" step="1" value="${statValue(existing, "specialGoals")}" aria-label="Goles de penalti o dado de ${escapeHtml(player.name)}" />
      <input class="score-number" data-score-field="assists" type="number" min="0" step="1" value="${statValue(existing, "assists")}" aria-label="Asistencias de ${escapeHtml(player.name)}" />
      <input class="score-number" data-score-field="penaltySaves" type="number" min="0" step="1" value="${statValue(existing, "penaltySaves")}" ${penaltySaveDisabled} aria-label="Penaltis parados de ${escapeHtml(player.name)}" />
      <select class="score-number" data-score-field="picas" aria-label="Picas de ${escapeHtml(player.name)}">
        ${[0, 1, 2, 3]
          .map((value) => `<option value="${value}" ${Number(statValue(existing, "picas")) === value ? "selected" : ""}>${value}</option>`)
          .join("")}
      </select>
      <select class="score-number score-card-select" data-score-field="card" aria-label="Tarjeta de ${escapeHtml(player.name)}">
        ${Object.entries(SCORE_CARD_LABELS)
          .map(([value, label]) => `<option value="${value}" ${statValue(existing, "card", "none") === value ? "selected" : ""}>${label}</option>`)
          .join("")}
      </select>
      <strong class="score-preview" data-score-preview>${formatPoints(existing?.points || 0)}</strong>
    </article>
  `;
}

function renderScorePlayers() {
  const match = selectedScoreMatch();
  if (!match) {
    els.scorePlayersList.innerHTML = `<p class="hint">La jornada activa todavia no tiene partidos.</p>`;
    els.scoreHomeInput.value = "";
    els.scoreAwayInput.value = "";
    els.scoreMvpInput.innerHTML = `<option value="">Sin MVP</option>`;
    els.scoreMvpInput.disabled = true;
    return;
  }

  els.scoreHomeInput.value = match.homeScore ?? 0;
  els.scoreAwayInput.value = match.awayScore ?? 0;

  const homeClubId = match.homeClub?._id || match.homeClub;
  const awayClubId = match.awayClub?._id || match.awayClub;
  const players = state.admin.players
    .filter((player) => [homeClubId, awayClubId].includes(playerClubId(player)))
    .sort((a, b) => {
      const clubDelta = String(playerClubId(a)).localeCompare(String(playerClubId(b)));
      if (clubDelta !== 0) return clubDelta;
      const positionOrder = { POR: 1, DEF: 2, MED: 3, DEL: 4 };
      return (positionOrder[a.position] || 9) - (positionOrder[b.position] || 9) || a.name.localeCompare(b.name);
    });

  if (!players.length) {
    els.scoreMvpInput.innerHTML = `<option value="">Sin MVP</option>`;
    els.scoreMvpInput.disabled = true;
    els.scorePlayersList.innerHTML = `<p class="hint">No hay jugadores asignados a estos dos equipos.</p>`;
    return;
  }

  const currentMvp = objectId(match.mvp);
  els.scoreMvpInput.disabled = false;
  els.scoreMvpInput.innerHTML = `
    <option value="">Sin MVP</option>
    ${players
      .map((player) => `<option value="${player._id}">${escapeHtml(player.name)} - ${escapeHtml(player.club?.shortName || player.club?.name || "")}</option>`)
      .join("")}
  `;
  if ([...els.scoreMvpInput.options].some((option) => option.value === currentMvp)) {
    els.scoreMvpInput.value = currentMvp;
  }

  const playersByClub = new Map([
    [homeClubId, players.filter((player) => playerClubId(player) === homeClubId)],
    [awayClubId, players.filter((player) => playerClubId(player) === awayClubId)]
  ]);
  const teamSections = [
    { club: match.homeClub, players: playersByClub.get(homeClubId) || [] },
    { club: match.awayClub, players: playersByClub.get(awayClubId) || [] }
  ];

  els.scorePlayersList.innerHTML = `
    <div class="score-match-header">
      <strong class="score-match-clubs">${clubIdentity(match.homeClub)}<span>-</span>${clubIdentity(match.awayClub)}</strong>
      <span class="pill">${escapeHtml(match.status)} - ${matchScoredPlayers(match)} jugadores puntuados</span>
    </div>
    ${teamSections
      .map(
        ({ club, players: teamPlayers }) => `
          <section class="score-team-table">
            <div class="score-team-title">
              <strong class="score-team-club">${clubBadge(club, "fixture-club-badge")}<span>${escapeHtml(club?.name || "Equipo")}</span></strong>
              <span>${teamPlayers.length} jugadores</span>
            </div>
            <div class="score-table-head" aria-hidden="true">
              <span>Jugador</span>
              <span>Jugó</span>
              <span>Goles</span>
              <span>Pen/Dado</span>
              <span>Ast</span>
              <span>Pen Par</span>
              <span>Picas</span>
              <span>Tarjeta</span>
              <span>Pts</span>
            </div>
            ${teamPlayers.map((player) => renderScoreRow(player, match)).join("")}
          </section>
        `
      )
      .join("")}
  `;
  updateScorePreviews();
}

async function savePlayer(event) {
  event.preventDefault();
  const id = els.playerIdInput.value;
  const body = {
    name: els.playerNameInput.value,
    position: els.playerPositionInput.value,
    club: els.playerClubInput.value,
    marketValue: Number(els.playerValueInput.value),
    status: els.playerStatusInput.value,
    photoDataUrl: state.playerPhotoDataUrl,
    photoFilename: els.playerPhotoInput.files[0]?.name || "",
    removePhoto: els.playerPhotoRemoveInput.checked
  };

  try {
    await api(id ? `/api/admin/players/${id}` : "/api/admin/players", {
      method: id ? "PUT" : "POST",
      body
    });
    resetPlayerForm();
    closeAdminModal();
    await loadAdmin();
    showToast("Jugador guardado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editPlayer(playerId) {
  const player = state.admin.players.find((item) => item._id === playerId);
  if (!player) return;

  els.playerIdInput.value = player._id;
  els.playerNameInput.value = player.name;
  els.playerPositionInput.value = player.position;
  els.playerClubInput.value = player.club?._id || player.club;
  els.playerValueInput.value = player.marketValue;
  els.playerStatusInput.value = player.status;
  state.playerPhotoDataUrl = "";
  els.playerPhotoInput.value = "";
  els.playerPhotoRemoveInput.checked = false;
  els.playerPhotoRemoveField.classList.toggle("hidden", !player.photoContentType);
  renderPlayerPhotoFormPreview();
  openAdminModal("player", "Editar jugador");
}

function resetPlayerForm() {
  els.playerForm.reset();
  els.playerIdInput.value = "";
  state.playerPhotoDataUrl = "";
  els.playerPhotoRemoveField.classList.add("hidden");
  renderPlayerPhotoFormPreview();
}

function currentPlayerFormPlayer() {
  return state.admin.players.find((player) => player._id === els.playerIdInput.value) || null;
}

function renderPlayerPhotoFormPreview() {
  const player = currentPlayerFormPlayer();
  const imageUrl = state.playerPhotoDataUrl || (!els.playerPhotoRemoveInput.checked ? playerPhotoUrl(player) : "");
  els.playerPhotoPreview.innerHTML = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Vista previa de la foto del jugador" />`
    : `<span>${els.playerPhotoRemoveInput.checked ? "La foto se eliminara al guardar" : "Sin foto"}</span>`;
  els.playerPhotoPreview.classList.toggle("has-image", Boolean(imageUrl));
}

function readPlayerPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return reject(new Error("La foto debe ser JPG, PNG o WEBP."));
    }
    if (file.size > 6 * 1024 * 1024) {
      return reject(new Error("La foto no puede superar 6 MB."));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.readAsDataURL(file);
  });
}

async function saveTeam(event) {
  event.preventDefault();
  try {
    await api(`/api/admin/teams/${els.teamIdInput.value}`, {
      method: "PATCH",
      body: {
        teamName: els.teamNameEditInput.value,
        budget: Number(els.teamBudgetInput.value),
        status: els.teamStatusInput.value
      }
    });
    closeAdminModal();
    await loadAdmin();
    await refreshCore();
    showToast("Equipo actualizado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editTeam(teamId) {
  const team = state.admin.teams.find((item) => item._id === teamId);
  if (!team) return;

  els.teamIdInput.value = team._id;
  els.teamNameEditInput.value = team.teamName;
  els.teamBudgetInput.value = team.budget;
  els.teamStatusInput.value = team.status;
  openAdminModal("team", "Editar nombre del equipo");
}

async function saveClub(event) {
  event.preventDefault();
  try {
    const id = els.clubIdInput.value;
    await api(id ? `/api/admin/clubs/${id}` : "/api/admin/clubs", {
      method: id ? "PUT" : "POST",
      body: {
        name: els.clubNameInput.value,
        shortName: els.clubShortInput.value,
        city: els.clubCityInput.value,
        badgeDataUrl: state.clubBadgeDataUrl,
        badgeFilename: els.clubBadgeInput.files[0]?.name || "",
        removeBadge: els.clubBadgeRemoveInput.checked
      }
    });
    resetClubForm();
    closeAdminModal();
    await loadAdmin();
    showToast("Club guardado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editClub(clubId) {
  const club = state.admin.clubs.find((item) => item._id === clubId);
  if (!club) return;

  els.clubIdInput.value = club._id;
  els.clubNameInput.value = club.name;
  els.clubShortInput.value = club.shortName;
  els.clubCityInput.value = club.city || "";
  state.clubBadgeDataUrl = "";
  els.clubBadgeInput.value = "";
  els.clubBadgeRemoveInput.checked = false;
  els.clubBadgeRemoveField.classList.toggle("hidden", !club.badgeContentType);
  renderClubBadgeFormPreview();
  openAdminModal("club", "Editar club");
}

function resetClubForm() {
  els.clubForm.reset();
  els.clubIdInput.value = "";
  state.clubBadgeDataUrl = "";
  els.clubBadgeRemoveField.classList.add("hidden");
  renderClubBadgeFormPreview();
}

function currentClubFormClub() {
  return state.admin.clubs.find((club) => club._id === els.clubIdInput.value) || null;
}

function renderClubBadgeFormPreview() {
  const club = currentClubFormClub();
  const imageUrl = state.clubBadgeDataUrl || (!els.clubBadgeRemoveInput.checked ? clubBadgeUrl(club) : "");
  els.clubBadgePreview.innerHTML = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="Vista previa del escudo" />`
    : `<span>${els.clubBadgeRemoveInput.checked ? "El escudo se eliminara al guardar" : "Sin escudo"}</span>`;
  els.clubBadgePreview.classList.toggle("has-image", Boolean(imageUrl));
}

function readClubBadgeFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return reject(new Error("El escudo debe ser JPG, PNG o WEBP."));
    }
    if (file.size > 2 * 1024 * 1024) {
      return reject(new Error("El escudo no puede superar 2 MB."));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el escudo."));
    reader.readAsDataURL(file);
  });
}

function readPromoImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return reject(new Error("La imagen del anuncio debe ser JPG, PNG o WEBP."));
    }
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error("La imagen del anuncio no puede superar 5 MB."));
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen del anuncio."));
    reader.readAsDataURL(file);
  });
}

async function savePromo(event) {
  event.preventDefault();
  const submitButton = els.promoForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const { message } = await api("/api/admin/promo", {
      method: "PUT",
      body: {
        enabled: els.promoEnabledInput.checked,
        durationSeconds: Number(els.promoDurationInput.value),
        imageDataUrl: state.promoImageDataUrl,
        imageFilename: els.promoImageInput.files[0]?.name || ""
      }
    });
    state.promoImageDataUrl = "";
    els.promoImageInput.value = "";
    await loadAdmin();
    showToast(message);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function saveNews(event) {
  event.preventDefault();
  const id = els.newsIdInput.value;

  try {
    await api(id ? `/api/admin/news/${id}` : "/api/admin/news", {
      method: id ? "PUT" : "POST",
      body: {
        title: els.newsTitleInput.value,
        body: els.newsBodyInput.value,
        pinned: els.newsPinnedInput.checked
      }
    });
    resetNewsForm();
    closeAdminModal();
    await loadAdmin();
    await refreshCore();
    showToast(id ? "Noticia actualizada." : "Noticia publicada.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editNews(newsId) {
  const item = state.admin.news.find((news) => news._id === newsId);
  if (!item) return;

  els.newsIdInput.value = item._id;
  els.newsTitleInput.value = item.title;
  els.newsBodyInput.value = item.body || "";
  els.newsPinnedInput.checked = Boolean(item.pinned);
  els.newsSubmitBtn.textContent = "Actualizar noticia";
  openAdminModal("news", "Editar noticia");
}

function resetNewsForm() {
  els.newsForm.reset();
  els.newsIdInput.value = "";
  els.newsSubmitBtn.textContent = "Publicar noticia";
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    await api("/api/admin/settings", {
      method: "PUT",
      body: {
        initialBudget: Number(els.initialBudgetInput.value)
      }
    });
    await loadAdmin();
    showToast("Presupuesto inicial actualizado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function resetLeagueFromAdmin() {
  const confirmation = window.prompt(
    "Esta accion conserva usuarios, pero borra clubes, jugadores, jornadas, alineaciones e historico. Escribe REINICIAR para continuar."
  );

  if (confirmation !== "REINICIAR") {
    showToast("Reinicio cancelado.");
    return;
  }

  const loadDemoData = window.confirm("¿Quieres cargar los datos demo despues de reiniciar?");

  try {
    const data = await api("/api/admin/league/reset", {
      method: "POST",
      body: {
        confirmation,
        loadDemoData
      }
    });

    state.historyGameweekDetails = {};
    state.activeGameweekLeaderboard = null;
    await refreshCore();
    await loadAdmin();
    await loadLeaderboard();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function createBackupFromAdmin() {
  const name = window.prompt("Nombre del backup manual:", `Backup manual ${formatDateTime(new Date())}`);
  if (name === null) return;

  try {
    await api("/api/admin/backups", {
      method: "POST",
      body: { name }
    });
    await loadAdmin();
    showToast("Backup creado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function restoreBackupFromAdmin(backupId) {
  const backup = state.admin.backups.find((item) => item._id === backupId);
  const confirmation = window.prompt(
    `Restaurar${backup?.name ? ` "${backup.name}"` : ""} devolvera jornadas, jugadores, puntos, alineaciones y configuracion al snapshot. Las cuentas registradas se conservan. Escribe RESTAURAR para continuar.`
  );

  if (confirmation !== "RESTAURAR") {
    showToast("Restauracion cancelada.");
    return;
  }

  try {
    const data = await api(`/api/admin/backups/${backupId}/restore`, {
      method: "POST",
      body: { confirmation }
    });

    state.historyGameweekDetails = {};
    state.activeGameweekLeaderboard = null;
    state.playerStatsCache = {};
    await refreshCore();
    await loadAdmin();
    await loadLeaderboard();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteBackupFromAdmin(backupId) {
  const backup = state.admin.backups.find((item) => item._id === backupId);
  const ok = window.confirm(
    `Borrar${backup?.name ? ` "${backup.name}"` : " este backup"} de forma permanente. Esta accion no se puede deshacer.`
  );

  if (!ok) return;

  try {
    const data = await api(`/api/admin/backups/${backupId}`, {
      method: "DELETE"
    });
    await loadAdmin();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function saveGameweek(event) {
  event.preventDefault();
  try {
    const id = els.gwIdInput.value;
    await api(id ? `/api/admin/gameweeks/${id}` : "/api/admin/gameweeks", {
      method: id ? "PUT" : "POST",
      body: {
        number: Number(els.gwNumberInput.value),
        name: els.gwNameInput.value || `Jornada ${els.gwNumberInput.value}`,
        lineupBudgetCap: Number(els.gwCapInput.value || 100000000),
        status: els.gwStatusInput.value
      }
    });
    resetGameweekForm();
    closeAdminModal();
    await loadAdmin();
    await refreshCore();
    showToast("Jornada guardada.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editGameweek(gameweekId) {
  const gw = state.admin.gameweeks.find((item) => item._id === gameweekId);
  if (!gw) return;

  els.gwIdInput.value = gw._id;
  els.gwNumberInput.value = gw.number;
  els.gwNameInput.value = gw.name;
  els.gwCapInput.value = gw.lineupBudgetCap;
  els.gwStatusInput.value = gw.status;
  els.gwSubmitBtn.textContent = "Actualizar jornada";
  openAdminModal("gameweek", "Editar jornada");
}

function resetGameweekForm() {
  els.gameweekForm.reset();
  els.gwIdInput.value = "";
  els.gwStatusInput.value = "draft";
  els.gwSubmitBtn.textContent = "Guardar jornada";
}

async function saveMatch(event) {
  event.preventDefault();
  try {
    const gameweekId = els.matchGameweekInput.value;
    const matchId = els.matchIdInput.value;
    await api(matchId ? `/api/admin/gameweeks/${gameweekId}/matches/${matchId}` : `/api/admin/gameweeks/${gameweekId}/matches`, {
      method: matchId ? "PUT" : "POST",
      body: {
        homeClub: els.matchHomeInput.value,
        awayClub: els.matchAwayInput.value,
        kickoff: els.matchKickoffInput.value ? new Date(els.matchKickoffInput.value).toISOString() : null,
        status: els.matchStatusInput.value
      }
    });
    resetMatchForm();
    closeAdminModal();
    await loadAdmin();
    await refreshCore();
    showToast("Partido guardado.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editMatch(gameweekId, matchId) {
  const gw = state.admin.gameweeks.find((item) => item._id === gameweekId);
  const match = gw?.matches?.find((item) => item._id === matchId);
  if (!gw || !match) return;

  els.matchIdInput.value = match._id;
  els.matchGameweekInput.value = gw._id;
  els.matchHomeInput.value = match.homeClub?._id || match.homeClub;
  els.matchAwayInput.value = match.awayClub?._id || match.awayClub;
  els.matchKickoffInput.value = toDateTimeLocal(match.kickoff);
  els.matchStatusInput.value = match.status;
  els.matchSubmitBtn.textContent = "Actualizar partido";
  renderScoreMatchOptions();
  openAdminModal("match", "Editar partido");
}

function resetMatchForm() {
  els.matchForm.reset();
  clearMatchEditMode();
}

function clearMatchEditMode() {
  els.matchIdInput.value = "";
  els.matchSubmitBtn.textContent = "Guardar partido";
}

async function saveScore(event) {
  event.preventDefault();
  try {
    const gw = activeScoringGameweek();
    const match = selectedScoreMatch();
    if (!gw || !match) {
      showToast("No hay jornada activa con partido para puntuar.", "error");
      return;
    }

    const homeScore = Number(els.scoreHomeInput.value);
    const awayScore = Number(els.scoreAwayInput.value);
    if (!Number.isFinite(homeScore) || homeScore < 0 || !Number.isFinite(awayScore) || awayScore < 0) {
      showToast("Introduce un resultado valido.", "error");
      return;
    }

    const rows = [...els.scorePlayersList.querySelectorAll("[data-score-row]")];
    const scores = rows.map((row) => {
      const player = state.admin.players.find((item) => item._id === row.dataset.scorePlayer);
      return {
        playerId: row.dataset.scorePlayer,
        played: Boolean(scoreInputValue(row, "played")),
        commonGoals: scoreInputValue(row, "commonGoals"),
        specialGoals: scoreInputValue(row, "specialGoals"),
        assists: scoreInputValue(row, "assists"),
        penaltySaves: player?.position === "POR" ? scoreInputValue(row, "penaltySaves") : 0,
        picas: scoreInputValue(row, "picas"),
        card: scoreInputValue(row, "card")
      };
    });

    await api(`/api/admin/gameweeks/${gw._id}/matches/${match._id}/scores`, {
      method: "POST",
      body: {
        homeScore,
        awayScore,
        mvpPlayerId: els.scoreMvpInput.value || null,
        scores,
        markFinished: true
      }
    });

    await loadAdmin();
    els.scoreMatchInput.value = match._id;
    renderScorePlayers();
    await refreshCore();
    await loadLeaderboard();
    showToast("Puntuaciones del partido guardadas.");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function adminAction(target) {
  const actions = [
    ["deletePlayer", "data-delete-player", (id) => api(`/api/admin/players/${id}`, { method: "DELETE" })],
    ["deleteClub", "data-delete-club", (id) => api(`/api/admin/clubs/${id}`, { method: "DELETE" })],
    ["deleteTeam", "data-delete-team", (id) => api(`/api/admin/teams/${id}`, { method: "DELETE" })],
    ["deleteGw", "data-delete-gw", (id) => api(`/api/admin/gameweeks/${id}`, { method: "DELETE" })],
    ["startGw", "data-start-gw", (id) => api(`/api/admin/gameweeks/${id}/start`, { method: "POST" })],
    ["finishGw", "data-finish-gw", (id) => api(`/api/admin/gameweeks/${id}/finish`, { method: "POST" })]
  ];

  if (target.dataset.editPlayer) {
    editPlayer(target.dataset.editPlayer);
    return;
  }

  if (target.dataset.editClub) {
    editClub(target.dataset.editClub);
    return;
  }

  if (target.dataset.editNews) {
    editNews(target.dataset.editNews);
    return;
  }

  if (target.dataset.toggleNewsPin) {
    const item = state.admin.news.find((news) => news._id === target.dataset.toggleNewsPin);
    if (!item) return;

    await api(`/api/admin/news/${item._id}`, {
      method: "PUT",
      body: {
        title: item.title,
        body: item.body || "",
        pinned: target.dataset.pinned === "true"
      }
    });
    await loadAdmin();
    await refreshCore();
    showToast(target.dataset.pinned === "true" ? "Noticia fijada." : "Noticia desfijada.");
    return;
  }

  if (target.dataset.deleteNews) {
    const ok = window.confirm("Confirma borrar esta noticia del tablon.");
    if (!ok) return;
    await api(`/api/admin/news/${target.dataset.deleteNews}`, { method: "DELETE" });
    await loadAdmin();
    await refreshCore();
    showToast("Noticia borrada.");
    return;
  }

  if (target.dataset.editGw) {
    editGameweek(target.dataset.editGw);
    return;
  }

  if (target.dataset.editMatch) {
    editMatch(target.dataset.matchGw, target.dataset.editMatch);
    return;
  }

  if (target.dataset.deleteMatch) {
    const ok = window.confirm("Confirma borrar este partido.");
    if (!ok) return;
    await api(`/api/admin/gameweeks/${target.dataset.matchGw}/matches/${target.dataset.deleteMatch}`, {
      method: "DELETE"
    });
    await loadAdmin();
    await refreshCore();
    showToast("Partido eliminado.");
    return;
  }

  if (target.dataset.editTeam) {
    editTeam(target.dataset.editTeam);
    return;
  }

  if (target.dataset.toggleTeam) {
    await api(`/api/admin/teams/${target.dataset.toggleTeam}`, {
      method: "PATCH",
      body: { status: target.dataset.status }
    });
    await loadAdmin();
    showToast("Estado de equipo actualizado.");
    return;
  }

  for (const [, attr, fn] of actions) {
    const id = target.getAttribute(attr);
    if (!id) continue;

    const ok = window.confirm("Confirma esta accion de administracion.");
    if (!ok) return;
    await fn(id);
    await loadAdmin();
    await refreshCore();
    await loadLeaderboard();
    showToast("Accion completada.");
    return;
  }
}

function bindEvents() {
  els.loginTab.addEventListener("click", () => setAuthMode("login"));
  els.registerTab.addEventListener("click", () => setAuthMode("register"));
  els.authForm.addEventListener("submit", handleAuth);
  els.accountMenuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleAccountMenu();
  });
  els.promoCloseBtn?.addEventListener("click", closePromo);
  els.promoModal?.addEventListener("click", (event) => {
    if (event.target === els.promoModal) closePromo();
  });
  els.logoutBtn.addEventListener("click", () => {
    closeAccountMenu();
    setSession(null, null);
    state.user = null;
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#accountMenuWrap")) closeAccountMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.promoModal?.classList.contains("hidden")) {
      closePromo();
      return;
    }
    if (event.key === "Escape") closeAccountMenu();
  });

  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view) setView(button.dataset.view);
    });
  });

  $$("[data-refresh]").forEach((button) => {
    button.addEventListener("click", async () => {
      await refreshCore();
      await loadLeaderboard();
      showToast("Datos actualizados.");
    });
  });

  els.matchesList.addEventListener("click", (event) => {
    const matchButton = event.target.closest("[data-match-detail]");
    if (matchButton) openMatchDetail(matchButton.dataset.matchDetail);
  });

  $$("[data-market-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketMode = button.dataset.marketMode;
      renderMarket();
    });
  });

  els.positionFilter.addEventListener("change", renderMarket);
  els.marketClubFilter.addEventListener("change", renderMarket);
  els.playerSearch.addEventListener("input", renderMarket);
  els.minPointsFilter.addEventListener("input", renderMarket);
  els.maxPriceFilter.addEventListener("input", renderMarket);
  els.marketSort.addEventListener("change", renderMarket);
  els.marketList.addEventListener("click", (event) => {
    const detail = event.target.closest("[data-player-detail]");
    if (detail) openPlayerDetail(detail.dataset.playerDetail);
  });

  els.playerDetailModal.addEventListener("click", (event) => {
    const detailTab = event.target.closest("[data-player-detail-tab]");
    if (detailTab) {
      setPlayerDetailTab(detailTab.dataset.playerDetailTab);
      return;
    }

    const scoreRow = event.target.closest("[data-player-score-row]");
    if (scoreRow) {
      togglePlayerScoreDetail(scoreRow.dataset.playerScoreRow);
      return;
    }

    if (event.target === els.playerDetailModal || event.target.closest("[data-close-player-detail]")) {
      closePlayerDetail();
    }
  });

  els.matchDetailModal.addEventListener("click", (event) => {
    const teamButton = event.target.closest("[data-match-team]");
    if (teamButton) {
      setMatchDetailTeam(teamButton.dataset.matchTeam);
      return;
    }

    if (event.target === els.matchDetailModal || event.target.closest("[data-close-match-detail]")) {
      closeMatchDetail();
    }
  });

  els.formationSelect.addEventListener("change", handleFormationChange);
  els.lineupPlayers.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-lineup-picker]");
    if (trigger) {
      openLineupPicker(trigger.dataset.openLineupPicker, trigger.dataset.position);
    }
  });
  els.lineupForm.addEventListener("submit", saveLineup);
  els.lineupPickerSearch.addEventListener("input", renderLineupPicker);
  els.lineupPickerClear.addEventListener("click", clearLineupPickerSelection);
  els.lineupPickerList.addEventListener("click", (event) => {
    const option = event.target.closest("[data-pick-lineup-player]");
    if (option && !option.disabled) selectLineupPickerPlayer(option.dataset.pickLineupPlayer);
  });
  els.lineupPickerModal.addEventListener("click", (event) => {
    if (event.target === els.lineupPickerModal || event.target.closest("[data-close-lineup-picker]")) {
      closeLineupPicker();
    }
  });
  els.profileTeamForm.addEventListener("submit", saveProfileTeam);
  els.profilePasswordForm.addEventListener("submit", saveProfilePassword);

  $("#leaderboardView").addEventListener("click", async (event) => {
    const modeButton = event.target.closest("[data-leaderboard-mode]");
    if (modeButton) {
      setLeaderboardMode(modeButton.dataset.leaderboardMode);
      return;
    }

    const historyButton = event.target.closest("[data-load-history]");
    if (historyButton) {
      await loadHistoryGameweek(historyButton.dataset.loadHistory);
      return;
    }

    const lineupButton = event.target.closest("[data-lineup-team][data-lineup-gameweek]");
    if (lineupButton) {
      openLineupDetail(lineupButton.dataset.lineupGameweek, lineupButton.dataset.lineupTeam);
    }
  });

  els.lineupDetailModal.addEventListener("click", (event) => {
    if (event.target === els.lineupDetailModal || event.target.closest("[data-close-lineup-detail]")) {
      closeLineupDetail();
    }
  });

  els.adminRefreshBtn.addEventListener("click", loadAdmin);
  els.resetLeagueBtn.addEventListener("click", resetLeagueFromAdmin);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.promoForm.addEventListener("submit", savePromo);
  els.promoEnabledInput.addEventListener("change", () => {
    if (state.admin.settings?.promo) state.admin.settings.promo.enabled = els.promoEnabledInput.checked;
    const hasImage = Boolean(state.promoImageDataUrl || state.admin.settings?.promo?.imageUrl);
    updatePromoAdminStatus(els.promoEnabledInput.checked, hasImage);
  });
  els.promoImageInput.addEventListener("change", async () => {
    try {
      state.promoImageDataUrl = await readPromoImageFile(els.promoImageInput.files[0]);
      const imageUrl = state.promoImageDataUrl || state.admin.settings?.promo?.imageUrl;
      updatePromoAdminPreview(imageUrl);
      updatePromoAdminStatus(els.promoEnabledInput.checked, Boolean(imageUrl));
    } catch (error) {
      state.promoImageDataUrl = "";
      els.promoImageInput.value = "";
      const imageUrl = state.admin.settings?.promo?.imageUrl;
      updatePromoAdminPreview(imageUrl);
      updatePromoAdminStatus(els.promoEnabledInput.checked, Boolean(imageUrl));
      showToast(error.message, "error");
    }
  });
  els.playerForm.addEventListener("submit", savePlayer);
  els.playerResetBtn.addEventListener("click", resetPlayerForm);
  els.playerPhotoInput.addEventListener("change", async () => {
    try {
      state.playerPhotoDataUrl = await readPlayerPhotoFile(els.playerPhotoInput.files[0]);
      els.playerPhotoRemoveInput.checked = false;
      renderPlayerPhotoFormPreview();
    } catch (error) {
      state.playerPhotoDataUrl = "";
      els.playerPhotoInput.value = "";
      renderPlayerPhotoFormPreview();
      showToast(error.message, "error");
    }
  });
  els.playerPhotoRemoveInput.addEventListener("change", () => {
    if (els.playerPhotoRemoveInput.checked) {
      state.playerPhotoDataUrl = "";
      els.playerPhotoInput.value = "";
    }
    renderPlayerPhotoFormPreview();
  });
  els.teamForm.addEventListener("submit", saveTeam);
  els.clubForm.addEventListener("submit", saveClub);
  els.clubBadgeInput.addEventListener("change", async () => {
    try {
      state.clubBadgeDataUrl = await readClubBadgeFile(els.clubBadgeInput.files[0]);
      els.clubBadgeRemoveInput.checked = false;
      renderClubBadgeFormPreview();
    } catch (error) {
      state.clubBadgeDataUrl = "";
      els.clubBadgeInput.value = "";
      renderClubBadgeFormPreview();
      showToast(error.message, "error");
    }
  });
  els.clubBadgeRemoveInput.addEventListener("change", () => {
    if (els.clubBadgeRemoveInput.checked) {
      state.clubBadgeDataUrl = "";
      els.clubBadgeInput.value = "";
    }
    renderClubBadgeFormPreview();
  });
  els.newsForm.addEventListener("submit", saveNews);
  els.newsResetBtn.addEventListener("click", resetNewsForm);
  els.gameweekForm.addEventListener("submit", saveGameweek);
  els.gwResetBtn.addEventListener("click", resetGameweekForm);
  els.matchForm.addEventListener("submit", saveMatch);
  els.matchResetBtn.addEventListener("click", resetMatchForm);
  els.scoreForm.addEventListener("submit", saveScore);
  els.matchGameweekInput.addEventListener("change", clearMatchEditMode);
  els.scoreMatchInput.addEventListener("change", renderScorePlayers);
  els.scoreHomeInput.addEventListener("input", updateScorePreviews);
  els.scoreAwayInput.addEventListener("input", updateScorePreviews);
  els.scoreMvpInput.addEventListener("change", updateScorePreviews);
  els.scorePlayersList.addEventListener("input", updateScorePreviews);
  els.scorePlayersList.addEventListener("change", updateScorePreviews);
  $("#adminView").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.adminSection) {
      setAdminSection(button.dataset.adminSection);
      return;
    }

    if (button.dataset.openModal) {
      openCreateModal(button.dataset.openModal);
      return;
    }

    if (button.hasAttribute("data-create-backup")) {
      await createBackupFromAdmin();
      return;
    }

    if (button.dataset.restoreBackup) {
      await restoreBackupFromAdmin(button.dataset.restoreBackup);
      return;
    }

    if (button.dataset.deleteBackup) {
      await deleteBackupFromAdmin(button.dataset.deleteBackup);
      return;
    }

    if (button.hasAttribute("data-close-modal")) {
      closeAdminModal();
      return;
    }

    try {
      await adminAction(button);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function bootstrap() {
  bindEvents();
  setupNewsInfiniteScroll();
  setAuthMode("login");
  void loadPromoCampaign();

  if (!state.token) {
    renderShell();
    return;
  }

  try {
    await refreshCore();
    await loadLeaderboard();
    renderShell();
  } catch (error) {
    localStorage.removeItem("pl_token");
    state.token = null;
    renderShell();
    showToast("Sesion caducada. Entra de nuevo.", "error");
  }
}

bootstrap();
