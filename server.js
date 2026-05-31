const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const message = await client.messages.create
