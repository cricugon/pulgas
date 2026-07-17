import bcrypt from "bcryptjs";
import { Club } from "../models/Club.js";
import { Gameweek } from "../models/Gameweek.js";
import { Lineup } from "../models/Lineup.js";
import { NewsItem } from "../models/NewsItem.js";
import { MundoEvent } from "../models/MundoEvent.js";
import { MundoPlayerStatus } from "../models/MundoPlayerStatus.js";
import { MundoPrediction } from "../models/MundoPrediction.js";
import { Player } from "../models/Player.js";
import { getLeagueSettings } from "../models/Settings.js";
import { User } from "../models/User.js";

export const clubSeeds = [
  ["Robledo F.C.", "ROB", "Robledo", "#1d4ed8", "#ffffff"],
  ["Los Cantones F.C.", "CANT", "Los Cantones", "#0ea5e9", "#ffffff"],
  ["F.C. Jardín", "JAR", "Jardín", "#16a34a", "#ffffff"],
  ["Quijote-Pesebre", "QUIJ", "Quijote-Pesebre", "#facc15", "#1e293b"],
  ["Los Chospes F.C.", "CHOS", "Los Chospes", "#dc2626", "#ffffff"],
  ["El Ballestero F.C.", "BALL", "El Ballestero", "#7c3aed", "#ffffff"]
];

const M = 1000000;

