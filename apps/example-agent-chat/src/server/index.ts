import "dotenv/config";

import cors from "cors";
import express from "express";

import { chatHandler } from "./chat.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post("/api/chat", chatHandler);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Agent server running on http://localhost:${PORT}`);
});
