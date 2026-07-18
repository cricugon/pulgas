const state = {
  token: localStorage.getItem("mlp_editor_token"),
  admin: null,
  articles: [],
  clubs: [],
  players: [],
  gameweeks: [],
  predictionContext: null,
  articleImageDataUrl: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  auth: $("#editorAuth"), shell: $("#editorShell"), loginForm: $("#editorLoginForm"), setupForm: $("#editorSetupForm"),
  loginEmail: $("#editorEmail"), loginPassword: $("#editorPassword"), setupDisplayName: $("#setupDisplayName"), setupEmail: $("#setupEmail"), setupPassword: $("#setupPassword"),
  identity: $("#editorIdentity"), logout: $("#editorLogout"), toast: $("#editorToast"),
  articleForm: $("#articleForm"), articleId: $("#articleId"), articleTitle: $("#articleTitle"), articleBody: $("#articleBody"), articleImage: $("#articleImage"), articlePlayer: $("#articlePlayer"), articleStatus: $("#articleStatus"),
  articleMarkdownPreview: $("#articleMarkdownPreview"), articleMarkdownPreviewButton: $("#articleMarkdownPreviewButton"),
  articlePreview: $("#articleImagePreview"), articleList: $("#editorArticleList"), saveArticle: $("#saveArticleButton"), cancelArticle: $("#cancelArticleButton"), newArticle: $("#newArticleButton"),
  predictionGameweek: $("#predictionGameweek"), predictionMatch: $("#predictionMatch"), loadPrediction: $("#loadPrediction"), predictionEditor: $("#predictionEditor"),
  statusClubFilter: $("#statusClubFilter"), statusSearch: $("#statusSearch"), statusList: $("#editorStatusList"),
  passwordForm: $("#editorPasswordForm"), currentPassword: $("#currentEditorPassword"), newPassword: $("#newEditorPassword"), confirmPassword: $("#confirmEditorPassword")
};

const STATUS_LABELS = { available: "Disponible", doubt: "Duda", out: "Baja" };
const POSITION_LABELS = { POR: "Portero", DEF: "Defensa", MED: "Medio", DEL: "Delantero" };

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function objectId(value) {
  return String(value?._id || value || "");
}

function formatDate(value, includeTime = true) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-ES", includeTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "medium" }
  ).format(new Date(value));
}

function showToast(message, error = false) {
  els.toast.textContent = message;
  els.toast.style.borderColor = error ? "rgba(255,95,109,.6)" : "rgba(53,217,243,.5)";
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3500);
}

async function api(path, { method = "GET", body, token = state.token } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token === state.token && path !== "/api/mundo/admin/auth/login") clearSession();
    throw new Error(data.message || "No se pudo completar la operacion.");
  }
  return data;
}

function clearSession() {
  localStorage.removeItem("mlp_editor_token");
  state.token = null;
  state.admin = null;
  els.shell.classList.add("hidden");
  els.auth.classList.remove("hidden");
}

function setSession(token) {
  state.token = token;
  localStorage.setItem("mlp_editor_token", token);
}

function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? label : button.dataset.defaultLabel;
}

function generateFormations() {
  const formations = [];
  for (let defenders = 2; defenders <= 4; defenders += 1) {
    for (let midfielders = 1; midfielders <= 3; midfielders += 1) {
      const forwards = 6 - defenders - midfielders;
      if (forwards >= 1) formations.push(`${defenders}-${midfielders}-${forwards}`);
    }
  }
  return formations;
}

const FORMATIONS = generateFormations();

function slotsForFormation(formation, existingPicks = []) {
  const [defenders, midfielders, forwards] = String(formation).split("-").map(Number);
  const counts = { POR: 1, DEF: defenders, MED: midfielders, DEL: forwards };
  const byPosition = Object.fromEntries(Object.keys(counts).map((position) => [position, existingPicks.filter((pick) => pick.position === position)]));
  const slots = [];
  for (const position of ["POR", "DEF", "MED", "DEL"]) {
    for (let index = 0; index < counts[position]; index += 1) {
      const previous = byPosition[position][index];
      slots.push({
        slotKey: `${position}-${index + 1}`,
        position,
        starter: objectId(previous?.starter),
        probability: Number(previous?.probability ?? 80),
        challenger: objectId(previous?.challenger)
      });
    }
  }
  return slots;
}

