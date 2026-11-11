// Dedicated local arcade API when the main analytics API is managed separately.
import "./lib/load-env";
import express from "express";
import arcade from "./routes/arcade";
const app = express();
app.use(express.json({ limit: "256kb" }));
app.use("/api/arcade", arcade);
const port = Number(process.env.PORT ?? "5001");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid arcade API port");
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`[arcade-dev] listening on ${port}`),
);
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
process.once("SIGTERM", () => server.close());
process.once("SIGINT", () => server.close());
