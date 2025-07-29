import { ConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { ChatService } from "./gen/proto/chat/v1/chat_pb.js";
import { chatServiceImpl } from "./services/chat.js";
import * as http from "http";

const routes = (router: ConnectRouter) => {
  router.service(ChatService, chatServiceImpl);
};

const server = http.createServer(
  connectNodeAdapter({ routes })
);

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
});