import { useEffect, useRef, useState } from "react";
import * as SignalR from "@microsoft/signalr";
import { useSearchParams, useNavigate } from "react-router";
import type { Route } from "./+types/room";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Meet Space - Chat Room" },
        { name: "description", content: "Real-time chat with SignalR" },
    ];
}

// Store the connection as a module-level variable for persistence
let connection: SignalR.HubConnection | null = null;

export default function Room() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomId = searchParams.get("id");
    const [messages, setMessages] = useState<Array<{
        text: string;
        sender?: string;
        isSystem: boolean;
    }>>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get username from sessionStorage
    useEffect(() => {
        const storedUsername = sessionStorage.getItem("username");
        if (!storedUsername) {
            // Redirect to home if no username is set
            navigate("/");
            return;
        }
        setUsername(storedUsername);
    }, [navigate]);

    // Initialize the SignalR connection
    useEffect(() => {
        if (!roomId) {
            navigate("/");
            return;
        }

        const ensureConnection = async () => {
            try {
                if (!connection) {
                    connection = new SignalR.HubConnectionBuilder()
                        .withUrl("http://localhost:32778/hub")
                        .withAutomaticReconnect()
                        .build();

                    // Set up event handlers before starting the connection
                    setupEventHandlers();

                    await connection.start();
                    console.log("Connected to SignalR hub!");
                    setIsConnected(true);

                    // Only join room after confirmed connection
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure connection is ready
                    await joinRoom();
                } else if (connection.state === SignalR.HubConnectionState.Disconnected) {
                    // Set up event handlers before starting the connection
                    setupEventHandlers();

                    await connection.start();
                    console.log("Reconnected to SignalR hub!");
                    setIsConnected(true);

                    // Only join room after confirmed connection
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure connection is ready
                    await joinRoom();
                } else {
                    setIsConnected(true);
                    setupEventHandlers();

                    // If connection is already established, ensure we're in Connected state
                    if (connection.state === SignalR.HubConnectionState.Connected) {
                        await joinRoom();
                    } else {
                        console.log("Waiting for connection to be in Connected state...");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await joinRoom();
                    }
                }
            } catch (err) {
                console.error("Error with SignalR connection:", err);
                setMessages(prev => [...prev, {
                    text: `Connection error: ${err}`,
                    isSystem: true
                }]);
            }
        };

        ensureConnection();

        return () => {
            // We don't stop the connection on unmount as we want to persist it
            // if user navigates back to home
        };
    }, [roomId, navigate]);

    const setupEventHandlers = () => {
        if (!connection) return;

        // Remove any existing handlers to prevent duplicates
        connection.off("NewUserInRoom");
        connection.off("ReceiveMessage");
        connection.off("GlobalReceiveMessage");

        // Set up event handlers
        connection.on("NewUserInRoom", () => {
            setMessages(prev => [...prev, { text: "A new user has joined the room!", isSystem: true }]);
        });

        connection.on("ReceiveMessage", (receivedMessage: string) => {
            try {
                const parsedMessage = JSON.parse(receivedMessage);
                setMessages(prev => [...prev, {
                    text: parsedMessage.text,
                    sender: parsedMessage.sender,
                    isSystem: false
                }]);
            } catch (e) {
                // Fallback if message isn't in expected format
                setMessages(prev => [...prev, { text: receivedMessage, isSystem: false }]);
            }
        });

        // Also handle global messages
        connection.on("GlobalReceiveMessage", (message: string) => {
            setMessages(prev => [...prev, { text: message, isSystem: true }]);
        });
    };

    const joinRoom = async () => {
        if (!connection || !roomId) return;

        // Check if connection is ready
        if (connection.state !== SignalR.HubConnectionState.Connected) {
            console.log(`Connection not ready. Current state: ${connection.state}`);
            setMessages(prev => [...prev, {
                text: `Waiting for connection to be ready. Current state: ${connection?.state}`,
                isSystem: true
            }]);
            return;
        }

        try {
            console.log("Attempting to join room:", roomId);
            // Try to join the room
            await connection.invoke("ConnectToRoom", roomId);
            setMessages(prev => [...prev, { text: `Joined room: ${roomId}`, isSystem: true }]);
        } catch (err) {
            console.error("Error joining room:", err);
            setMessages(prev => [...prev, {
                text: `Error joining room: ${err}`,
                isSystem: true
            }]);
        }
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (connection && newMessage && roomId) {
            try {
                const messageObj = {
                    text: newMessage,
                    sender: username
                };
                await connection.invoke("SendMessage", roomId, JSON.stringify(messageObj));
                setNewMessage("");
            } catch (err) {
                console.error("Error sending message:", err);
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleBackToHome = () => {
        navigate("/");
    };

    if (!isConnected || !roomId) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center p-6 max-w-sm bg-white rounded-lg shadow-md">
                    <h1 className="text-xl font-bold mb-4">Connecting to chat server...</h1>
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <div className="bg-white shadow p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">Meet Space</h1>
                    <p className="text-sm text-gray-600">Room ID: {roomId}</p>
                </div>
                <div className="flex items-center">
                    <span className="mr-4 text-sm text-gray-600">{username}</span>
                    <button
                        onClick={handleBackToHome}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded text-sm"
                    >
                        Back to Home
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg shadow p-4">
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
                                            ? "bg-blue-100 ml-auto max-w-xs md:max-w-md"
                                            : "bg-gray-100 mr-auto max-w-xs md:max-w-md"
                                }`}
                            >
                                {!msg.isSystem && msg.sender !== username && (
                                    <div className="text-xs text-gray-600 font-semibold">{msg.sender}</div>
                                )}
                                <div>{msg.text}</div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="flex">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 p-2 border border-gray-300 rounded-l"
                    />
                    <button
                        onClick={handleSendMessage}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-r"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}