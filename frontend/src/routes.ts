import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/index.tsx"),
  route("chat", "./routes/chat/layout.tsx", [
    index("./routes/chat/room.tsx"),
  ]),
] satisfies RouteConfig;