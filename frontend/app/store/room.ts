import { create as zustandCreate } from "zustand";
import { loadUsername } from "./session";

type Message = {
  text: string;
  sender?: string;
  isSystem?: boolean;
};

type RoomStore = {
  username: string;
  messages: Message[];
  clients: string[];
};

const createRoomStore = () => {
  const username = loadUsername();

  return zustandCreate<RoomStore>(() => ({
    username: username ?? "",
    messages: [],
    clients: [],
  }));
};