async function initializeAuth() {
  const { configured } = await api("/api/mundo/admin/setup-status", { token: null });
  els.loginForm.classList.toggle("hidden", !configured);
  els.setupForm.classList.toggle("hidden", configured);
  if (!configured) {
    state.token = null;
    localStorage.removeItem("mlp_editor_token");
    return;
  }
  if (!state.token) return;
  try {
    const { admin } = await api("/api/mundo/admin/me");
    state.admin = admin;
    await openShell();
  } catch (_error) {
    clearSession();
  }
}

async function openShell() {
  els.auth.classList.add("hidden");
  els.shell.classList.remove("hidden");
  els.identity.textContent = state.admin?.displayName || state.admin?.email || "Redaccion";
  await loadEditorialData();
}

async function loadEditorialData() {
  const [articleData, catalog] = await Promise.all([
    api("/api/mundo/admin/articles"),
    api("/api/mundo/admin/catalog")
  ]);
  state.articles = articleData.articles || [];
  state.clubs = catalog.clubs || [];
  state.players = catalog.players || [];
  state.gameweeks = catalog.gameweeks || [];
  renderArticles();
  renderCatalogControls();
  renderStatuses();
}

function setTab(tab) {
  $$('[data-editor-tab]').forEach((button) => button.classList.toggle("active", button.dataset.editorTab === tab));
  $$('[data-editor-view]').forEach((view) => view.classList.toggle("active", view.dataset.editorView === tab));
}

function closeArticleMarkdownPreview() {
  window.clearTimeout(els.articleBody.previewTimer);
  els.articleMarkdownPreview.innerHTML = "";
  els.articleMarkdownPreview.classList.add("hidden");
  els.articleMarkdownPreviewButton.textContent = "Vista previa";
}

function resetArticleForm() {
  els.articleForm.reset();
  els.articleId.value = "";
  els.articleStatus.value = "draft";
  state.articleImageDataUrl = "";
  els.articlePreview.innerHTML = "";
  els.articlePreview.classList.remove("active");
  closeArticleMarkdownPreview();
  els.saveArticle.dataset.defaultLabel = "Guardar noticia";
  els.saveArticle.textContent = "Guardar noticia";
}

async function refreshArticleMarkdownPreview({ reportError = true } = {}) {
  const body = els.articleBody.value.trim();
  if (!body) {
    els.articleMarkdownPreview.innerHTML = "";
    return false;
  }

  try {
    const data = await api("/api/mundo/admin/articles/preview", { method: "POST", body: { body } });
    els.articleMarkdownPreview.innerHTML = data.html;
    return true;
  } catch (error) {
    if (reportError) showToast(error.message, true);
    return false;
  }
}

async function toggleArticleMarkdownPreview() {
  const willOpen = els.articleMarkdownPreview.classList.contains("hidden");
  if (!willOpen) {
    els.articleMarkdownPreview.classList.add("hidden");
    els.articleMarkdownPreviewButton.textContent = "Vista previa";
    return;
  }
  if (!els.articleBody.value.trim()) return showToast("Escribe el texto de la noticia para previsualizarlo.", true);

  setButtonLoading(els.articleMarkdownPreviewButton, true, "Generando...");
  const rendered = await refreshArticleMarkdownPreview();
  setButtonLoading(els.articleMarkdownPreviewButton, false);
  if (rendered) {
    els.articleMarkdownPreview.classList.remove("hidden");
    els.articleMarkdownPreviewButton.textContent = "Ocultar vista previa";
  }
}

function renderArticles() {
  els.articleList.innerHTML = state.articles.length ? state.articles.map((article) => `
    <article class="editor-list-row">
      <img src="${escapeHtml(article.imageUrl || "/assets/stadium-bg.png")}" alt="" />
      <div>
        <span class="editor-status-pill ${article.status}">${article.status === "published" ? "Publicada" : "Borrador"}</span>
        <h2>${escapeHtml(article.title)}</h2>
        ${article.relatedPlayer ? `<small>Jugador: ${escapeHtml(article.relatedPlayer.name || "Asociado")}</small>` : ""}
        <small>${formatDate(article.publishedAt || article.updatedAt)} · ${Number(article.views || 0)} lecturas</small>
      </div>
      <div class="editor-list-actions">
        <button class="editor-secondary" data-edit-article="${article._id}" type="button">Editar</button>
        <button class="editor-danger" data-delete-article="${article._id}" type="button">Borrar</button>
      </div>
    </article>
  `).join("") : `<div class="prediction-editor-empty">No hay noticias creadas.</div>`;
}

