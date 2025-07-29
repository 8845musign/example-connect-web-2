import { ConnectRouter } from "@connectrpc/connect";
import { expressConnectMiddleware } from "@connectrpc/connect-express";
import { ChatService } from "./gen/proto/chat/v1/chat_pb.js";
import { chatServiceImpl } from "./services/chat.js";
import express from "express";
import cors from "cors";
import * as http from "http";

const routes = (router: ConnectRouter) => {
  router.service(ChatService, chatServiceImpl);
};

const app = express();

// リクエストロギング
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS設定
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Connect-Protocol-Version", "Connect-Timeout-Ms"],
  exposedHeaders: ["Content-Type", "Connect-Content-Encoding", "Connect-Accept-Encoding"],
  credentials: true
}));

// Connect RPCミドルウェア
app.use(expressConnectMiddleware({
  routes
}));

const server = http.createServer(app);

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173`);
  console.log(`Waiting for connections...`);
});