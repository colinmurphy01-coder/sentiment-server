const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

app.options("*", cors());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/analyse", async (req, res) => {
  const { ticker, name, sector } = req.body;
  if (!ticker || !name || !sector) {
    return res.status(400).json({ error: "Missing ticker, name, or sector" });
  }

  const prompt =
    "You are a financial analyst AI for a macro/geopolitical trading system. " +
    "Analyse current market sentiment for " + name + " (" + ticker + "), a " + sector + " instrument. " +
    "Consider: Middle East tensions, US-Iran relations, Russia-Ukraine, NATO spending, " +
    "commodity supply/demand, Fed policy, USD strength, sector tailwinds/headwinds, upcoming catalysts. " +
    "Reply with ONLY a raw JSON object, no markdown, no explanation. " +
    'Format: {"signal":"BUY|SELL|HOLD|WATCH","confidence":1-10,"sentiment":"Bullish|Bearish|Neutral|Mixed",' +
    '"summary":"two sentence analysis","catalysts":["...","..."],"risks":["...","..."],' +
    '"geopolitical_flag":true|false,"timeframe":"Short-term|Medium-term|Long-term"}';

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response");
      parsed = JSON.parse(match[0]);
    }

    const signals = ["BUY", "SELL", "HOLD", "WATCH"];
    if (!signals.includes(parsed.signal)) parsed.signal = "HOLD";
    parsed.confidence = Math.max(1, Math.min(10, Number(parsed.confidence) || 5));
    if (!Array.isArray(parsed.catalysts)) parsed.catalysts = [];
    if (!Array.isArray(parsed.risks)) parsed.risks = [];

    console.log("[" + new Date().toLocaleTimeString() + "] " + ticker + " -> " + parsed.signal + " (" + parsed.confidence + "/10)");
    res.json(parsed);

  } catch (err) {
    console.error("[ERROR] " + ticker + ":", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Sentiment server running on port " + PORT);
});
