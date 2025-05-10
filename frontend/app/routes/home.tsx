import { useEffect, useState } from "react";
import * as SignalR from "@microsoft/signalr";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Meet Space" },
        { name: "description", content: "Real-time chat with SignalR" },
    ];
}

let connection: SignalR.HubConnection | null = null;

export default function Home() {
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState("");
    const [isNameSet, setIsNameSet] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");
    const navigate = useNavigate();

    // Initialize the SignalR connection
    useEffect(() => {
        const ensureConnection = async () => {
            try {
                if (!connection) {
                    connection = new SignalR.HubConnectionBuilder()
                        .withUrl("http://localhost:32778/hub")
                        .withAutomaticReconnect({
                            nextRetryDelayInMilliseconds: retryContext => {
                                // Implement a shorter delay for first few retries
                                if (retryContext.previousRetryCount < 3) {
                                    return 1000; // 1 second
                                } else {
                                    return 3000; // 3 seconds
                                }
                            }
                        })
                        .build();

                    // Set up global event handlers before starting the connection
                    setupEventHandlers();

                    await connection.start();
                    console.log("Connected to SignalR hub!");
                    setIsConnected(true);
                } else if (connection.state === SignalR.HubConnectionState.Disconnected) {
                    // Set up handlers again in case they were lost
                    setupEventHandlers();

                    await connection.start();
                    console.log("Reconnected to SignalR hub!");
                    setIsConnected(true);
                } else {
                    // Connection exists and not in Disconnected state
                    setIsConnected(true);
                    // Refresh handlers just to be sure
                    setupEventHandlers();
                }
            } catch (err) {
                console.error("Error with SignalR connection:", err);
            }
        };

        ensureConnection();

        return () => {
            // We don't stop the connection on unmount as we want to persist it
            // across navigation to the room page
        };
    }, []);

    const setupEventHandlers = () => {
        if (!connection) return;

        // When a room is created, navigate to that room
        connection.on("Connect", (receivedRoomId: string) => {
            navigate(`/room?id=${receivedRoomId}`);
        });
    };

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
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center p-6 max-w-sm bg-white rounded-lg shadow-md">
                    <h1 className="text-xl font-bold mb-4">Connecting to chat server...</h1>
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    if (!isNameSet) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="p-6 max-w-sm w-full bg-white rounded-lg shadow-md">
                    <h1 className="text-xl font-bold mb-4 text-center">Welcome to Meet Space</h1>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, handleSetUsername)}
                            placeholder="Enter your username"
                            className="w-full p-2 mb-4 border border-gray-300 rounded"
                        />
                        <button
                            onClick={handleSetUsername}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="p-6 max-w-md w-full bg-white rounded-lg shadow-md">
                <div className="mb-4 text-center">
                    <h1 className="text-xl font-bold">Meet Space</h1>
                    <p className="text-sm text-gray-600">Logged in as: {username}</p>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="text-center">
                        <h2 className="font-bold mb-2">Create a New Room</h2>
                        <button
                            onClick={handleCreateRoom}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded"
                        >
                            Create Room
                        </button>
                    </div>

                    <div className="text-center">
                        <h2 className="font-bold mb-2">Join Existing Room</h2>
                        <input
                            type="text"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, handleJoinRoom)}
                            placeholder="Enter Room ID"
                            className="w-full p-2 mb-2 border border-gray-300 rounded"
                        />
                        <button
                            onClick={handleJoinRoom}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded"
                            disabled={!joinRoomId}
                        >
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}