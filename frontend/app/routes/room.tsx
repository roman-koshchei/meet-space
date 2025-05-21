import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Route } from "./+types/room";
import Header from "~/components/Header";
import MeetingArea from "~/components/MeetingArea";
import ChatArea from "~/components/ChatArea";
import { loadUsername } from "~/store/session";
import { RoomStoreProvider, useRoomStore } from "~/store/room";

export interface Message {
  text: string;
  sender?: string;
  isSystem?: boolean;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meet Space - Meeting Room" },
    {
      name: "description",
      content: "Video meetings and real-time chat with SignalR",
    },
  ];
}

const hubUrl = import.meta.env.DEV ? "https://localhost:7153/hub" : "/hub";

export default function RoomPage({ params: { roomId } }: Route.ComponentProps) {
  return (
    <RoomStoreProvider hubUrl={hubUrl} roomId={roomId}>
      <Room roomId={roomId} />;
    </RoomStoreProvider>
  );
}

function Room({ roomId }: { roomId: string }) {
  const isConnected = useRoomStore((state) => state.isConnected);
  const username = useRoomStore((state) => state.username);
  const [activeTab, setActiveTab] = useState("meeting");

  if (!isConnected || !roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-6 max-w-sm bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-bold mb-4">Connecting to server...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-100">
      <Header roomId={roomId} username={username} />

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Tab navigation for mobile */}
        <div className="block md:hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="meeting">Meeting</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Meeting area - visible on desktop or when Meeting tab is active */}
        <MeetingArea activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Chat area - visible on desktop or when Chat tab is active */}
        <ChatArea activeTab={activeTab} />
      </div>
    </div>
  );
}
