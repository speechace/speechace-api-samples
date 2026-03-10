/**
 * Speechace Express Sample — Server Entry Point
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import scoringRouter from "./routes/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.static(resolve(__dirname, "public")));
app.use("/api/score", scoringRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Speechace Express sample running at http://localhost:${PORT}`);
  });
}

export default app;
