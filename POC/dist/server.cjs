var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
process.env.NODE_ENV = process.env.NODE_ENV || "development";
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use((req, res, next) => {
  if (req.url === "/sw.js" || req.url === "/service-worker.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});
var aiClient = null;
function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.post("/api/search", async (req, res) => {
  try {
    const { query, vehicles, currentTime } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required." });
    }
    if (!Array.isArray(vehicles)) {
      return res.status(400).json({ error: "Vehicles list is required." });
    }
    const lightweightVehicles = vehicles.map((v) => ({
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
    const ai = getGenAI();
    const prompt = `You are a professional automotive sales search assistant.
Analyze the user's natural language search query and filter the provided list of vehicles to find matching cars.
User Query: "${query}"
Current Local Time context: "${currentTime || (/* @__PURE__ */ new Date()).toISOString()}"

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.STRING
          }
        }
      }
    });
    const textOutput = response.text || "[]";
    const matchedIds = JSON.parse(textOutput.trim());
    res.json({ matchedIds });
  } catch (error) {
    console.error("Gemini AI Search API Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred." });
  }
});
app.post("/api/faq-ask", async (req, res) => {
  try {
    const { query: userQuery, faqs } = req.body;
    if (!userQuery || typeof userQuery !== "string") {
      return res.status(400).json({ error: "Search query/question is required." });
    }
    if (!Array.isArray(faqs)) {
      return res.status(400).json({ error: "FAQ knowledge base list is required." });
    }
    const enabledFaqs = faqs.filter((f) => f.Status !== "disabled" && f.status !== "disabled").map((f) => ({
      Question: f.Question || f.question || "",
      Answer: f.Answer || f.answer || "",
      Category: f.Category || f.category || "",
      Keywords: f.Keywords || f.keywords || ""
    }));
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1
        // low temperature to ensure absolute determinism and prevent hallucinations
      }
    });
    const answer = response.text ? response.text.trim() : "";
    const isFallback = answer.includes("approved FAQ knowledge base") || answer.includes("Contact Advisor");
    res.json({ answer, isFallback });
  } catch (error) {
    console.error("Gemini AI FAQ Ask API Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred." });
  }
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
setupVite();
//# sourceMappingURL=server.cjs.map
