import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Settings } from "../src/models/Settings.js";
import { resetLeague } from "../src/services/leagueReset.js";

async function seed() {
  await connectDB();

  await Settings.deleteMany({});
  const result = await resetLeague({
    loadDemoData: true,
    preserveUsers: false,
    includeDemoAccounts: true,
    initialBudget: Number(process.env.DEFAULT_BUDGET || 120000000)
  });

  console.log("Seed completado.");
  console.log(`Datos: ${JSON.stringify(result.counts)}`);
  console.log("Admin: admin@pulgasleague.test / 123456");
  console.log("Demo: demo@pulgasleague.test / 123456");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
