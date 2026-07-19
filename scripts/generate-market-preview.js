import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Club } from "../src/models/Club.js";
import { Gameweek } from "../src/models/Gameweek.js";
import { Lineup } from "../src/models/Lineup.js";
import { Player } from "../src/models/Player.js";
import { User } from "../src/models/User.js";
import {
  MARKET_VALUE_RULES,
  balanceMarketValueProjections,
  buildNextOpponentMap,
  buildPercentileMap,
  buildPlayerPerformanceStats,
  calculateClubStrengths,
  projectPlayerMarketValue
} from "../src/services/marketValues.js";
import { buildGameweekScoreMap } from "../src/services/scoring.js";

const POSITION_ORDER = new Map([
  ["POR", 0],
  ["DEF", 1],
  ["MED", 2],
  ["DEL", 3]
]);

function objectId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value || "");
}

function sameId(left, right) {
  return objectId(left) === objectId(right);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEuro(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatCompactEuro(value) {
  const millions = Number(value || 0) / 1000000;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(millions)} M€`;
}

function formatSignedEuro(value) {
  const amount = Number(value || 0);
  if (!amount) return "Sin cambio";
  return `${amount > 0 ? "+" : "-"}${formatCompactEuro(Math.abs(amount))}`;
}

function formatPercent(value, { signed = false, digits = 1 } = {}) {
  const percentage = Number(value || 0) * 100;
  const prefix = signed && percentage > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("es-ES", { maximumFractionDigits: digits }).format(percentage)} %`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short"
  }).format(value);
}

function direction(change) {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "stable";
}

function positionAverages(players, valueForPlayer) {
  const grouped = new Map();
  for (const player of players) {
    const current = grouped.get(player.position) || { total: 0, count: 0 };
    current.total += Number(valueForPlayer(player) || 0);
    current.count += 1;
    grouped.set(player.position, current);
  }
  return new Map([...grouped.entries()].map(([position, row]) => [
    position,
    row.count ? row.total / row.count : 0
  ]));
}

function playedPlayerIds(gameweek) {
  const played = new Set();
  for (const match of gameweek.matches || []) {
    for (const score of match.playerScores || []) {
      if (score.played) played.add(objectId(score.player));
    }
  }
  return played;
}

function lineupUsage(lineups) {
  const usage = new Map();
  for (const lineup of lineups) {
    for (const player of lineup.players || []) {
      const id = objectId(player);
      usage.set(id, (usage.get(id) || 0) + 1);
    }
  }
  return usage;
}

function factorTone(value) {
  if (value > 0.0005) return "up";
  if (value < -0.0005) return "down";
  return "stable";
}

function renderFactors(entry) {
  const factors = [
    ["Puntos frente a precio", entry.projection.contributions.valueEfficiency],
    ["Actuación top", entry.projection.contributions.excellence],
    ["Comparación por puesto", entry.projection.contributions.position],
    ["Histórico frente a precio", entry.projection.contributions.seasonValueEfficiency],
    ["Histórico por puesto", entry.projection.contributions.seasonPosition],
    ["Demanda", entry.projection.contributions.demand],
    ["Próximo rival", entry.projection.contributions.opponent],
    ["Estado", entry.projection.contributions.status],
    ["Participación", entry.projection.contributions.participation]
  ];

  if (entry.alreadyRecorded) {
    return '<span class="factor stable">Valor ya registrado para esta jornada</span>';
  }
  if (!entry.projection.hasAnySignal) {
    return '<span class="factor stable">Su club no tiene puntuación en esta jornada: conserva su valor</span>';
  }

  const factorHtml = factors
    .map(([label, value]) => `<span class="factor ${factorTone(value)}">${escapeHtml(label)} ${formatPercent(value, { signed: true, digits: 2 })}</span>`)
    .join("");
  const balanceTone = factorTone(entry.projection.balanceAdjustment);

  return `${factorHtml}<span class="factor ${balanceTone}">Equilibrio ${formatSignedEuro(entry.projection.balanceAdjustment)}</span>`;
}

