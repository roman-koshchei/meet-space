import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { MessageSquare, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getColorByInitial, getInitials } from "~/helper";
import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "~/store/room";

export default function ChatArea({ activeTab }: { activeTab: string }) {
  const username = useRoomStore((state) => state.username);
  const sendMessage = useRoomStore((state) => state.sendMessage);
  const otherUsers = useRoomStore((state) => state.otherUsers);

  return (
    <div
      className={`w-full md:w-80 flex-1 md:flex-none overflow-y-auto lg:w-96 bg-white shadow-md p-4 flex ${
        activeTab === "chat" ? "block" : "hidden"
      }`}
    >
      {/* Chat tabs */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="participants">
            <Users className="h-4 w-4 mr-2" />
            People ({otherUsers.length + 1})
          </TabsTrigger>
        </TabsList>

        {/* Chat content */}
        <MessageArea />

        {/* Participants list */}
        <TabsContent
          value="participants"
          className="h-[calc(100vh-14rem)] overflow-y-auto"
        >
          <div className="space-y-2">
            <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
              <Avatar className="h-10 w-10 mr-2">
                <AvatarFallback
                  className={`text-lg ${getColorByInitial(username)}`}
                >
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{username} (You)</p>
              </div>
            </div>

            {otherUsers.map((user) => (
              <div
                key={user.connectionId}
                className="flex items-center p-2 rounded hover:bg-gray-100"
              >
                <Avatar className="h-10 w-10 mr-2">
                  <AvatarFallback
                    className={`text-lg ${getColorByInitial(user.name)}`}
                  >
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MessageArea() {
  const sendMessage = useRoomStore((state) => state.sendMessage);
  const username = useRoomStore((state) => state.username);
  const messages = useRoomStore((state) => state.messages);

  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return;
    await sendMessage(newMessage);
    setNewMessage("");
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <TabsContent value="chat" className="flex flex-col h-[calc(100vh-14rem)]">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Be the first to send a message!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${
                msg.isSystem
                  ? "bg-gray-200 text-center text-sm"
                  : msg.sender === username
                  ? "bg-blue-100 ml-auto max-w-xs"
                  : "bg-gray-100 mr-auto max-w-xs"
              }`}
            >
              {!msg.isSystem && msg.sender !== username && (
                <div className="text-xs text-gray-600 font-semibold">
                  {msg.sender}
                </div>
              )}
              <div>{msg.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex"
        onSubmit={async (e) => {
          e.preventDefault();
          await handleSendMessage();
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border border-gray-300 rounded-l"
        />
        <Button className="rounded-l-none h-full" type="submit">
          Send
        </Button>
      </form>
    </TabsContent>
  );
}
