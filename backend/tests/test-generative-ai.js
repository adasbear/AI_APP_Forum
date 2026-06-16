import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    // Use correct embedding model name
    const modelName = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent("test query");
    console.log(`Success with ${modelName}! Embedding length:`, result.embedding.values.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
