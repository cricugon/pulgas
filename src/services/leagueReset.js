import bcrypt from "bcryptjs";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { Player } from "../models/Player.js";
import { getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";
import { recalculateGameweek } from "./scoring.js";

export const clubSeeds = [
  ["Real Madrid", "RMA", "Madrid", "#ffffff", "#2563eb"],
  ["FC Barcelona", "FCB", "Barcelona", "#1d4ed8", "#a21caf"],
  ["Atletico de Madrid", "ATM", "Madrid", "#ef4444", "#ffffff"],
  ["Athletic Club", "ATH", "Bilbao", "#e11d48", "#ffffff"],
  ["Real Sociedad", "RSO", "Donostia", "#2563eb", "#ffffff"],
  ["Villarreal CF", "VIL", "Vila-real", "#facc15", "#1e293b"],
  ["Real Betis", "BET", "Sevilla", "#16a34a", "#ffffff"],
  ["Sevilla FC", "SEV", "Sevilla", "#dc2626", "#ffffff"]
];

export const playerSeeds = [
  ["Unai Simon", "POR", "ATH", 9500000, 77, 1],
  ["Alex Remiro", "POR", "RSO", 8400000, 72, 1],
  ["Thibaut Courtois", "POR", "RMA", 14000000, 86, 1],
  ["Marc-Andre ter Stegen", "POR", "FCB", 12800000, 82, 1],
  ["Dani Carvajal", "DEF", "RMA", 12200000, 80, 2],
  ["Pau Cubarsi", "DEF", "FCB", 9800000, 76, 5],
  ["Robin Le Normand", "DEF", "ATM", 10300000, 74, 24],
  ["Dani Vivian", "DEF", "ATH", 7900000, 71, 3],
  ["Pau Torres", "DEF", "VIL", 9400000, 70, 4],
  ["Marc Bartra", "DEF", "BET", 5100000, 61, 15],
  ["Federico Valverde", "MED", "RMA", 16800000, 90, 8],
  ["Pedri Gonzalez", "MED", "FCB", 16000000, 88, 8],
  ["Mikel Merino", "MED", "RSO", 13200000, 84, 8],
  ["Isco Alarcon", "MED", "BET", 11200000, 83, 22],
  ["Marcos Llorente", "MED", "ATM", 11800000, 79, 14],
  ["Suso Fernandez", "MED", "SEV", 6400000, 63, 7],
  ["Jude Bellingham", "MED", "RMA", 22000000, 95, 5],
  ["Lamine Yamal", "DEL", "FCB", 23000000, 96, 19],
  ["Antoine Griezmann", "DEL", "ATM", 17500000, 89, 7],
  ["Nico Williams", "DEL", "ATH", 15500000, 87, 10],
  ["Gerard Moreno", "DEL", "VIL", 10100000, 74, 7],
  ["Willian Jose", "DEL", "BET", 7400000, 68, 12],
  ["Mikel Oyarzabal", "DEL", "RSO", 13900000, 82, 10],
  ["Youssef En-Nesyri", "DEL", "SEV", 10800000, 75, 15]
];

function pickPlayers(players, names) {
  return names.map((name) => players.find((player) => player.name === name)?._id).filter(Boolean);
}

async function ensureDemoAccounts(initialBudget) {
  const passwordHash = await bcrypt.hash("123456", 12);

  await User.findOneAndUpdate(
    { email: "admin@pulgasleague.test" },
    {
      $setOnInsert: {
        email: "admin@pulgasleague.test",
        passwordHash,
        role: "admin"
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const demo = await User.findOneAndUpdate(
    { email: "demo@pulgasleague.test" },
    {
      $setOnInsert: {
        email: "demo@pulgasleague.test",
        passwordHash,
        role: "user",
        teamName: "Pulgas Galaxy"
      },
      $set: {
        budget: initialBudget,
        squad: [],
        status: "active",
        totalPoints: 0
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { demo };
}

async function resetUsers(initialBudget, preserveUsers, includeDemoAccounts) {
  if (!preserveUsers) {
    await User.deleteMany({});
  } else {
    await User.updateMany(
      { role: "user" },
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

  if (includeDemoAccounts) {
    return ensureDemoAccounts(initialBudget);
  }

  return { demo: await User.findOne({ email: "demo@pulgasleague.test", role: "user" }) };
}

async function createDemoLeague(initialBudget, demoUser) {
  const clubs = await Club.insertMany(
    clubSeeds.map(([name, shortName, city, primaryColor, secondaryColor]) => ({
      name,
      shortName,
      city,
      primaryColor,
      secondaryColor
    }))
  );

  const clubByShortName = new Map(clubs.map((club) => [club.shortName, club]));
  const players = await Player.insertMany(
    playerSeeds.map((seed) => {
      const [name, position, clubShortName, marketValue, form, shirtNumber] = seed;
      return {
        name,
        position,
        club: clubByShortName.get(clubShortName)._id,
        marketValue,
        form,
        shirtNumber
      };
    })
  );

  const jornada1 = await Gameweek.create({
    number: 1,
    name: "Jornada 1",
    status: "finished",
    lineupBudgetCap: initialBudget,
    startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    matches: [
      {
        homeClub: clubByShortName.get("RMA")._id,
        awayClub: clubByShortName.get("FCB")._id,
        status: "finished",
        homeScore: 2,
        awayScore: 1,
        playerScores: [
          { player: players.find((player) => player.name === "Jude Bellingham")._id, points: 12, note: "Gol y MVP" },
          { player: players.find((player) => player.name === "Lamine Yamal")._id, points: 9, note: "Asistencia" },
          { player: players.find((player) => player.name === "Federico Valverde")._id, points: 7, note: "Buen partido" },
          { player: players.find((player) => player.name === "Pedri Gonzalez")._id, points: 6, note: "Control del juego" }
        ]
      },
      {
        homeClub: clubByShortName.get("ATM")._id,
        awayClub: clubByShortName.get("ATH")._id,
        status: "finished",
        homeScore: 1,
        awayScore: 1,
        playerScores: [
          { player: players.find((player) => player.name === "Antoine Griezmann")._id, points: 4, note: "Gol" },
          { player: players.find((player) => player.name === "Nico Williams")._id, points: 5, note: "Desborde constante" },
          { player: players.find((player) => player.name === "Dani Vivian")._id, points: -1, note: "Tarjeta" }
        ]
      }
    ]
  });

  if (demoUser) {
    await Lineup.create({
      user: demoUser._id,
      gameweek: jornada1._id,
      formation: "2-3-1",
      players: pickPlayers(players, [
        "Thibaut Courtois",
        "Dani Carvajal",
        "Pau Cubarsi",
        "Federico Valverde",
        "Pedri Gonzalez",
        "Jude Bellingham",
        "Lamine Yamal"
      ]),
      budgetValue: 113800000,
      lockedAt: new Date()
    });
  }

  await Gameweek.create({
    number: 2,
    name: "Jornada 2",
    status: "draft",
    lineupBudgetCap: initialBudget,
    startsAt: new Date(),
    matches: [
      {
        homeClub: clubByShortName.get("RSO")._id,
        awayClub: clubByShortName.get("BET")._id,
        status: "scheduled",
        playerScores: []
      },
      {
        homeClub: clubByShortName.get("VIL")._id,
        awayClub: clubByShortName.get("SEV")._id,
        status: "scheduled",
        playerScores: []
      }
    ]
  });

  await recalculateGameweek(jornada1._id);
}

export async function resetLeague({
  loadDemoData = false,
  preserveUsers = true,
  includeDemoAccounts = false,
  initialBudget
} = {}) {
  const settings = await getLeagueSettings();
  if (initialBudget !== undefined) {
    settings.initialBudget = Number(initialBudget);
    await settings.save();
  }

  const budget = Number(settings.initialBudget || process.env.DEFAULT_BUDGET || 120000000);

  await Promise.all([
    Lineup.deleteMany({}),
    Gameweek.deleteMany({}),
    Player.deleteMany({}),
    Club.deleteMany({}),
    NewsItem.deleteMany({})
  ]);

  const { demo } = await resetUsers(budget, preserveUsers, includeDemoAccounts);

  if (loadDemoData) {
    await createDemoLeague(budget, demo);
  }

  const [users, clubs, players, gameweeks, lineups] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Club.countDocuments({}),
    Player.countDocuments({}),
    Gameweek.countDocuments({}),
    Lineup.countDocuments({})
  ]);

  return {
    loadDemoData,
    preservedUsers: preserveUsers,
    counts: {
      users,
      clubs,
      players,
      gameweeks,
      lineups
    }
  };
}
