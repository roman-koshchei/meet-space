import {type RouteConfig, index, route} from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("/room", "routes/room.tsx"),
] satisfies RouteConfig;
