const state = {
  token: localStorage.getItem("pl_token"),
  user: null,
  activeView: "dashboard",
  authMode: "login",
  players: [],
  clubs: [],
  marketPlayers: [],
  gameweeks: [],
  news: [],
  activeGameweek: null,
  currentLineup: null,
  lineupDraft: null,
  leaderboard: [],
  leaderboardMode: "total",
  activeGameweekLeaderboard: null,
  historyGameweekDetails: {},
  playerStatsCache: {},
  admin: {
    summary: null,
    settings: null,
    players: [],
    teams: [],
    clubs: [],
    gameweeks: [],
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
  squadList: $("#squadList"),
  marketList: $("#marketList"),
  positionFilter: $("#positionFilter"),
  playerSearch: $("#playerSearch"),
  minPointsFilter: $("#minPointsFilter"),
  maxPriceFilter: $("#maxPriceFilter"),
  marketSort: $("#marketSort"),
  lineupForm: $("#lineupForm"),
  formationSelect: $("#formationSelect"),
  lineupPlayers: $("#lineupPlayers"),
  lineupCap: $("#lineupCap"),
  lineupCount: $("#lineupCount"),
  lineupHelp: $("#lineupHelp"),
  leaderboardList: $("#leaderboardList"),
  gameweekLeaderboardList: $("#gameweekLeaderboardList"),
  historyGameweeksList: $("#historyGameweeksList"),
  lineupDetailModal: $("#lineupDetailModal"),
  lineupDetailTitle: $("#lineupDetailTitle"),
  lineupDetailBody: $("#lineupDetailBody"),
  playerDetailModal: $("#playerDetailModal"),
  playerDetailTitle: $("#playerDetailTitle"),
  playerDetailBody: $("#playerDetailBody"),
  adminSummary: $("#adminSummary"),
  adminRefreshBtn: $("#adminRefreshBtn"),
  resetLeagueBtn: $("#resetLeagueBtn"),
  adminModal: $("#adminModal"),
  adminModalTitle: $("#adminModalTitle"),
  adminModalBody: $("#adminModalBody"),
  settingsForm: $("#settingsForm"),
  initialBudgetInput: $("#initialBudgetInput"),
  playerForm: $("#playerForm"),
  playerIdInput: $("#playerIdInput"),
  playerNameInput: $("#playerNameInput"),
  playerPositionInput: $("#playerPositionInput"),
  playerClubInput: $("#playerClubInput"),
  playerValueInput: $("#playerValueInput"),
  playerFormInput: $("#playerFormInput"),
  playerStatusInput: $("#playerStatusInput"),
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
  adminClubs: $("#adminClubs"),
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
  matchStatusInput: $("#matchStatusInput"),
  matchSubmitBtn: $("#matchSubmitBtn"),
  matchResetBtn: $("#matchResetBtn"),
  scoreForm: $("#scoreForm"),
  scoreGameweekInput: $("#scoreGameweekInput"),
  scoreMatchInput: $("#scoreMatchInput"),
  scoreHomeInput: $("#scoreHomeInput"),
  scoreAwayInput: $("#scoreAwayInput"),
  scoreActiveInfo: $("#scoreActiveInfo"),
  scorePlayersList: $("#scorePlayersList"),
  adminGameweeks: $("#adminGameweeks")
};

const FORMATIONS = generateFormations();
const POSITION_LABELS = {
  POR: "Portero",
  DEF: "Defensa",
  MED: "Medio",
  DEL: "Delantero"
};

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

function formatEuro(value = 0) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
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

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginTab.classList.toggle("active", mode === "login");
  els.registerTab.classList.toggle("active", mode === "register");
  els.teamNameField.classList.toggle("hidden", mode !== "register");
}

