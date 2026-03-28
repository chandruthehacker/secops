import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./lib/websocket";
import { ensureEngineLoaded } from "./lib/detection/pipeline";
import { loadAssetCache } from "./lib/enrichment";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

initWebSocket(server);

server.listen(port, async () => {
  logger.info({ port }, "Server listening");

  try {
    await loadAssetCache();
    logger.info("Asset cache loaded");
  } catch (err) {
    logger.warn({ err }, "Failed to load asset cache");
  }

  try {
    await ensureEngineLoaded();
    logger.info("Detection engine loaded");
  } catch (err) {
    logger.warn({ err }, "Failed to load detection engine");
  }
});