function renderMover(entry) {
  return `
    <div class="mover">
      <span class="club-token">${escapeHtml(entry.clubShortName)}</span>
      <div><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.position)} · ${formatCompactEuro(entry.oldValue)} → ${formatCompactEuro(entry.newValue)}</small></div>
      <b class="${entry.direction}">${formatSignedEuro(entry.change)}</b>
    </div>
  `;
}

function renderPlayer(entry) {
  const searchValue = `${entry.name} ${entry.clubName} ${entry.clubShortName}`.toLowerCase();
  const roundLabel = !entry.projection.hasAnySignal
    ? "Sin partido"
    : entry.playedInGameweek
      ? `${entry.gameweekPoints} · P${Math.round(entry.projection.gameweekPointsPercentile * 100)}`
      : "0 · No jugó";
  const projectionDetails = entry.projection.hasAnySignal
    ? `
        <span class="factor note">Percentil puntos ${Math.round(entry.projection.gameweekPointsPercentile * 100)} · precio ${Math.round(entry.projection.marketValuePercentile * 100)}</span>
        <span class="factor note">Media ${escapeHtml(entry.position)} ${Number(entry.gameweekPositionAverage || 0).toFixed(2)} pts</span>
        <span class="factor note">Límite personal +${formatPercent(entry.projection.maxRiseRate)} / -${formatPercent(entry.projection.maxDropRate)}</span>
        <span class="factor note">Cambio bruto ${formatSignedEuro(entry.projection.unbalancedChange)}</span>
      `
    : "";
  return `
    <article class="player-row" data-search="${escapeHtml(searchValue)}" data-club="${escapeHtml(entry.clubId)}" data-position="${escapeHtml(entry.position)}" data-direction="${entry.direction}">
      <div class="player-main">
        <span class="club-token">${escapeHtml(entry.clubShortName)}</span>
        <div class="player-name"><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.clubName)}</small></div>
        <span class="position pos-${entry.position.toLowerCase()}">${escapeHtml(entry.position)}</span>
        <div class="metric"><small>Valor actual</small><strong>${formatCompactEuro(entry.oldValue)}</strong></div>
        <div class="metric"><small>Puntos J${entry.gameweekNumber}</small><strong>${roundLabel}</strong></div>
        <div class="metric"><small>Media histórica</small><strong>${entry.evaluatedRounds ? `${entry.pointsPerRound.toFixed(1)} pts` : "Sin datos"}</strong></div>
        <div class="metric"><small>Alineaciones</small><strong>${entry.usage} de ${entry.lockedLineups}</strong></div>
        <div class="metric"><small>Próximo rival</small><strong>${escapeHtml(entry.nextOpponentName)}</strong></div>
        <div class="metric"><small>Valor simulado</small><strong>${formatCompactEuro(entry.newValue)}</strong></div>
        <div class="change ${entry.direction}"><strong>${formatSignedEuro(entry.change)}</strong><small>${formatPercent(entry.changeRate, { signed: true })}</small></div>
      </div>
      <div class="player-factors">
        ${renderFactors(entry)}
        ${projectionDetails}
      </div>
    </article>
  `;
}