function setView(view) {
  state.activeView = view;
  $$(".tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((section) => section.classList.remove("active"));
  $(`#${view}View`)?.classList.add("active");

  if (view === "market") loadMarket();
  if (view === "lineup") loadLineup();
  if (view === "leaderboard") loadLeaderboard();
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

function renderShell() {
  const isLoggedIn = Boolean(state.token && state.user);
  els.authView.classList.toggle("hidden", isLoggedIn);
  els.appView.classList.toggle("hidden", !isLoggedIn);
  els.logoutBtn.classList.toggle("hidden", !isLoggedIn);

  if (!isLoggedIn) return;

  const isAdmin = state.user.role === "admin";
  ["dashboard", "market", "lineup", "leaderboard"].forEach((view) => {
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
}

function renderNewsItem(item) {
  const label = NEWS_LABELS[item.type] || "Liga";
  return `
    <article class="news-item">
      <span class="news-type">${escapeHtml(label)}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${formatDateTime(item.createdAt)}${item.body ? ` - ${escapeHtml(item.body)}` : ""}</small>
      </div>
    </article>
  `;
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
        <article class="match-card">
          <div class="match-teams">
            <span>${escapeHtml(match.homeClub?.shortName || "LOC")}</span>
            <strong>${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}</strong>
            <span>${escapeHtml(match.awayClub?.shortName || "VIS")}</span>
          </div>
          <div class="score-line">${escapeHtml(match.status)}${scores ? ` · ${scores}` : ""}</div>
        </article>
      `;
    })
    .join("") || `<p class="hint">Esta jornada aun no tiene partidos.</p>`;
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

  return `
    <${tag} class="player-card ${options.market ? "market-player-card" : ""}" ${attrs}>
      <div class="avatar">${initials(player.name)}</div>
      <div class="player-main">
        <strong>${escapeHtml(player.name)}</strong>
        <small>${escapeHtml(player.position)} · ${escapeHtml(club)} · ${formatEuro(player.marketValue)} · ${player.totalPoints || 0} pts</small>
      </div>
      ${options.market ? `<span class="pill">Ficha</span>` : ""}
    </${tag}>
  `;
}

async function refreshCore() {
  const [me, activeGameweek, players, clubs, news] = await Promise.all([
    api("/api/auth/me"),
    api("/api/gameweeks/active"),
    api("/api/players"),
    api("/api/clubs"),
    api("/api/news")
  ]);

  state.user = me.user;
  state.activeGameweek = activeGameweek.gameweek;
  state.players = players.players;
  state.clubs = clubs.clubs;
  state.news = news.news || [];
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

async function loadMarket() {
  try {
    const data = await api("/api/market");
    state.marketPlayers = data.players;
    renderMarket();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderMarket() {
  const position = els.positionFilter.value;
  const search = els.playerSearch.value.trim().toLowerCase();
  const minPoints = els.minPointsFilter.value === "" ? null : Number(els.minPointsFilter.value);
  const maxPrice = els.maxPriceFilter.value === "" ? null : Number(els.maxPriceFilter.value);
  const sort = els.marketSort.value;
  const list = state.marketPlayers
    .filter((player) => {
      const club = player.club?.name || player.club?.shortName || "";
      const matchesPosition = !position || player.position === position;
      const matchesSearch = !search || `${player.name} ${club}`.toLowerCase().includes(search);
      const matchesPoints = minPoints === null || Number(player.totalPoints || 0) >= minPoints;
      const matchesPrice = maxPrice === null || Number(player.marketValue || 0) <= maxPrice;
      return matchesPosition && matchesSearch && matchesPoints && matchesPrice;
    })
    .sort((a, b) => {
      if (sort === "priceDesc") return Number(b.marketValue || 0) - Number(a.marketValue || 0);
      if (sort === "priceAsc") return Number(a.marketValue || 0) - Number(b.marketValue || 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.totalPoints || 0) - Number(a.totalPoints || 0) || Number(b.marketValue || 0) - Number(a.marketValue || 0);
    });

  els.marketList.innerHTML = list.length
    ? list.map((player) => renderPlayerCard(player, { market: true })).join("")
    : `<p class="hint">No hay jugadores con esos filtros.</p>`;
}

async function openPlayerDetail(playerId) {
  try {
    const data = state.playerStatsCache[playerId] || await api(`/api/players/${playerId}/stats`);
    state.playerStatsCache[playerId] = data;
    renderPlayerDetail(data);
    els.playerDetailModal.classList.remove("hidden");
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
      <div class="person-icon" aria-hidden="true">P</div>
      <div>
        <strong>${escapeHtml(player.name)}</strong>
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
          return `
            <div class="stats-row">
              <span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(match)} - ${escapeHtml(row.status)}</small></span>
              <span>${row.usedBy}</span>
              <span class="${row.points > 0 ? "positive" : row.points < 0 ? "negative" : ""}">${formatPoints(row.points)}</span>
            </div>
          `;
        })
        .join("") || `<p class="hint">Sin jornadas registradas.</p>`}
    </div>
  `;
}

function closePlayerDetail() {
  els.playerDetailModal.classList.add("hidden");
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
  const players = state.players || [];

  if (!gw) {
    els.lineupPlayers.innerHTML = `<p class="hint">No hay jornada disponible.</p>`;
    return;
  }

  const savedPlayers = (state.currentLineup?.players || []).map((player) => player._id);
  if (!state.lineupDraft) {
    state.lineupDraft = {
      formation: state.currentLineup?.formation || "2-2-2",
      playerIds: savedPlayers
    };
  }

  if (!FORMATIONS.includes(state.lineupDraft.formation)) {
    state.lineupDraft.formation = "2-2-2";
  }

  renderFormationSelect();
  els.lineupHelp.textContent =
    gw.status === "draft"
      ? "Elige formacion y asigna jugadores del catalogo completo sin superar tu presupuesto."
      : `La jornada esta ${gw.status}; la alineacion ya no se puede editar.`;

  els.lineupForm.querySelector("button[type='submit']").disabled = gw.status !== "draft";

  if (!players.length) {
    els.lineupPlayers.innerHTML = `<p class="hint">No hay jugadores disponibles para preparar una alineacion.</p>`;
    els.lineupCount.textContent = "0 puestos";
    updateLineupCapFromSelection();
    return;
  }

  renderPitch();

  updateLineupCapFromSelection();
}

function renderFormationSelect() {
  els.formationSelect.disabled = state.activeGameweek?.status !== "draft";
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
  const disabled = state.activeGameweek?.status !== "draft" ? "disabled" : "";
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
  const selectedInOtherSlots = new Set(
    (state.lineupDraft.playerIds || []).filter((playerId) => playerId && playerId !== selectedPlayerId)
  );
  const baseValue = lineupValueForIds((state.lineupDraft.playerIds || []).filter((playerId) => playerId && playerId !== selectedPlayerId));
  const budgetLimit = lineupBudgetLimit();
  const points = selectedPlayerId ? lineupPointsForPlayer(selectedPlayerId) : 0;
  const pointClass = points > 0 ? "positive" : points < 0 ? "negative" : "";
  const options = (state.players || [])
    .filter((player) => player.position === slot.position)
    .sort((a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0) || Number(a.marketValue || 0) - Number(b.marketValue || 0))
    .map((player) => {
      const isSelected = player._id === selectedPlayerId ? "selected" : "";
      const overBudget = !isSelected && baseValue + Number(player.marketValue || 0) > budgetLimit;
      const isDisabled = selectedInOtherSlots.has(player._id) || player.status !== "available" || overBudget ? "disabled" : "";
      return `<option value="${player._id}" ${isSelected} ${isDisabled}>${escapeHtml(player.name)} - ${formatEuro(player.marketValue)}</option>`;
    })
    .join("");

  return `
    <label class="lineup-slot" data-position="${slot.position}">
      <span class="slot-token">${slot.position}</span>
      <span class="slot-points ${pointClass}">${selectedPlayerId ? formatPoints(points) : "0 pts"}</span>
      <select name="slotPlayerIds" data-slot="${slot.key}" data-position="${slot.position}" ${disabled}>
        <option value="">${POSITION_LABELS[slot.position]}</option>
        ${options}
      </select>
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

function getSelectedLineupPlayerIds() {
  const valuesBySlot = new Map(
    $$("select[name='slotPlayerIds']").map((input) => [input.dataset.slot, input.value])
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

function handleLineupSlotChange(event) {
  if (!event.target.matches("select[name='slotPlayerIds']")) return;
  updateLineupCapFromSelection();
  renderPitch();
  updateLineupCapFromSelection();
}

async function saveLineup(event) {
  event.preventDefault();
  try {
    const gw = state.activeGameweek;
    if (!gw?._id) return;

    const slots = formationSlots(state.lineupDraft.formation);
    const playerIds = getSelectedLineupPlayerIds();
    if (playerIds.length !== slots.length) {
      showToast("Completa todos los puestos de la formacion.", "error");
      return;
    }

    if (lineupValueForIds(playerIds) > lineupBudgetLimit()) {
      showToast("La alineacion supera tu presupuesto.", "error");
      return;
    }

    const data = await api(`/api/lineups/${gw._id}`, {
      method: "POST",
      body: {
        formation: state.lineupDraft.formation,
        playerIds
      }
    });

    state.currentLineup = data.lineup;
    await refreshCore();
    renderLineup();
    showToast("Alineacion guardada.");
  } catch (error) {
    showToast(error.message, "error");
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

  return leaderboard
    .map(
      (team) => `
        <button class="leader-row leader-row-button" data-lineup-team="${team.teamId}" data-lineup-gameweek="${gameweek._id}" type="button">
          <span class="rank">#${team.rank}</span>
          <span>
            <strong>${escapeHtml(team.teamName)}</strong>
            <small>Formacion 1-${escapeHtml(team.formation || "2-2-2")} - ${formatEuro(team.budgetValue || 0)}</small>
          </span>
          <strong>${formatPoints(team.points)}</strong>
        </button>
      `
    )
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
  els.adminModalBody.appendChild(form);
  form.classList.remove("hidden");
  form.classList.add("active");
  els.adminModal.classList.remove("hidden");
  form.querySelector("input:not([type='hidden']), select, button")?.focus();
}

function closeAdminModal() {
  els.adminModal.classList.add("hidden");
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
    const [summary, settings, players, teams, clubs, gameweeks, backups] = await Promise.all([
      api("/api/admin/summary"),
      api("/api/admin/settings"),
      api("/api/admin/players"),
      api("/api/admin/teams"),
      api("/api/admin/clubs"),
      api("/api/gameweeks"),
      api("/api/admin/backups")
    ]);

    state.admin.summary = summary.summary;
    state.admin.settings = settings.settings;
    state.admin.players = players.players;
    state.admin.teams = teams.teams;
    state.admin.clubs = clubs.clubs;
    state.admin.gameweeks = gameweeks.gameweeks;
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
      <article class="admin-row">
        <div>
          <strong>${escapeHtml(player.name)}</strong>
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
          <button class="mini-button" data-edit-team="${team._id}">Editar</button>
          <button class="mini-button danger" data-delete-team="${team._id}">Borrar</button>
        </div>
      </article>
    `
    )
    .join("");

  els.adminClubs.innerHTML = state.admin.clubs
    .map(
      (club) => `
      <article class="admin-row">
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

  els.adminBackups.innerHTML = state.admin.backups.length
    ? state.admin.backups
        .map(renderAdminBackup)
        .join("")
    : `<p class="hint">Todavia no hay backups.</p>`;

  els.adminGameweeks.innerHTML = state.admin.gameweeks.map(renderAdminGameweek).join("");
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
        <small>${escapeHtml(reasonLabel)} - ${formatDateTime(backup.createdAt)} - ${counts.players || 0} jugadores - ${counts.gameweeks || 0} jornadas - ${counts.lineups || 0} alineaciones - ${counts.news || 0} noticias</small>
        <small>Usuarios snapshot: ${counts.users || 0}${backup.createdByEmail ? ` - creado por ${escapeHtml(backup.createdByEmail)}` : ""}</small>
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
          <span>${escapeHtml(match.homeClub?.shortName || "")}</span>
          <strong>${match.homeScore ?? "-"} : ${match.awayScore ?? "-"}</strong>
          <span>${escapeHtml(match.awayClub?.shortName || "")}</span>
        </div>
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
  return input.type === "checkbox" ? input.checked : Number(input.value || 0);
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
      picas: scoreInputValue(row, "picas")
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
    els.scorePlayersList.innerHTML = `<p class="hint">No hay jugadores asignados a estos dos equipos.</p>`;
    return;
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
      <strong>${escapeHtml(match.homeClub?.shortName || "LOC")} - ${escapeHtml(match.awayClub?.shortName || "VIS")}</strong>
      <span class="pill">${escapeHtml(match.status)} - ${matchScoredPlayers(match)} jugadores puntuados</span>
    </div>
    ${teamSections
      .map(
        ({ club, players: teamPlayers }) => `
          <section class="score-team-table">
            <div class="score-team-title">
              <strong>${escapeHtml(club?.name || "Equipo")}</strong>
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
    form: Number(els.playerFormInput.value || 50),
    status: els.playerStatusInput.value
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
  els.playerFormInput.value = player.form || 50;
  els.playerStatusInput.value = player.status;
  openAdminModal("player", "Editar jugador");
}

function resetPlayerForm() {
  els.playerForm.reset();
  els.playerIdInput.value = "";
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
  openAdminModal("team", "Editar equipo");
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
        city: els.clubCityInput.value
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
  openAdminModal("club", "Editar club");
}

function resetClubForm() {
  els.clubForm.reset();
  els.clubIdInput.value = "";
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
        picas: scoreInputValue(row, "picas")
      };
    });

    await api(`/api/admin/gameweeks/${gw._id}/matches/${match._id}/scores`, {
      method: "POST",
      body: {
        homeScore,
        awayScore,
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
  els.logoutBtn.addEventListener("click", () => {
    setSession(null, null);
    state.user = null;
  });

  $$(".tab, .brand").forEach((button) => {
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

  els.positionFilter.addEventListener("change", renderMarket);
  els.playerSearch.addEventListener("input", renderMarket);
  els.minPointsFilter.addEventListener("input", renderMarket);
  els.maxPriceFilter.addEventListener("input", renderMarket);
  els.marketSort.addEventListener("change", renderMarket);
  els.marketList.addEventListener("click", (event) => {
    const detail = event.target.closest("[data-player-detail]");
    if (detail) openPlayerDetail(detail.dataset.playerDetail);
  });

  els.playerDetailModal.addEventListener("click", (event) => {
    if (event.target === els.playerDetailModal || event.target.closest("[data-close-player-detail]")) {
      closePlayerDetail();
    }
  });

  els.formationSelect.addEventListener("change", handleFormationChange);
  els.lineupPlayers.addEventListener("change", handleLineupSlotChange);
  els.lineupForm.addEventListener("submit", saveLineup);

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
  els.playerForm.addEventListener("submit", savePlayer);
  els.playerResetBtn.addEventListener("click", resetPlayerForm);
  els.teamForm.addEventListener("submit", saveTeam);
  els.clubForm.addEventListener("submit", saveClub);
  els.gameweekForm.addEventListener("submit", saveGameweek);
  els.gwResetBtn.addEventListener("click", resetGameweekForm);
  els.matchForm.addEventListener("submit", saveMatch);
  els.matchResetBtn.addEventListener("click", resetMatchForm);
  els.scoreForm.addEventListener("submit", saveScore);
  els.matchGameweekInput.addEventListener("change", clearMatchEditMode);
  els.scoreMatchInput.addEventListener("change", renderScorePlayers);
  els.scoreHomeInput.addEventListener("input", updateScorePreviews);
  els.scoreAwayInput.addEventListener("input", updateScorePreviews);
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
  setAuthMode("login");

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
