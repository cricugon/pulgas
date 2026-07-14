import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { LeagueBackup } from "../models/LeagueBackup.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { Player } from "../models/Player.js";
import { Settings, getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";

const GAME_FIELDS = ["role", "status", "teamName", "budget", "squad", "totalPoints"];

function cleanDocs(docs = []) {
  return docs.map((doc) => ({ ...doc }));
}

function countSnapshot(snapshot) {
  return {
    users: snapshot.users.length,
    clubs: snapshot.clubs.length,
    players: snapshot.players.length,
    gameweeks: snapshot.gameweeks.length,
    lineups: snapshot.lineups.length,
    news: snapshot.news?.length || 0
  };
}

function defaultBackupName(reason, gameweekName) {
  const stamp = new Date().toLocaleString("es-ES", { hour12: false });
  if (reason === "before_gameweek_start") return `Antes de iniciar ${gameweekName || "jornada"} - ${stamp}`;
  if (reason === "before_restore") return `Antes de restaurar backup - ${stamp}`;
  return `Backup manual - ${stamp}`;
}

async function insertManyIfAny(Model, docs) {
  if (!docs?.length) return;
  await Model.collection.insertMany(cleanDocs(docs), { ordered: true });
}

async function snapshotLeague() {
  const [users, clubs, players, gameweeks, lineups, settings, news] = await Promise.all([
    User.find({}).lean(),
    Club.find({}).lean(),
    Player.find({}).lean(),
    Gameweek.find({}).lean(),
    Lineup.find({}).lean(),
    Settings.find({}).lean(),
    NewsItem.find({}).lean()
  ]);

  return {
    users,
    clubs,
    players,
    gameweeks,
    lineups,
    settings,
    news
  };
}

export async function createLeagueBackup({
  name,
  reason = "manual",
  createdBy = null,
  createdByEmail = "",
  gameweek = null,
  gameweekName = ""
} = {}) {
  const snapshot = await snapshotLeague();
  const backup = await LeagueBackup.create({
    name: name?.trim() || defaultBackupName(reason, gameweekName),
    reason,
    createdBy,
    createdByEmail,
    gameweek,
    counts: countSnapshot(snapshot),
    snapshot
  });

  return backup;
}

function userGameUpdate(snapshotUser, initialBudget) {
  const update = {};
  for (const field of GAME_FIELDS) {
    if (snapshotUser[field] !== undefined) update[field] = snapshotUser[field];
  }

  if (update.role === "admin") {
    update.budget = 0;
    update.squad = [];
    update.totalPoints = 0;
  }

  if (update.role === "user") {
    update.budget = Number(update.budget || initialBudget);
    update.squad = update.squad || [];
    update.totalPoints = Number(update.totalPoints || 0);
    update.teamName = update.teamName || `Equipo ${String(snapshotUser.email || "usuario").split("@")[0]}`;
  }

  return update;
}

async function restoreUsers(snapshotUsers, initialBudget) {
  const currentUsers = await User.find({}).lean();
  const currentById = new Map(currentUsers.map((user) => [user._id.toString(), user]));
  const currentByEmail = new Map(currentUsers.map((user) => [user.email, user]));
  const userIdMap = new Map();
  const restoredCurrentIds = new Set();

  for (const snapshotUser of snapshotUsers || []) {
    const snapshotId = snapshotUser._id.toString();
    const existing = currentById.get(snapshotId) || currentByEmail.get(snapshotUser.email);

    if (existing) {
      const update = userGameUpdate(snapshotUser, initialBudget);
      const operator = { $set: update };
      if (update.role === "admin") operator.$unset = { teamName: "" };

      await User.updateOne({ _id: existing._id }, operator);
      userIdMap.set(snapshotId, existing._id);
      restoredCurrentIds.add(existing._id.toString());
      continue;
    }

    await User.collection.insertOne({ ...snapshotUser });
    userIdMap.set(snapshotId, snapshotUser._id);
    restoredCurrentIds.add(snapshotId);
  }

  const newCurrentUserIds = currentUsers
    .filter((user) => user.role === "user" && !restoredCurrentIds.has(user._id.toString()))
    .map((user) => user._id);

  if (newCurrentUserIds.length) {
    await User.updateMany(
      { _id: { $in: newCurrentUserIds } },
      {
        $set: {
          budget: initialBudget,
          squad: [],
          totalPoints: 0,
          status: "active"
        }
      }
    );
  }

  return userIdMap;
}

function remapLineups(lineups, userIdMap) {
  return (lineups || []).map((lineup) => ({
    ...lineup,
    user: userIdMap.get(lineup.user?.toString?.() || String(lineup.user)) || lineup.user
  }));
}

export async function restoreLeagueBackup(backupId, { restoredBy = null, restoredByEmail = "" } = {}) {
  const backup = await LeagueBackup.findById(backupId);
  if (!backup) return null;

  await createLeagueBackup({
    reason: "before_restore",
    createdBy: restoredBy,
    createdByEmail: restoredByEmail,
    name: `Antes de restaurar: ${backup.name}`
  });

  const snapshot = backup.snapshot || {};
  const settingsSnapshot = snapshot.settings || [];
  const initialBudget = Number(settingsSnapshot[0]?.initialBudget || process.env.DEFAULT_BUDGET || 120000000);

  await Promise.all([
    Lineup.deleteMany({}),
    Gameweek.deleteMany({}),
    Player.deleteMany({}),
    Club.deleteMany({}),
    Settings.deleteMany({}),
    NewsItem.deleteMany({})
  ]);

  await insertManyIfAny(Settings, settingsSnapshot);
  if (!settingsSnapshot.length) await getLeagueSettings();

  await insertManyIfAny(Club, snapshot.clubs || []);
  await insertManyIfAny(Player, snapshot.players || []);
  await insertManyIfAny(Gameweek, snapshot.gameweeks || []);
  await insertManyIfAny(NewsItem, snapshot.news || []);

  const userIdMap = await restoreUsers(snapshot.users || [], initialBudget);
  await insertManyIfAny(Lineup, remapLineups(snapshot.lineups || [], userIdMap));

  return {
    backup: {
      id: backup._id,
      name: backup.name,
      createdAt: backup.createdAt
    },
    counts: countSnapshot({
      users: snapshot.users || [],
      clubs: snapshot.clubs || [],
      players: snapshot.players || [],
      gameweeks: snapshot.gameweeks || [],
      lineups: snapshot.lineups || [],
      news: snapshot.news || []
    })
  };
}
