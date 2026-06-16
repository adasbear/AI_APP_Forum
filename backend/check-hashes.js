import { safeExecute } from "./db/config.js";

async function checkHashes() {
  try {
    const rows = await safeExecute("SELECT question_id, question_hash FROM questions LIMIT 10", []);
    console.log("Hashes:", rows);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkHashes();
