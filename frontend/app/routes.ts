import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/room/:roomId", "routes/room.tsx"),
] satisfies RouteConfig;
