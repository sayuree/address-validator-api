import express from "express";
import validateAddressRouter from "./routes/validateAddress.js";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(express.json());
app.use(requestLogger);


logger.info("app.routes.register");
app.use("/validate-address", validateAddressRouter);

app.get("/", (_req, res) => {
  res.send("Server is up 🚀");
});

logger.info("app.routes.ready");

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info("app.listening", { port: config.port });
});
