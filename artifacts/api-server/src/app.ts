import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { checkIpBlocked } from "./middlewares/checkIpBlocked";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth/login", checkIpBlocked);
app.use("/api/auth/register", checkIpBlocked);
app.use("/api/auth/pin-login", checkIpBlocked);
app.use("/api", router);

const staticDir = path.resolve(process.cwd(), "../bidwrenx/dist/public");
const indexFile = path.join(staticDir, "index.html");

if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));

  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && fs.existsSync(indexFile)) {
      return res.sendFile(indexFile);
    }

    next();
  });
}

export default app;
