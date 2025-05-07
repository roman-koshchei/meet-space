import { useEffect, useState } from "react";
import * as SignalR from "@microsoft/signalr";
import type { Route } from "./+types/home";

// export function meta({}: Route.MetaArgs) {
//   return [
//     { title: "New React Router App" },
//     { name: "description", content: "Welcome to React Router!" },
//   ];
// }

let connection: SignalR.HubConnection | null = null;

export default function Home() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!connection) {
      connection = new SignalR.HubConnectionBuilder()
        .withUrl("https://localhost:7153/hub")
        .build();

      connection.on("GlobalReceiveMessage", (message: string) => {
        setMessages((prev) => [...prev, message]);
        console.log(messages);
      });

      connection.start();
    }
  }, []);

  return (
    <main>
      <h1>Meet space</h1>
      <div>
        {/* {JSON.stringify(messages)} */}
        {messages.map((x, i) => (
          <p key={i}>{x}</p>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={async () => {
          console.log(connection);
          if (connection) {
            await connection.send("GlobalSendMessage", input);
          }
        }}
      >
        Send
      </button>
    </main>
  );
}