function renderReport(data) {
  const clubOptions = data.clubs
    .sort((left, right) => left.name.localeCompare(right.name, "es"))
    .map((club) => `<option value="${escapeHtml(club._id.toString())}">${escapeHtml(club.name)}</option>`)
    .join("");
  const topRises = data.entries.filter((entry) => entry.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const topDrops = data.entries.filter((entry) => entry.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simulación de mercado · ${escapeHtml(data.gameweek.name)}</title>
  <style>
    :root { color-scheme: dark; --bg:#050914; --panel:#0a1324; --line:#20324d; --text:#edf5ff; --muted:#91a5bf; --blue:#4c8dff; --cyan:#45ddff; --up:#41df95; --down:#ff6577; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--text); background:var(--bg); font-family:Inter,Segoe UI,Arial,sans-serif; letter-spacing:0; }
    main { width:min(1540px, 100%); margin:auto; padding:28px clamp(14px,3vw,40px) 60px; }
    header.hero { padding:26px 0 24px; border-bottom:1px solid var(--line); }
    .eyebrow { color:var(--cyan); font-size:.74rem; font-weight:900; text-transform:uppercase; }
    h1 { margin:8px 0; font-size:clamp(1.8rem,4vw,3.4rem); line-height:1; }
    .hero p { max-width:860px; margin:10px 0 0; color:var(--muted); line-height:1.55; }
    .notice { display:flex; gap:10px; align-items:flex-start; margin-top:18px; padding:12px 14px; border-left:3px solid var(--cyan); background:#0a1930; color:#cfe6ff; font-size:.82rem; }
    .kpis { display:grid; grid-template-columns:repeat(4,minmax(150px,1fr)); gap:1px; margin:22px 0; border:1px solid var(--line); background:var(--line); }
    .kpi { min-height:100px; padding:16px; background:var(--panel); }
    .kpi small,.metric small,.player-name small,.mover small { display:block; color:var(--muted); font-size:.67rem; }
    .kpi strong { display:block; margin-top:10px; font-size:1.15rem; }
    .up { color:var(--up); } .down { color:var(--down); } .stable { color:var(--muted); }
    .methodology { margin:0 0 24px; border-top:2px solid var(--cyan); background:var(--panel); }
    .methodology-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding:16px; border-bottom:1px solid var(--line); }
    .methodology-header h2 { margin:0 0 5px; font-size:1rem; }
    .methodology-header p { margin:0; max-width:820px; color:var(--muted); font-size:.75rem; line-height:1.5; }
    .balance-summary { flex:0 0 auto; text-align:right; }
    .balance-summary strong,.balance-summary small { display:block; }
    .balance-summary small { margin-top:4px; color:var(--muted); font-size:.66rem; }
    .method-grid { display:grid; grid-template-columns:repeat(3,1fr); }
    .method-item { min-height:126px; padding:15px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
    .method-item:nth-child(3n) { border-right:0; }
    .method-item b { display:block; margin-bottom:7px; color:var(--cyan); font-size:.72rem; text-transform:uppercase; }
    .method-item strong { display:block; margin-bottom:6px; font-size:.84rem; }
    .method-item p { margin:0; color:var(--muted); font-size:.7rem; line-height:1.5; }
    .method-rules { display:flex; flex-wrap:wrap; gap:8px; padding:13px 16px; }
    .method-rules span { padding:6px 8px; border:1px solid #29415f; color:#c9d9eb; font-size:.65rem; }
    .movers { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:0 0 24px; }
    .band { border-top:2px solid var(--blue); background:var(--panel); }
    .band h2 { margin:0; padding:14px 16px; border-bottom:1px solid var(--line); font-size:.9rem; }
    .mover { display:grid; grid-template-columns:38px minmax(0,1fr) auto; gap:10px; align-items:center; min-height:58px; padding:8px 14px; border-bottom:1px solid #17263b; }
    .mover:last-child { border-bottom:0; }
    .mover b { white-space:nowrap; }
    .club-token { display:grid; width:36px; height:36px; place-items:center; border:1px solid #34527c; background:#0e2445; color:#dbeaff; font-size:.62rem; font-weight:950; }
    .toolbar { position:sticky; top:0; z-index:3; display:grid; grid-template-columns:minmax(180px,1fr) repeat(3,minmax(120px,180px)); gap:10px; padding:12px 0; background:rgba(5,9,20,.96); backdrop-filter:blur(10px); }
    input,select { width:100%; min-height:42px; padding:0 12px; border:1px solid #2a4162; border-radius:4px; color:var(--text); background:#0b1729; font:inherit; }
    .result-count { margin:4px 0 10px; color:var(--muted); font-size:.75rem; }
    .table-head,.player-main { display:grid; grid-template-columns:42px minmax(190px,1.5fr) 55px repeat(4,minmax(80px,.72fr)) minmax(110px,.9fr) minmax(100px,.8fr) minmax(105px,.75fr); gap:10px; align-items:center; }
    .table-head { min-height:42px; padding:0 12px; border:1px solid var(--line); background:#0c1c33; color:var(--muted); font-size:.62rem; font-weight:900; text-transform:uppercase; }
    .player-row { border:1px solid var(--line); border-top:0; background:#081321; }
    .player-main { min-height:72px; padding:10px 12px; }
    .player-name { min-width:0; }
    .player-name strong { display:block; overflow-wrap:anywhere; font-size:.82rem; }
    .position { justify-self:start; padding:5px 7px; border-radius:3px; font-size:.64rem; font-weight:950; }
    .pos-por { color:#ffe07b; background:#4a3c11; } .pos-def { color:#83c6ff; background:#123b62; } .pos-med { color:#7af1ae; background:#123e2b; } .pos-del { color:#ff98a4; background:#4d1e29; }
    .metric strong { display:block; margin-top:3px; font-size:.76rem; }
    .change { text-align:right; }
    .change strong,.change small { display:block; }
    .change strong { font-size:.82rem; }
    .change small { margin-top:4px; color:inherit; }
    .player-factors { display:flex; flex-wrap:wrap; gap:6px; padding:8px 12px 10px 60px; border-top:1px solid #15253a; background:#07101c; }
    .factor { padding:4px 7px; border:1px solid currentColor; border-radius:3px; font-size:.61rem; font-weight:800; }
    .factor.note { color:#7088a7; }
    .empty { display:none; padding:30px; border:1px solid var(--line); color:var(--muted); text-align:center; }
    footer { margin-top:24px; color:var(--muted); font-size:.7rem; line-height:1.5; }
    @media (max-width:1100px) { .kpis { grid-template-columns:repeat(2,1fr); } .table-head { display:none; } .player-main { grid-template-columns:42px minmax(150px,1fr) 55px repeat(4,minmax(75px,.7fr)); } .player-main .metric:nth-of-type(5),.player-main .change { grid-column:auto; } }
    @media (max-width:760px) { main { padding-top:12px; } .methodology-header { display:block; } .balance-summary { margin-top:12px; text-align:left; } .method-grid { grid-template-columns:1fr; } .method-item,.method-item:nth-child(3n) { min-height:0; border-right:0; } .movers { grid-template-columns:1fr; } .toolbar { grid-template-columns:1fr 1fr; } .toolbar input { grid-column:1/-1; } .player-main { grid-template-columns:38px minmax(0,1fr) auto; gap:9px; } .player-main .metric,.player-main .change { padding-top:8px; border-top:1px solid #17283e; text-align:left; } .player-main .metric { grid-column:span 1; } .player-main .change { grid-column:span 1; } .player-factors { padding-left:10px; } }
    @media (max-width:480px) { .kpis,.movers { grid-template-columns:1fr; } .toolbar { grid-template-columns:1fr 1fr; } .player-main .metric,.player-main .change { grid-column:span 3; display:flex; justify-content:space-between; align-items:center; } .player-main .metric strong { margin:0; } }
    @media print { :root { color-scheme:light; --bg:#fff; --panel:#fff; --line:#cbd5e1; --text:#0f172a; --muted:#475569; } main { width:100%; padding:0; } .toolbar { display:none; } .player-row { break-inside:avoid; } .player-factors { background:#f8fafc; } .notice { background:#eff6ff; color:#1e3a5f; } }
  </style>
</head>
<body>
<main>
  <header class="hero">
    <span class="eyebrow">Las Pulgas Fantasy · Informe de simulación</span>
    <h1>Mercado tras cerrar ${escapeHtml(data.gameweek.name)}</h1>
    <p>Proyección calculada con el estado exacto de jugadores, puntuaciones, alineaciones bloqueadas, usuarios activos, rivales futuros y resultados disponibles en el momento de generar este documento.</p>
    <div class="notice"><strong>SIMULACIÓN</strong><span>No se ha cerrado la jornada ni se ha escrito ningún dato en MongoDB. Si cambian puntuaciones, alineaciones, estados o próximas jornadas, el resultado real también cambiará.</span></div>
  </header>

  <section class="kpis">
    <div class="kpi"><small>Valor actual del mercado</small><strong>${formatEuro(data.currentMarketValue)}</strong></div>
    <div class="kpi"><small>Valor simulado</small><strong>${formatEuro(data.projectedMarketValue)}</strong></div>
    <div class="kpi"><small>Variación neta</small><strong class="${direction(data.netChange)}">${formatSignedEuro(data.netChange)}</strong></div>
    <div class="kpi"><small>Objetivo de equilibrio</small><strong>${formatSignedEuro(data.marketBalance.targetChange)}</strong></div>
    <div class="kpi"><small>Suben / bajan / igual</small><strong><span class="up">${data.rises}</span> / <span class="down">${data.drops}</span> / ${data.unchanged}</strong></div>
    <div class="kpi"><small>Jugadores evaluados</small><strong>${data.evaluatedPlayers} / ${data.entries.length}</strong></div>
    <div class="kpi"><small>Usuarios activos</small><strong>${data.activeUsers}</strong></div>
    <div class="kpi"><small>Alineaciones bloqueadas</small><strong>${data.completedLineups} completas</strong></div>
  </section>

  <section class="methodology">
    <div class="methodology-header">
      <div><h2>Cómo se calcula cada valor</h2><p>El algoritmo premia el rendimiento que justifica el precio pagado. Los factores deportivos deciden primero la dirección; el equilibrio global solo reduce la magnitud del lado dominante y nunca convierte una bajada en subida ni al contrario.</p></div>
      <div class="balance-summary"><strong>${formatSignedEuro(data.marketBalance.rawNetChange)} → ${formatSignedEuro(data.marketBalance.balancedNetChange)}</strong><small>Cambio bruto → cambio equilibrado</small></div>
    </div>
    <div class="method-grid">
      <div class="method-item"><b>01 · Factor principal</b><strong>Puntos frente al precio · hasta 22 %</strong><p>Amplifica las diferencias claras entre el percentil de puntos y el de precio. La franja media es más sensible, los valores superiores a 20 M€ se amortiguan y una actuación top puede aportar hasta 11 %.</p></div>
      <div class="method-item"><b>02 · Contexto deportivo</b><strong>Comparación por posición · 1,8 %</strong><p>Compara sus puntos con la media de su puesto, pero solo entre jugadores cuyos clubes tienen partido puntuado. Sirve de contexto, no domina el precio.</p></div>
      <div class="method-item"><b>03 · Rendimiento histórico</b><strong>Fiabilidad progresiva · hasta 6 %</strong><p>Usa puntos medios por jornada evaluada. Su peso crece durante las cinco primeras jornadas para evitar conclusiones fuertes con una sola actuación.</p></div>
      <div class="method-item"><b>04 · Mercado y calendario</b><strong>Demanda 1,2 % · rival hasta 0,75 %</strong><p>La popularidad y la dificultad del próximo rival ajustan el resultado, pero no pueden compensar por sí solas un rendimiento impropio de su precio.</p></div>
      <div class="method-item"><b>05 · Límites por precio</b><strong>Subidas y bajadas asimétricas</strong><p>Un jugador de 5 M€ puede subir hasta 16 % y bajar como máximo 4 %. En 18 M€ el margen de subida es 12 %; en 30 M€, solo 3 %.</p></div>
      <div class="method-item"><b>06 · Equilibrio global</b><strong>Inflación objetivo ${formatPercent(MARKET_VALUE_RULES.targetMarketGrowthRate, { digits: 2 })}</strong><p>Se eliminan primero los cambios marginales del lado que desequilibra el mercado. Los movimientos con mayor respaldo deportivo conservan su magnitud y nunca cambian de dirección.</p></div>
    </div>
    <div class="method-rules"><span>Club sin partido puntuado: sin cambio</span><span>Zona neutra: menos de 0,75 % no cambia</span><span>No jugó: penalización base moderada de 1 %</span><span>Lesión: -1,5 %</span><span>Sanción: -2 %</span><span>Mínimo 5 M€</span><span>Máximo 30 M€</span></div>
  </section>

  <section class="movers">
    <div class="band"><h2>Mayores subidas</h2>${topRises.map(renderMover).join("") || '<div class="mover">No hay subidas simuladas.</div>'}</div>
    <div class="band"><h2>Mayores bajadas</h2>${topDrops.map(renderMover).join("") || '<div class="mover">No hay bajadas simuladas.</div>'}</div>
  </section>

  <section>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Buscar jugador o club" aria-label="Buscar jugador o club" />
      <select id="club" aria-label="Filtrar por club"><option value="">Todos los clubes</option>${clubOptions}</select>
      <select id="position" aria-label="Filtrar por posición"><option value="">Todas las posiciones</option><option>POR</option><option>DEF</option><option>MED</option><option>DEL</option></select>
      <select id="direction" aria-label="Filtrar por variación"><option value="">Todas las variaciones</option><option value="up">Subidas</option><option value="down">Bajadas</option><option value="stable">Sin cambio</option></select>
    </div>
    <p class="result-count" id="result-count"></p>
    <div class="table-head"><span>Club</span><span>Jugador</span><span>Pos.</span><span>Actual</span><span>Jornada</span><span>Media</span><span>Uso</span><span>Próximo rival</span><span>Simulado</span><span>Variación</span></div>
    <div id="players">${data.entries.map(renderPlayer).join("")}</div>
    <div class="empty" id="empty">No hay jugadores que coincidan con los filtros.</div>
  </section>

  <footer>
    Generado el ${escapeHtml(formatDate(data.generatedAt))}. Próxima jornada detectada: ${escapeHtml(data.nextGameweek?.name || "no programada")}. Valores entre ${formatCompactEuro(MARKET_VALUE_RULES.minValue)} y ${formatCompactEuro(MARKET_VALUE_RULES.maxValue)}, límite absoluto ${formatPercent(MARKET_VALUE_RULES.maxChangeRate)} y redondeo a ${formatEuro(MARKET_VALUE_RULES.valueStep)}. La simulación utiliza únicamente consultas de lectura.
  </footer>
</main>
<script>
  const controls = [document.querySelector('#search'), document.querySelector('#club'), document.querySelector('#position'), document.querySelector('#direction')];
  const rows = [...document.querySelectorAll('.player-row')];
  function filterRows() {
    const search = controls[0].value.trim().toLowerCase();
    const club = controls[1].value;
    const position = controls[2].value;
    const direction = controls[3].value;
    let visible = 0;
    for (const row of rows) {
      const show = (!search || row.dataset.search.includes(search)) && (!club || row.dataset.club === club) && (!position || row.dataset.position === position) && (!direction || row.dataset.direction === direction);
      row.hidden = !show;
      if (show) visible += 1;
    }
    document.querySelector('#result-count').textContent = visible + ' de ' + rows.length + ' jugadores';
    document.querySelector('#empty').style.display = visible ? 'none' : 'block';
  }
  controls.forEach((control) => control.addEventListener('input', filterRows));
  filterRows();
</script>
</body>
</html>`;
}

async function buildPreview(gameweekNumber) {
  const gameweek = await Gameweek.findOne({ number: gameweekNumber }).lean();
  if (!gameweek) throw new Error(`No existe la jornada ${gameweekNumber}.`);

  const [players, clubs, activeUsers, lineups, gameweeks] = await Promise.all([
    Player.find({}).select("+marketValueHistory").lean(),
    Club.find({}).lean(),
    User.countDocuments({ role: "user", status: "active" }),
    Lineup.find({ gameweek: gameweek._id, lockedAt: { $exists: true, $ne: null } }).select("players").lean(),
    Gameweek.find({}).sort({ number: 1 }).lean()
  ]);

  const scoreMap = buildGameweekScoreMap(gameweek);
  const playedIds = playedPlayerIds(gameweek);
  const usageMap = lineupUsage(lineups);
  const projectedFinishedGameweeks = gameweeks.filter((candidate) => candidate.status === "finished" || sameId(candidate, gameweek));
  const performanceStats = buildPlayerPerformanceStats(projectedFinishedGameweeks);
  const evaluatedPlayers = players.filter((player) => scoreMap.has(objectId(player)));
  const seasonEvaluatedPlayers = players.filter((player) => Number(performanceStats.get(objectId(player))?.evaluatedRounds || 0) > 0);
  const marketValuePercentiles = buildPercentileMap(players, (player) => player.marketValue);
  const gameweekPointsPercentiles = buildPercentileMap(evaluatedPlayers, (player) => scoreMap.get(objectId(player)) || 0);
  const seasonPointsPercentiles = buildPercentileMap(
    seasonEvaluatedPlayers,
    (player) => performanceStats.get(objectId(player))?.pointsPerRound || 0
  );
  const gameweekAverages = positionAverages(evaluatedPlayers, (player) => scoreMap.get(objectId(player)) || 0);
  const seasonAverages = positionAverages(
    seasonEvaluatedPlayers,
    (player) => performanceStats.get(objectId(player))?.pointsPerRound || 0
  );
  const totalUsage = [...usageMap.values()].reduce((sum, count) => sum + Number(count || 0), 0);
  const averageUsageRate = activeUsers > 0 && evaluatedPlayers.length > 0
    ? totalUsage / (activeUsers * evaluatedPlayers.length)
    : 0;
  const clubStrengths = calculateClubStrengths(clubs, projectedFinishedGameweeks);
  const nextGameweek = gameweeks.find((candidate) => candidate.number > gameweek.number && candidate.status !== "finished") || null;
  const opponentMap = buildNextOpponentMap(nextGameweek);
  const clubMap = new Map(clubs.map((club) => [objectId(club), club]));

  const pending = players.map((player) => {
    const playerId = objectId(player);
    const clubId = objectId(player.club);
    const club = clubMap.get(clubId);
    const opponentId = opponentMap.get(clubId) || null;
    const opponent = opponentId ? clubMap.get(opponentId) : null;
    const gameweekPoints = Number(scoreMap.get(playerId) || 0);
    const stats = performanceStats.get(playerId) || { points: 0, evaluatedRounds: 0, pointsPerRound: 0 };
    const usage = Number(usageMap.get(playerId) || 0);
    const alreadyRecorded = (player.marketValueHistory || []).some((entry) => sameId(entry.gameweek, gameweek));
    const calculatedProjection = projectPlayerMarketValue({
      oldValue: player.marketValue,
      gameweekPoints,
      gameweekPositionAverage: gameweekAverages.get(player.position),
      gameweekPointsPercentile: gameweekPointsPercentiles.get(playerId) ?? 0.5,
      seasonPointsPerRound: stats.pointsPerRound,
      seasonPositionAverage: seasonAverages.get(player.position),
      seasonPointsPercentile: seasonPointsPercentiles.get(playerId) ?? 0.5,
      marketValuePercentile: marketValuePercentiles.get(playerId) ?? 0.5,
      evaluatedRounds: stats.evaluatedRounds,
      usage,
      activeUsers,
      averageUsageRate,
      opponentStrength: opponentId ? clubStrengths.get(opponentId) ?? 0.5 : 0.5,
      hasOpponent: Boolean(opponentId),
      playerStatus: player.status,
      hasRoundData: scoreMap.has(playerId),
      playedInGameweek: playedIds.has(playerId)
    });

    return {
      playerId,
      name: player.name,
      position: player.position,
      clubId,
      clubName: club?.name || "Sin club",
      clubShortName: club?.shortName || "SC",
      oldValue: Number(player.marketValue || 0),
      gameweekNumber: gameweek.number,
      gameweekPoints,
      gameweekPositionAverage: Number(gameweekAverages.get(player.position) || 0),
      totalPoints: Number(stats.points || 0),
      pointsPerRound: Number(stats.pointsPerRound || 0),
      evaluatedRounds: Number(stats.evaluatedRounds || 0),
      playedInGameweek: playedIds.has(playerId),
      usage,
      activeUsers,
      lockedLineups: lineups.length,
      nextOpponentName: opponent?.shortName || opponent?.name || "Sin jornada",
      nextOpponentStrength: opponentId ? clubStrengths.get(opponentId) ?? 0.5 : null,
      alreadyRecorded,
      projection: alreadyRecorded
        ? {
            ...calculatedProjection,
            newValue: Number(player.marketValue || 0),
            change: 0,
            changeRate: 0,
            hasAnySignal: false
          }
        : calculatedProjection
    };
  });

  const currentMarketValue = pending.reduce((sum, entry) => sum + entry.oldValue, 0);
  const balance = balanceMarketValueProjections(
    pending.map((entry) => entry.projection),
    currentMarketValue
  );
  const entries = pending.map((entry, index) => {
    const balancedProjection = balance.projections[index];
    return {
      ...entry,
      newValue: balancedProjection.newValue,
      change: balancedProjection.change,
      changeRate: balancedProjection.changeRate,
      direction: direction(balancedProjection.change),
      projection: balancedProjection
    };
  }).sort((left, right) =>
    left.clubName.localeCompare(right.clubName, "es") ||
    (POSITION_ORDER.get(left.position) ?? 9) - (POSITION_ORDER.get(right.position) ?? 9) ||
    left.name.localeCompare(right.name, "es")
  );

  const projectedMarketValue = entries.reduce((sum, entry) => sum + entry.newValue, 0);
  return {
    generatedAt: new Date(),
    gameweek,
    nextGameweek,
    clubs,
    entries,
    activeUsers,
    lockedLineups: lineups.length,
    completedLineups: lineups.filter((lineup) => lineup.players?.length === 7).length,
    currentMarketValue,
    projectedMarketValue,
    marketBalance: balance,
    evaluatedPlayers: evaluatedPlayers.length,
    averageUsageRate,
    netChange: projectedMarketValue - currentMarketValue,
    rises: entries.filter((entry) => entry.change > 0).length,
    drops: entries.filter((entry) => entry.change < 0).length,
    unchanged: entries.filter((entry) => entry.change === 0).length
  };
}

async function main() {
  const gameweekNumber = Number(process.argv[2] || 1);
  if (!Number.isInteger(gameweekNumber) || gameweekNumber < 1) {
    throw new Error("Indica un número de jornada válido.");
  }

  await connectDB();
  const preview = await buildPreview(gameweekNumber);
  const reportsDirectory = path.resolve(process.cwd(), "reports");
  const outputPath = path.resolve(reportsDirectory, `simulacion-mercado-jornada-${gameweekNumber}.html`);
  await fs.mkdir(reportsDirectory, { recursive: true });
  await fs.writeFile(outputPath, renderReport(preview), "utf8");
  console.log(`Informe generado: ${outputPath}`);
  console.log(`Jugadores: ${preview.entries.length}. Suben: ${preview.rises}. Bajan: ${preview.drops}. Sin cambio: ${preview.unchanged}.`);
}

main()
  .catch((error) => {
    console.error(`No se pudo generar el informe: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