function editArticle(id) {
  const article = state.articles.find((item) => item._id === id);
  if (!article) return;
  els.articleId.value = article._id;
  els.articleTitle.value = article.title;
  els.articleBody.value = article.body;
  els.articlePlayer.value = objectId(article.relatedPlayer);
  els.articleStatus.value = article.status;
  state.articleImageDataUrl = "";
  els.articleImage.value = "";
  els.articlePreview.innerHTML = article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="Vista previa" />` : "";
  els.articlePreview.classList.toggle("active", Boolean(article.imageUrl));
  closeArticleMarkdownPreview();
  els.saveArticle.dataset.defaultLabel = "Actualizar noticia";
  els.saveArticle.textContent = "Actualizar noticia";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (file.size > 5 * 1024 * 1024) return reject(new Error("La imagen no puede superar 5 MB."));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function gameweekById(id) {
  return state.gameweeks.find((gameweek) => gameweek._id === id);
}

function renderCatalogControls() {
  const selectedArticlePlayer = els.articlePlayer.value;
  els.articlePlayer.innerHTML = `<option value="">Sin jugador asociado</option>${state.players
    .map((player) => `<option value="${player._id}">${escapeHtml(player.name)} - ${escapeHtml(player.club?.shortName || player.club?.name || "Sin club")}</option>`)
    .join("")}`;
  if ([...els.articlePlayer.options].some((option) => option.value === selectedArticlePlayer)) {
    els.articlePlayer.value = selectedArticlePlayer;
  }
  els.predictionGameweek.innerHTML = state.gameweeks.length
    ? state.gameweeks.map((gameweek) => `<option value="${gameweek._id}">${escapeHtml(gameweek.name)} · ${escapeHtml(gameweek.status)}</option>`).join("")
    : `<option value="">Sin jornadas</option>`;
  renderMatchOptions();
  els.statusClubFilter.innerHTML = `<option value="">Todos los clubes</option>${state.clubs.map((club) => `<option value="${club._id}">${escapeHtml(club.name)}</option>`).join("")}`;
}

function renderMatchOptions() {
  const gameweek = gameweekById(els.predictionGameweek.value);
  els.predictionMatch.innerHTML = gameweek?.matches?.length
    ? gameweek.matches.map((match) => `<option value="${match._id}">${escapeHtml(match.homeClub?.shortName || "LOC")} - ${escapeHtml(match.awayClub?.shortName || "VIS")} · ${formatDate(match.kickoff)}</option>`).join("")
    : `<option value="">Sin partidos</option>`;
}

function playerOptions(clubId, position, selectedId = "", emptyLabel = "Seleccionar jugador") {
  const players = state.predictionContext?.players || state.players;
  return `<option value="">${escapeHtml(emptyLabel)}</option>${players
    .filter((player) => objectId(player.club) === clubId && (!position || player.position === position))
    .map((player) => {
      const status = player.mundoStatus?.status || "available";
      const suffix = status === "available" ? "" : ` · ${STATUS_LABELS[status]}`;
      const positionLabel = position ? "" : ` · ${player.position}`;
      return `<option value="${player._id}" ${player._id === selectedId ? "selected" : ""}>${escapeHtml(player.name + positionLabel + suffix)}</option>`;
    }).join("")}`;
}

function predictionTeamMarkup(team) {
  const club = team.side === "home" ? state.predictionContext.match.homeClub : state.predictionContext.match.awayClub;
  const clubId = objectId(club);
  return `
    <section class="prediction-team-editor" data-team-editor="${team.side}" data-club-id="${clubId}">
      <div class="prediction-team-editor-header">
        <h2>${escapeHtml(club.name || club.shortName)}</h2>
        <label>Formacion<select data-team-formation>${FORMATIONS.map((formation) => `<option value="${formation}" ${formation === team.formation ? "selected" : ""}>${formation}</option>`).join("")}</select></label>
      </div>
      <div class="prediction-slots">
        ${team.picks.map((pick) => {
          const status = state.predictionContext.players.find((player) => player._id === objectId(pick.starter))?.mundoStatus;
          return `
            <div class="prediction-slot ${Number(pick.probability) < 70 ? "risk" : ""}" data-prediction-slot="${pick.slotKey}" data-position="${pick.position}">
              <span class="prediction-slot-position">${pick.position}</span>
              <select data-slot-starter aria-label="Titular ${POSITION_LABELS[pick.position]}">${playerOptions(clubId, pick.position, objectId(pick.starter))}</select>
              <input data-slot-probability type="number" min="0" max="100" step="1" value="${Number(pick.probability ?? 80)}" aria-label="Probabilidad" />
              <select class="challenger-field" data-slot-challenger aria-label="Jugador que disputa el puesto">${playerOptions(clubId, null, objectId(pick.challenger), "Sin suplente en disputa")}</select>
              <span class="prediction-slot-status">${status ? `${STATUS_LABELS[status.status] || "Disponible"}${status.note ? ` · ${escapeHtml(status.note)}` : ""}` : "Selecciona un titular"}</span>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function collectTeamEditor(side) {
  const container = document.querySelector(`[data-team-editor="${side}"]`);
  if (!container) return state.predictionContext.prediction.teams.find((team) => team.side === side);
  return {
    side,
    club: container.dataset.clubId,
    formation: container.querySelector("[data-team-formation]").value,
    picks: [...container.querySelectorAll("[data-prediction-slot]")].map((slot) => ({
      slotKey: slot.dataset.predictionSlot,
      position: slot.dataset.position,
      starter: slot.querySelector("[data-slot-starter]").value,
      probability: Number(slot.querySelector("[data-slot-probability]").value),
      challenger: slot.querySelector("[data-slot-challenger]").value || null
    }))
  };
}

function collectPrediction() {
  return [collectTeamEditor("home"), collectTeamEditor("away")];
}

function renderPredictionEditor() {
  const context = state.predictionContext;
  if (!context) return;
  const prediction = context.prediction;
  els.predictionEditor.className = "prediction-editor";
  els.predictionEditor.innerHTML = `
    <div class="prediction-match-context">
      <strong>${escapeHtml(context.match.homeClub?.name || "Local")}</strong><span>VS</span><strong>${escapeHtml(context.match.awayClub?.name || "Visitante")}</strong>
    </div>
    <div class="prediction-team-editors">${prediction.teams.map(predictionTeamMarkup).join("")}</div>
    <div class="prediction-save-bar">
      ${context.prediction._id ? `<button class="editor-danger" data-delete-prediction type="button">Borrar</button>` : ""}
      <button class="editor-secondary" data-save-prediction="draft" type="button">Guardar borrador</button>
      <button class="editor-primary" data-save-prediction="published" type="button">Publicar prediccion</button>
    </div>
  `;

  els.predictionEditor.querySelectorAll("[data-team-formation]").forEach((select) => {
    select.addEventListener("change", () => {
      const side = select.closest("[data-team-editor]").dataset.teamEditor;
      const currentTeams = collectPrediction();
      prediction.teams = currentTeams.map((team) => team.side === side
        ? { ...team, formation: select.value, picks: slotsForFormation(select.value, team.picks) }
        : team
      );
      renderPredictionEditor();
    });
  });

  els.predictionEditor.querySelectorAll("[data-slot-probability]").forEach((input) => {
    input.addEventListener("input", () => input.closest(".prediction-slot").classList.toggle("risk", Number(input.value) < 70));
  });

  els.predictionEditor.querySelectorAll("[data-slot-starter]").forEach((select) => {
    select.addEventListener("change", () => {
      const player = context.players.find((item) => item._id === select.value);
      const label = select.closest(".prediction-slot").querySelector(".prediction-slot-status");
      const status = player?.mundoStatus;
      label.textContent = player ? `${STATUS_LABELS[status?.status || "available"]}${status?.note ? ` · ${status.note}` : ""}` : "Selecciona un titular";
    });
  });
}

async function openPrediction() {
  const gameweekId = els.predictionGameweek.value;
  const matchId = els.predictionMatch.value;
  if (!gameweekId || !matchId) return showToast("Selecciona un partido.", true);
  setButtonLoading(els.loadPrediction, true, "Cargando...");
  try {
    const data = await api(`/api/mundo/admin/predictions/${gameweekId}/${matchId}`);
    const teams = data.prediction?.teams?.length ? data.prediction.teams.map((team) => ({
      ...team,
      club: objectId(team.club),
      picks: team.picks.map((pick) => ({ ...pick, starter: objectId(pick.starter), challenger: objectId(pick.challenger) }))
    })) : [
      { side: "home", club: objectId(data.match.homeClub), formation: "2-2-2", picks: slotsForFormation("2-2-2") },
      { side: "away", club: objectId(data.match.awayClub), formation: "2-2-2", picks: slotsForFormation("2-2-2") }
    ];
    state.predictionContext = {
      ...data,
      prediction: { ...(data.prediction || {}), status: data.prediction?.status || "draft", teams }
    };
    renderPredictionEditor();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(els.loadPrediction, false);
  }
}

async function savePrediction(status, button) {
  const context = state.predictionContext;
  if (!context) return;
  setButtonLoading(button, true, status === "published" ? "Publicando..." : "Guardando...");
  try {
    const teams = collectPrediction();
    const data = await api(`/api/mundo/admin/predictions/${context.gameweek._id}/${context.match._id}`, {
      method: "PUT",
      body: { status, teams }
    });
    context.prediction = { ...context.prediction, ...data.prediction, teams };
    showToast(data.message);
    await openPrediction();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(button, false);
  }
}

function renderStatuses() {
  const clubId = els.statusClubFilter.value;
  const search = els.statusSearch.value.trim().toLowerCase();
  const players = state.players.filter((player) => {
    const clubMatches = !clubId || objectId(player.club) === clubId;
    const textMatches = !search || `${player.name} ${player.club?.name || ""}`.toLowerCase().includes(search);
    return clubMatches && textMatches;
  });
  els.statusList.innerHTML = players.length ? players.map((player) => {
    const status = player.mundoStatus?.status || "available";
    return `
      <article class="editor-player-row" data-status-player="${player._id}">
        <div><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.club?.shortName || player.club?.name || "Sin club")} · ${escapeHtml(POSITION_LABELS[player.position] || player.position)}</small></div>
        <select data-player-status aria-label="Estado de ${escapeHtml(player.name)}">
          ${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <input data-player-note maxlength="240" value="${escapeHtml(player.mundoStatus?.note || "")}" placeholder="Motivo o detalle opcional" aria-label="Detalle del estado" />
      </article>
    `;
  }).join("") : `<div class="prediction-editor-empty">No hay jugadores con este filtro.</div>`;
}

async function updatePlayerStatus(row) {
  if (row.classList.contains("saving")) return;
  row.classList.add("saving");
  const player = state.players.find((item) => item._id === row.dataset.statusPlayer);
  try {
    const status = row.querySelector("[data-player-status]").value;
    const note = row.querySelector("[data-player-note]").value.trim();
    const data = await api(`/api/mundo/admin/players/${player._id}/status`, { method: "PATCH", body: { status, note } });
    player.mundoStatus = { status, note, updatedAt: data.playerStatus.updatedAt };
    showToast(`${player.name}: estado actualizado.`);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    row.classList.remove("saving");
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  setButtonLoading(button, true, "Entrando...");
  try {
    const data = await api("/api/mundo/admin/auth/login", {
      method: "POST",
      token: null,
      body: { email: els.loginEmail.value, password: els.loginPassword.value }
    });
    setSession(data.token);
    state.admin = data.admin;
    await openShell();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(button, false);
  }
});

els.setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type='submit']");
  setButtonLoading(button, true, "Creando...");
  try {
    const data = await api("/api/mundo/admin/setup", {
      method: "POST",
      token: localStorage.getItem("pl_token"),
      body: { displayName: els.setupDisplayName.value, email: els.setupEmail.value, password: els.setupPassword.value }
    });
    setSession(data.token);
    const me = await api("/api/mundo/admin/me");
    state.admin = me.admin;
    await openShell();
    showToast("Administrador editorial creado.");
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(button, false);
  }
});

els.logout.addEventListener("click", clearSession);

$$('[data-editor-tab]').forEach((button) => button.addEventListener("click", () => setTab(button.dataset.editorTab)));

els.articleImage.addEventListener("change", async () => {
  try {
    state.articleImageDataUrl = await fileAsDataUrl(els.articleImage.files[0]);
    els.articlePreview.innerHTML = state.articleImageDataUrl ? `<img src="${state.articleImageDataUrl}" alt="Vista previa" />` : "";
    els.articlePreview.classList.toggle("active", Boolean(state.articleImageDataUrl));
  } catch (error) {
    els.articleImage.value = "";
    showToast(error.message, true);
  }
});

els.articleMarkdownPreviewButton.addEventListener("click", toggleArticleMarkdownPreview);
els.articleBody.addEventListener("input", () => {
  if (els.articleMarkdownPreview.classList.contains("hidden")) return;
  window.clearTimeout(els.articleBody.previewTimer);
  els.articleBody.previewTimer = window.setTimeout(() => refreshArticleMarkdownPreview({ reportError: false }), 350);
});

els.articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = els.articleId.value;
  setButtonLoading(els.saveArticle, true, els.articleStatus.value === "published" ? "Publicando..." : "Guardando...");
  try {
    const data = await api(id ? `/api/mundo/admin/articles/${id}` : "/api/mundo/admin/articles", {
      method: id ? "PUT" : "POST",
      body: {
        title: els.articleTitle.value,
        body: els.articleBody.value,
        status: els.articleStatus.value,
        relatedPlayer: els.articlePlayer.value || null,
        imageDataUrl: state.articleImageDataUrl,
        imageFilename: els.articleImage.files[0]?.name || ""
      }
    });
    resetArticleForm();
    const articleData = await api("/api/mundo/admin/articles");
    state.articles = articleData.articles;
    renderArticles();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(els.saveArticle, false);
  }
});

els.cancelArticle.addEventListener("click", resetArticleForm);
els.newArticle.addEventListener("click", () => { resetArticleForm(); window.scrollTo({ top: 0, behavior: "smooth" }); });

els.articleList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-article]");
  if (editButton) return editArticle(editButton.dataset.editArticle);
  const deleteButton = event.target.closest("[data-delete-article]");
  if (!deleteButton || !window.confirm("¿Borrar definitivamente esta noticia?")) return;
  try {
    const data = await api(`/api/mundo/admin/articles/${deleteButton.dataset.deleteArticle}`, { method: "DELETE" });
    state.articles = state.articles.filter((article) => article._id !== deleteButton.dataset.deleteArticle);
    renderArticles();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, true);
  }
});

els.predictionGameweek.addEventListener("change", renderMatchOptions);
els.loadPrediction.addEventListener("click", openPrediction);

els.predictionEditor.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save-prediction]");
  if (saveButton) return savePrediction(saveButton.dataset.savePrediction, saveButton);
  const deleteButton = event.target.closest("[data-delete-prediction]");
  if (!deleteButton || !state.predictionContext || !window.confirm("¿Borrar esta prediccion?")) return;
  try {
    const context = state.predictionContext;
    const data = await api(`/api/mundo/admin/predictions/${context.gameweek._id}/${context.match._id}`, { method: "DELETE" });
    showToast(data.message);
    await openPrediction();
  } catch (error) {
    showToast(error.message, true);
  }
});

els.statusClubFilter.addEventListener("change", renderStatuses);
els.statusSearch.addEventListener("input", renderStatuses);
els.statusList.addEventListener("change", (event) => {
  const row = event.target.closest("[data-status-player]");
  if (row && event.target.matches("[data-player-status]")) updatePlayerStatus(row);
});
els.statusList.addEventListener("focusout", (event) => {
  const row = event.target.closest("[data-status-player]");
  if (row && event.target.matches("[data-player-note]")) {
    const player = state.players.find((item) => item._id === row.dataset.statusPlayer);
    if (event.target.value.trim() !== (player?.mundoStatus?.note || "")) updatePlayerStatus(row);
  }
});

els.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (els.newPassword.value !== els.confirmPassword.value) return showToast("Las nuevas contrasenas no coinciden.", true);
  const button = event.currentTarget.querySelector("button[type='submit']");
  setButtonLoading(button, true, "Actualizando...");
  try {
    const data = await api("/api/mundo/admin/account/password", {
      method: "PUT",
      body: { currentPassword: els.currentPassword.value, newPassword: els.newPassword.value }
    });
    els.passwordForm.reset();
    showToast(data.message);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonLoading(button, false);
  }
});

initializeAuth().catch((error) => showToast(error.message, true));
