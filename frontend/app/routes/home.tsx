import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSignalR } from "~/context/ConnectionContext";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { VideoIcon, Users, PlusCircle, ArrowRightCircle } from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meet Space" },
    {
      name: "description",
      content: "Video meetings and real-time chat with SignalR",
    },
  ];
}

export default function Home() {
  const { connection, isConnected, setupEventHandler } = useSignalR();
  const [username, setUsername] = useState("");
  const [isNameSet, setIsNameSet] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  const navigate = useNavigate();

  // Check for stored username
  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      setIsNameSet(true);
    }
  }, []);

  // Set up event handlers
  useEffect(() => {
    if (!isConnected) return;

    // Set up the event handler for room creation
    setupEventHandler("Connect", (receivedRoomId: string) => {
      navigate(`/room?id=${receivedRoomId}`);
    });
  }, [isConnected, setupEventHandler, navigate]);

  const handleCreateRoom = async () => {
    if (connection && isNameSet) {
      try {
        // Store username in sessionStorage before navigating
        sessionStorage.setItem("username", username);
        await connection.invoke("CreateRoom");
      } catch (err) {
        console.error("Error creating room:", err);
      }
    }
  };

  const handleJoinRoom = async () => {
    if (connection && joinRoomId && isNameSet) {
      try {
        sessionStorage.setItem("username", username);
        await connection.invoke("ConnectToRoom", joinRoomId);
        navigate(`/room?id=${joinRoomId}`);
      } catch (err) {
        console.error("Error joining room:", err);
      }
    }
  };

  const handleSetUsername = () => {
    if (username.trim()) {
      setIsNameSet(true);
      sessionStorage.setItem("username", username);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Meet Space</CardTitle>
            <CardDescription>Connecting to server...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isNameSet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-2">
                <VideoIcon className="h-8 w-8 text-blue-500" />
                <span className="text-3xl font-bold">Meet Space</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to Meet Space</CardTitle>
            <CardDescription>
              Get started with video meetings and chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Your name</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleSetUsername)}
                  placeholder="Enter your name"
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSetUsername}
              disabled={!username.trim()}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2">
              <VideoIcon className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-bold">Meet Space</span>
            </div>
          </div>
          <CardTitle className="text-2xl mb-2">
            Start or join a meeting
          </CardTitle>
          <CardDescription className="text-lg">
            Welcome, {username}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger
                value="create"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                New Meeting
              </TabsTrigger>
              <TabsTrigger
                value="join"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Join Meeting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-0">
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-lg">
                  <PlusCircle className="h-12 w-12 text-blue-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Create a new meeting room
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Start a new video conference and invite others to join
                  </p>
                  <Button
                    onClick={handleCreateRoom}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Create new meeting
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="join" className="mt-0">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <Input
                    id="roomId"
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
                    placeholder="Enter room ID"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  onClick={handleJoinRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!joinRoomId.trim()}
                  size="lg"
                >
                  <ArrowRightCircle className="mr-2 h-4 w-4" />
                  Join meeting
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="w-full pt-4 border-t border-gray-200 mt-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>Connect with video and chat in real-time</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