export const playerSeeds = [
  ["José Luis Serrallé", "POR", "ROB", 15 * M, 1],
  ["Cristian Cuerda", "DEF", "ROB", 8 * M, 2],
  ["Pepe Callejas", "DEF", "ROB", 10 * M, 3],
  ["Pablo González", "MED", "ROB", 18 * M, 4],
  ["Marcos Garví", "DEL", "ROB", 18 * M, 5],
  ["Francisco Blázquez", "DEF", "ROB", 25 * M, 6],
  ["Fabio Garví", "DEL", "ROB", 25 * M, 7],
  ["Jose Julian García", "DEL", "ROB", 10 * M, 8],
  ["José Panadés", "MED", "ROB", 16 * M, 9],
  ["Dennis Gómez", "DEL", "ROB", 7 * M, 10],
  ["Asier Callejo", "DEF", "ROB", 8 * M, 11],
  ["Carlos García", "DEL", "ROB", 6 * M, 12],
  ["Borja Garví", "MED", "ROB", 16 * M, 13],
  ["Luis Ángel Albaladejo Ramirez", "MED", "ROB", 12 * M, 14],
  ["Eneko Galarza", "DEL", "ROB", 15 * M, 15],
  ["Marcos Rozalén", "DEF", "ROB", 6 * M, 16],
  ["Manuel Cuerda", "DEL", "ROB", 5 * M, 17],
  ["Enaitz Etxeberria", "DEF", "ROB", 10 * M, 18],
  ["David Muñoz", "MED", "ROB", 12 * M, 19],
  ["Isra", "MED", "ROB", 10 * M, 20],

  ["José Ramón García Sánchez (Bolo)", "DEF", "CANT", 22 * M, 1],
  ["Pascual Muñoz López (Pascu)", "DEL", "CANT", 12 * M, 2],
  ["Pedro Rubio Esono", "DEL", "CANT", 17 * M, 3],
  ["Sergio Serrano Cano", "DEF", "CANT", 20 * M, 4],
  ["Fernando López Valero (Fer)", "DEF", "CANT", 11 * M, 5],
  ["Aitor Lozano Ortega (Belfetas)", "DEF", "CANT", 10 * M, 6],
  ["Jose Juan Amador Martinez", "MED", "CANT", 14 * M, 7],
  ["Álvaro Marín Rodríguez (Marin)", "DEL", "CANT", 20 * M, 8],
  ["David Herrera Esparcia", "MED", "CANT", 13 * M, 9],
  ["Carlos Mozo Cano (Mozo)", "MED", "CANT", 11 * M, 10],
  ["Fede Quijano Gómez (Lacerilla)", "DEL", "CANT", 13 * M, 11, "Extracomunitario"],
  ["Pedro Jesús García Cuerda (Perus)", "DEF", "CANT", 8 * M, 12],
  ["Sergio Ortega Ballesteros (Chabo)", "MED", "CANT", 11 * M, 13],
  ["Ángel David García Lozano (A. David)", "POR", "CANT", 10 * M, 14],
  ["Iván Lorenzo Nieto (Iván L.)", "MED", "CANT", 19 * M, 15],

  ["Cristian López García", "POR", "JAR", 18 * M, 1],
  ["Hugo Fernández Martínez", "DEL", "JAR", 14 * M, 2, "Extracomunitario"],
  ["Juan Bodalo Vitoria", "DEF", "JAR", 16 * M, 3, "Extracomunitario"],
  ["Jesús Garví Barba", "DEL", "JAR", 10 * M, 4],
  ["Abel Garrigós Cuesta", "MED", "JAR", 20 * M, 5, "Extracomunitario"],
  ["José Luis García Rozalén", "MED", "JAR", 5 * M, 6],
  ["Andrés de Haro Lorenzo", "DEF", "JAR", 8 * M, 7],
  ["Álvaro Garví Barba", "DEF", "JAR", 10 * M, 8],
  ["Víctor Garrido Cortés", "DEF", "JAR", 5 * M, 9],
  ["Bemba Fane Sissoko", "DEL", "JAR", 7 * M, 10],
  ["Álvaro García Fernández", "DEF", "JAR", 10 * M, 11],
  ["Eduardo García Fernández", "MED", "JAR", 6 * M, 12],
  ["Pedro Escribano Morcillo", "DEL", "JAR", 12 * M, 13],
  ["Lucilo López García", "DEF", "JAR", 13 * M, 14],
  ["Jaime Sánchez Cuartero", "DEL", "JAR", 20 * M, 15, "Extracomunitario"],
  ["Fernando David Valcárcel Moreno", "MED", "JAR", 10 * M, 16, "Extracomunitario"],
  ["Juan Ángel Santiago Díaz", "DEL", "JAR", 10 * M, 17],

  ["Álvaro Rodríguez García", "DEL", "QUIJ", 21 * M, 1, "Extracomunitario"],
  ["Álvaro Cuerda Álvarez", "MED", "QUIJ", 4 * M, 2],
  ["Ángel de la Rosa Moya", "POR", "QUIJ", 12 * M, 3],
  ["Sergio Sánchez Martínez", "MED", "QUIJ", 16 * M, 4],
  ["Pablo Hernández Moreno", "MED", "QUIJ", 12 * M, 5, "Extracomunitario"],
  ["Nicolás Casado Rodríguez", "DEF", "QUIJ", 12 * M, 6, "Extracomunitario"],
  ["Daniel Rodríguez Carneros", "DEF", "QUIJ", 22 * M, 7, "Extracomunitario"],
  ["Guillermo Paredes Farriols", "DEL", "QUIJ", 14 * M, 8],
  ["Álvaro Carreño Ibáñez", "DEL", "QUIJ", 13 * M, 9, "Extracomunitario"],
  ["Manuel Cabrera García", "DEF", "QUIJ", 16 * M, 10],
  ["Alejandro Cuerda Pérez", "DEL", "QUIJ", 5 * M, 11],
  ["Set Francisco Moya Jiménez", "MED", "QUIJ", 18 * M, 12],

  ["Jonathan Redondo Galdón", "DEL", "CHOS", 8 * M, 1],
  ["Pedro Sánchez Lorenzo", "MED", "CHOS", 10 * M, 2],
  ["Miguel Ángel Romero Navarro", "DEF", "CHOS", 11 * M, 3],
  ["Alex Pricop", "MED", "CHOS", 10 * M, 4, "Extracomunitario"],
  ["Miguel Ángel Bañol Notario", "DEL", "CHOS", 10 * M, 5, "Extracomunitario"],
  ["Adrián Copete Sahuquillo", "MED", "CHOS", 6 * M, 6],
  ["Miguel Ángel Moreno", "DEL", "CHOS", 11 * M, 7],
  ["Amin Selloum", "MED", "CHOS", 12 * M, 8, "Extracomunitario"],
  ["Loren Martínez", "DEF", "CHOS", 10 * M, 9, "Extracomunitario"],
  ["Piu", "DEF", "CHOS", 8 * M, 10],
  ["Ismael Sánchez Arcas", "DEF", "CHOS", 8 * M, 11],
  ["Juan José López", "POR", "CHOS", 10 * M, 12, "Extracomunitario"],

  ["Alejandro Torres", "MED", "BALL", 19 * M, 1],
  ["José Ramón Cañizares", "MED", "BALL", 10 * M, 2],
  ["Jaime López Banda", "DEF", "BALL", 8 * M, 3],
  ["Samuel Ortega", "DEL", "BALL", 19 * M, 5],
  ["Pedro Rivera", "DEL", "BALL", 10 * M, 6],
  ["Alejandro Garrido", "DEL", "BALL", 11 * M, 7],
  ["Sergio Torres", "DEF", "BALL", 10 * M, 8],
  ["Héctor Torres", "DEF", "BALL", 9 * M, 9],
  ["Iván Lorenzo", "MED", "BALL", 19 * M, 10],
  ["Sergio Avendaño", "DEF", "BALL", 9 * M, 11],
  ["César Agüero", "DEL", "BALL", 16 * M, 12],
  ["Alejandro Galletero", "DEL", "BALL", 14 * M, 13],
  ["Kato", "POR", "BALL", 12 * M, 14],
  ["Ismael Ortega Ortega", "DEF", "BALL", 12 * M, 15, "Extracomunitario"],
  ["Rafael Ortega Ortega", "DEL", "BALL", 12 * M, 16, "Extracomunitario"],
  ["Raúl Nieto", "MED", "BALL", 15 * M, 17, "Extracomunitario"]
];

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

async function createDemoLeague() {
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
  await Player.insertMany(
    playerSeeds.map((seed) => {
      const [name, position, clubShortName, marketValue, shirtNumber, bio = ""] = seed;
      const club = clubByShortName.get(clubShortName);
      if (!club) throw new Error(`Club no encontrado para jugador ${name}: ${clubShortName}`);

      return {
        name,
        position,
        club: club._id,
        marketValue,
        form: 50,
        shirtNumber,
        bio
      };
    })
  );
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
    NewsItem.deleteMany({}),
    MundoPlayerStatus.deleteMany({}),
    MundoPrediction.deleteMany({}),
    MundoEvent.deleteMany({ type: { $in: ["player_status", "prediction"] } })
  ]);

  await resetUsers(budget, preserveUsers, includeDemoAccounts);

  if (loadDemoData) {
    await createDemoLeague();
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
