import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Club } from "../src/models/Club.js";
import { Gameweek } from "../src/models/Gameweek.js";
import { Lineup } from "../src/models/Lineup.js";
import { Player } from "../src/models/Player.js";
import { Settings } from "../src/models/Settings.js";
import { User } from "../src/models/User.js";
import { recalculateGameweek } from "../src/services/scoring.js";

const clubSeeds = [
  ["Real Madrid", "RMA", "Madrid", "#ffffff", "#2563eb"],
  ["FC Barcelona", "FCB", "Barcelona", "#1d4ed8", "#a21caf"],
  ["Atletico de Madrid", "ATM", "Madrid", "#ef4444", "#ffffff"],
  ["Athletic Club", "ATH", "Bilbao", "#e11d48", "#ffffff"],
  ["Real Sociedad", "RSO", "Donostia", "#2563eb", "#ffffff"],
  ["Villarreal CF", "VIL", "Vila-real", "#facc15", "#1e293b"],
  ["Real Betis", "BET", "Sevilla", "#16a34a", "#ffffff"],
  ["Sevilla FC", "SEV", "Sevilla", "#dc2626", "#ffffff"]
];

const playerSeeds = [
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

async function seed() {
  await connectDB();
  const initialBudget = Number(process.env.DEFAULT_BUDGET || 120000000);

  await Promise.all([
    Lineup.deleteMany({}),
    Gameweek.deleteMany({}),
    User.deleteMany({}),
    Player.deleteMany({}),
    Club.deleteMany({}),
    Settings.deleteMany({})
  ]);

  await Settings.create({
    key: "league",
    initialBudget
  });

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
    playerSeeds.map(([name, position, clubShortName, marketValue, form, shirtNumber]) => ({
      name,
      position,
      club: clubByShortName.get(clubShortName)._id,
      marketValue,
      form,
      shirtNumber
    }))
  );

  const passwordHash = await bcrypt.hash("123456", 12);
  await User.create({
    email: "admin@pulgasleague.test",
    passwordHash,
    role: "admin"
  });

  const demo = await User.create({
    email: "demo@pulgasleague.test",
    passwordHash,
    teamName: "Pulgas Galaxy",
    budget: initialBudget,
    squad: []
  });

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
          { player: players.find((p) => p.name === "Jude Bellingham")._id, points: 12, note: "Gol y MVP" },
          { player: players.find((p) => p.name === "Lamine Yamal")._id, points: 9, note: "Asistencia" },
          { player: players.find((p) => p.name === "Federico Valverde")._id, points: 7, note: "Buen partido" },
          { player: players.find((p) => p.name === "Pedri Gonzalez")._id, points: 6, note: "Control del juego" }
        ]
      },
      {
        homeClub: clubByShortName.get("ATM")._id,
        awayClub: clubByShortName.get("ATH")._id,
        status: "finished",
        homeScore: 1,
        awayScore: 1,
        playerScores: [
          { player: players.find((p) => p.name === "Antoine Griezmann")._id, points: 4, note: "Gol" },
          { player: players.find((p) => p.name === "Nico Williams")._id, points: 5, note: "Desborde constante" },
          { player: players.find((p) => p.name === "Dani Vivian")._id, points: -1, note: "Tarjeta" }
        ]
      }
    ]
  });

  await Lineup.create({
    user: demo._id,
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

  console.log("Seed completado.");
  console.log("Admin: admin@pulgasleague.test / 123456");
  console.log("Demo: demo@pulgasleague.test / 123456");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
