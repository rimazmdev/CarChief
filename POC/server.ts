import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json({ limit: "10mb" }));

// Disable browser caching for Service Worker files to prevent stale caching loops
app.use((req, res, next) => {
  if (req.url === "/sw.js" || req.url === "/service-worker.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// Helper function for lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Inventory Search endpoint
app.post("/api/search", async (req, res) => {
  try {
    const { query, vehicles, currentTime } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required." });
    }

    if (!Array.isArray(vehicles)) {
      return res.status(400).json({ error: "Vehicles list is required." });
    }

    // Strip vehicle data to keep it extremely lightweight and fit context limits beautifully
    const lightweightVehicles = vehicles.map((v: any) => ({
      id: v.id,
      make: v.make || "",
      model: v.model || "",
      type: v.type || "",
      year: Number(v.year) || 0,
      price: Number(v.price) || 0,
      mileage: Number(v.mileage) || 0,
      color: v.color || "",
      transmission: v.transmission || "",
      fuelType: v.fuelType || "",
      engine: v.engine || "",
      description: v.description || "",
      status: v.status || "",
      etaDate: v.etaDate || "",
      etdDate: v.etdDate || "",
      inspectionStatus: v.inspectionStatus || "",
      stockLocation: v.stockLocation || "",
      currentLocation: v.currentLocation || ""
    }));

    // Lazy initialize GenAI client
    const ai = getGenAI();

    const prompt = `You are a professional automotive sales search assistant.
Analyze the user's natural language search query and filter the provided list of vehicles to find matching cars.
User Query: "${query}"
Current Local Time context: "${currentTime || new Date().toISOString()}"

Here is the list of available vehicles in inventory (in JSON format):
${JSON.stringify(lightweightVehicles, null, 2)}

Match criteria rules:
1. "SUVs" means matching 'type' of "SUV" (case-insensitive).
2. "under $15,000" or similar pricing query: check the 'price' field. (Do matching less than or equal to the stated price).
3. "white", "black" or other colors: check 'color' or description text.
4. "automatic": check 'transmission' is "Automatic" or "Dual-Clutch".
5. "arriving next month": check 'etaDate' or description relative to the current local time context.
6. "less than 80,000 km": check the 'mileage' field is less than 80000.
7. Perform flexible semantic matching for other keywords (like model names, make, condition, engine specs) as well.

You must return a JSON array containing ONLY the matching vehicle IDs (e.g. ["id-1", "id-2"]). If no vehicles match, return an empty array [].`;

    // Call Gemini 3.5 Flash for fast and highly accurate semantic search
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const textOutput = response.text || "[]";
    const matchedIds = JSON.parse(textOutput.trim());

    res.json({ matchedIds });
  } catch (error: any) {
    console.error("Gemini AI Search API Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred." });
  }
});

// AI FAQ asking endpoint
app.post("/api/faq-ask", async (req, res) => {
  try {
    const { query: userQuery, faqs } = req.body;

    if (!userQuery || typeof userQuery !== "string") {
      return res.status(400).json({ error: "Search query/question is required." });
    }

    if (!Array.isArray(faqs)) {
      return res.status(400).json({ error: "FAQ knowledge base list is required." });
    }

    // Filter to only enabled FAQs and keep it clean and lightweight for context limits
    const enabledFaqs = faqs
      .filter((f: any) => f.Status !== "disabled" && f.status !== "disabled")
      .map((f: any) => ({
        Question: f.Question || f.question || "",
        Answer: f.Answer || f.answer || "",
        Category: f.Category || f.category || "",
        Keywords: f.Keywords || f.keywords || ""
      }));

    // Lazy initialize GenAI client
    const ai = getGenAI();

    const prompt = `You are an intelligent FAQ search assistant for CarChief.
Your task is to answer the user's natural language question using ONLY facts directly mentioned in the approved FAQ knowledge base provided below.

Rules:
1. You MUST answer the question using ONLY facts directly stated or clearly implied in the provided FAQ knowledge base below.
2. If the answer cannot be determined or inferred from the provided FAQ knowledge base (even with a flexible semantic interpretation of the questions, answers, and keywords), you MUST reply with EXACTLY this fallback text:
"I'm sorry, but that question is not covered in our approved FAQ knowledge base. Please feel free to connect with a direct desk agent using our Contact Advisor button below, and we'll resolve your query right away."
3. Do NOT make up any information, do NOT use any pre-trained external knowledge, and do NOT hallucinate under any circumstances.
4. Keep your answer professional, clear, concise, and focused strictly on the facts. Do not say "Based on the provided FAQs..." or "According to the FAQ...". Simply output the direct answer.
5. This is NOT a chatbot. Do not say "Hello", "How can I help you?", or engage in general chit-chat. Only provide the direct factual answer or the exact fallback text.

User's Question: "${userQuery}"

Approved FAQ Knowledge Base:
${JSON.stringify(enabledFaqs, null, 2)}`;

    // Call Gemini 3.5 Flash for fast and highly accurate Q&A grounded in the supplied context
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1, // low temperature to ensure absolute determinism and prevent hallucinations
      },
    });

    const answer = response.text ? response.text.trim() : "";
    const isFallback = answer.includes("approved FAQ knowledge base") || answer.includes("Contact Advisor");

    res.json({ answer, isFallback });
  } catch (error: any) {
    console.error("Gemini AI FAQ Ask API Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred." });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();
