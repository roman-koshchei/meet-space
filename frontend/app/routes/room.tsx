import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useSignalR } from "~/context/ConnectionContext";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
    Mic, MicOff, Video, VideoOff, MessageSquare, Users,
    PhoneOff, Share2, Settings, Airplay, MessagesSquare
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { Route } from "./+types/room";
import type { SdpDataModel } from "~/models/SdpDataModel";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Meet Space - Meeting Room" },
        { name: "description", content: "Video meetings and real-time chat with SignalR" },
    ];
}

export default function Room() {
    const { connection, isConnected, setupEventHandler } = useSignalR();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomId = searchParams.get("id");
    const [messages, setMessages] = useState<Array<{
        text: string;
        sender?: string;
        isSystem: boolean;
    }>>([]);
    const [newMessage, setNewMessage] = useState("");
    const [username, setUsername] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [participants, setParticipants] = useState<string[]>([]);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [activeTab, setActiveTab] = useState("meeting");
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRefs = useRef<{ [userId: string]: HTMLVideoElement | null }>({});
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnections = useRef<{ [userId: string]: RTCPeerConnection }>({});

    // Get username from sessionStorage
    useEffect(() => {
        const storedUsername = sessionStorage.getItem("username");
        if (!storedUsername) {
            // Redirect to home if no username is set
            navigate("/");
            return;
        }
        setUsername(storedUsername);
    }, []);

    // Redirect if no roomId is provided
    useEffect(() => {
        if (!roomId) {
            navigate("/");
        }
    }, [roomId]);

    // Initialize local media
    useEffect(() => {
        const initLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: isVideoOn,
                    audio: true
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                localStreamRef.current = stream;

                // Установим начальное состояние для аудио
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = true;
                    setIsMicOn(true);
                    console.log('Audio track initialized:', audioTrack.enabled);
                }
            } catch (err: any) {
                console.log(err);
                console.error("Error accessing media devices:", err);
                setIsVideoOn(false)
                setMessages(prev => [...prev, {
                    text: `Error accessing camera/microphone: ${err.message.replace("NotAllowedError:", "")}`,
                    isSystem: true
                }]);
            }
        };

        if (isConnected && roomId) {
            initLocalStream();
        }

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isConnected, roomId]);

    // Set up WebRTC and SignalR event handlers
    useEffect(() => {
        if (!isConnected || !roomId || !username) return;

        // Set up event handlers for chat
        setupEventHandler("NewUserInRoom", () => {
            setMessages(prev => [...prev, { text: "A new user has joined the room!", isSystem: true }]);
        });

        setupEventHandler("ReceiveMessage", (receivedMessage: string) => {
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

        setupEventHandler("GlobalReceiveMessage", (message: string) => {
            setMessages(prev => [...prev, { text: message, isSystem: true }]);
        });

        // Set up WebRTC event handlers
        setupEventHandler("AnotherUserJoined", (newUserId: string) => {
            setParticipants(prev => [...prev, newUserId]);
            createPeerConnection(newUserId);
        });

        setupEventHandler("UserLeft", (userId: string) => {
            setParticipants(prev => prev.filter(id => id !== userId));
            closePeerConnection(userId);
        });

        setupEventHandler("sdpProcess", async (fromUserId: string, sdpData: SdpDataModel) => {
            if (sdpData.type === "offer") {
                const pc = getPeerConnection(fromUserId);
                if (sdpData.sdp instanceof  RTCSessionDescription) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdpData.sdp));
                } else {
                    console.error("Invalid SDP offer:", sdpData.sdp);
                }
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                const sdpDataToSend: SdpDataModel = {
                    type: "answer",
                    sdp: pc.localDescription
                };

                await connection?.invoke("SdpProcess", fromUserId, sdpDataToSend);
            } else if (sdpData.type === "answer") {
                const pc = peerConnections.current[fromUserId];
                if (pc) {
                    if (sdpData.sdp instanceof  RTCSessionDescription) {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdpData.sdp));
                    } else {
                        console.error("Invalid SDP answer:", sdpData.sdp);
                    }
                }
            } else if (sdpData.type === "candidate") {
                const pc = peerConnections.current[fromUserId];
                if (pc) {
                    if (sdpData.sdp instanceof RTCIceCandidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(sdpData.sdp));
                    } else {
                        console.error("Invalid ICE candidate:", sdpData.sdp);
                    }
                }
            }
        });

        // Join the room
        const joinMeeting = async () => {
            if (!connection) return;

            try {
                console.log("Joining meeting:", roomId);
                const existingUsers = await connection.invoke("UserJoining", username, roomId);

                setParticipants(existingUsers);
                existingUsers.forEach((userId: string) => createPeerConnection(userId));
            } catch (err) {
                console.error("Error joining meeting:", err);
                setMessages(prev => [...prev, {
                    text: `Error joining meeting: ${err}`,
                    isSystem: true
                }]);
            }
        };

        // Small delay to ensure connection is ready
        const timer = setTimeout(() => {
            joinMeeting();
        }, 500);

        return () => {
            clearTimeout(timer);
            // Clean up peer connections
            Object.keys(peerConnections.current).forEach(userId => {
                closePeerConnection(userId);
            });
        };
    }, [isConnected, roomId, username]);

    // Handle media controls
    const toggleMic = () => {
        if (!localStreamRef.current) {
            console.log('Initializing stream...');
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    localStreamRef.current = stream;
                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.enabled = true;
                        setIsMicOn(true);
                    }
                })
                .catch(err => console.error('Error initializing audio:', err));
            return;
        }

        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMicOn(audioTrack.enabled);
        } else {
            console.log('No audio track available');
        }
    };

    const toggleVideo = async () => {
        if (!localStreamRef.current || !localStreamRef.current.getVideoTracks().length) {
            try {
                console.log('Initializing video stream...');
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

                const videoTrack = videoStream.getVideoTracks()[0];

                if (localStreamRef.current) {
                    localStreamRef.current.addTrack(videoTrack);
                } else {
                    localStreamRef.current = videoStream;
                }

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }

                videoTrack.enabled = true;
                setIsVideoOn(true);
                console.log('Video track initialized:', videoTrack.enabled);
            } catch (err) {
                console.error('Error initializing video:', err);
                setIsVideoOn(false);
                return;
            }
        } else {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                if (!isVideoOn) {
                    videoTrack.enabled = true;
                    setIsVideoOn(true);
                } else {
                    videoTrack.enabled = false;
                    videoTrack.stop();
                    setIsVideoOn(false);

                    localStreamRef.current.removeTrack(videoTrack);

                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStreamRef.current;
                    }
                }
                console.log('Video track toggled. New state:', videoTrack.enabled);
            }
        }
    };

    const toggleScreenShare = async () => {
        console.log("Current state:", isSharingScreen);
        if (!isSharingScreen) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                const screenTrack = screenStream.getVideoTracks()[0];

                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s =>
                        s.track?.kind === "video"
                    );
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                screenTrack.addEventListener('ended', () => {
                    stopScreenSharing();
                });

                setIsSharingScreen(true);
            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        } else {
            if (localVideoRef.current?.srcObject instanceof MediaStream) {
                const currentStream = localVideoRef.current.srcObject;
                currentStream.getTracks().forEach(track => track.stop());
            }

            setIsSharingScreen(false);
            await stopScreenSharing();
        }
    };

    const stopScreenSharing = async () => {
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;

            const videoTrack = localStreamRef.current.getVideoTracks()[0];

            await Promise.all(Object.values(peerConnections.current).map(async pc => {
                const sender = pc.getSenders().find(s =>
                    s.track?.kind === "video"
                );
                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            }));
        }
    };

    // WebRTC helpers
    const createPeerConnection = (userId: string) => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" }
                ]
            });

            // Add local tracks to connection
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, localStreamRef.current!);
                });
            }

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    const sdpData: SdpDataModel = {
                        type: "candidate",
                        sdp: event.candidate
                    };
                    await connection?.invoke("SdpProcess", userId, sdpData);
                }
            };

            // Handle remote tracks
            pc.ontrack = (event) => {
                if (remoteVideoRefs.current[userId]) {
                    remoteVideoRefs.current[userId]!.srcObject = event.streams[0];
                }
            };

            peerConnections.current[userId] = pc;

            // Create and send offer
            createAndSendOffer(userId, pc);

            return pc;
        } catch (err) {
            console.error("Error creating peer connection:", err);
            return null;
        }
    };

    const createAndSendOffer = async (userId: string, pc: RTCPeerConnection) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpData: SdpDataModel = {
                type: "offer",
                sdp: pc.localDescription
            };

            await connection?.invoke("SdpProcess", userId, sdpData);
        } catch (err) {
            console.error("Error creating offer:", err);
        }
    };

    const getPeerConnection = (userId: string) => {
        if (!peerConnections.current[userId]) {
            peerConnections.current[userId] = createPeerConnection(userId)!;
        }
        return peerConnections.current[userId];
    };

    const closePeerConnection = (userId: string) => {
        if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
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

    const copyIdToClipboard = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId).then(() => {
                setShowCopiedTooltip(true);
                setTimeout(() => setShowCopiedTooltip(false), 2000);
            }).catch(err => {
                console.error("Error copying Room ID:", err);
            });
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleBackToHome = () => {
        navigate("/");
    };

    const handleEndCall = () => {
        // Stop all media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        Object.keys(peerConnections.current).forEach(userId => {
            closePeerConnection(userId);
        });

        navigate("/");
    };

    const getInitials = (name: string) => {
        return name.split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

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
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">Meet Space</h1>
                    <p className="text-sm text-gray-600">Room ID: {roomId}</p>
                </div>
                <div className="flex items-center">
                    <span className="mr-4 text-sm text-gray-600">{username}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToHome}
                        className="mr-2"
                    >
                        Back to Home
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Tab navigation for mobile */}
                <div className="block md:hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="meeting">Meeting</TabsTrigger>
                            <TabsTrigger value="chat">Chat</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Meeting area - visible on desktop or when Meeting tab is active */}
                <div className={`flex-1 p-4 flex flex-col ${activeTab === 'meeting' || window.innerWidth >= 768 ? 'block' : 'hidden md:block'}`}>
                    {/* Video grid */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto mb-4">
                        {/* Local video */}
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 z-1 text-white text-xs py-1 px-2 rounded flex items-center space-x-1">
                                <span>{username} (You)</span>
                                {!isMicOn && <MicOff className="w-3 h-3" />}
                            </div>
                            {!isVideoOn && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70">
                                    <Avatar className="h-20 w-20">
                                        <AvatarFallback className="text-2xl">
                                            {getInitials(username)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                        </div>

                        {/* Remote videos */}
                        {participants.map((participantId) => (
                            <div key={participantId} className="relative bg-black rounded-lg overflow-hidden">
                                <video
                                    ref={(el) => {
                                        remoteVideoRefs.current[participantId] = el;
                                    }}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs py-1 px-2 rounded">
                                    {participantId}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Meeting controls */}
                    <div className="flex sticky justify-center space-x-2 py-4">
                        <Button
                            variant={isMicOn ? "outline" : "destructive"}
                            size="icon"
                            onClick={toggleMic}
                            className="rounded-full h-12 w-12"
                        >
                            {isMicOn ? <Mic /> : <MicOff />}
                        </Button>
                        <Button
                            variant={isVideoOn ? "outline" : "destructive"}
                            size="icon"
                            onClick={toggleVideo}
                            className="rounded-full h-12 w-12"
                        >
                            {isVideoOn ? <Video /> : <VideoOff />}
                        </Button>
                        <TooltipProvider>
                            <Tooltip open={showCopiedTooltip}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyIdToClipboard}
                                        className="rounded-full h-12 w-12"
                                    >
                                        <Share2 />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>ID copied to clipboard!</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button
                            variant={isSharingScreen ? "default" : "outline"}
                            size="icon"
                            onClick={toggleScreenShare}
                            className="rounded-full h-12 w-12"
                        >
                            <Airplay />
                        </Button>
                        <Button
                            variant={activeTab === "chat" ? "default" : "outline"}
                            size="icon"
                            onClick={() => setActiveTab(activeTab === "chat" ? "meeting" : "chat")}
                            className="rounded-full h-12 w-12"
                        >
                            <MessageSquare />
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={handleEndCall}
                            className="rounded-full h-12 w-12"
                        >
                            <PhoneOff />
                        </Button>
                    </div>
                </div>

                {/* Chat area - visible on desktop or when Chat tab is active */}
                <div className={`w-full md:w-80 lg:w-96 bg-white shadow-md p-4 flex ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
                    {/* Chat tabs */}
                    <Tabs defaultValue="chat" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="chat">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Chat
                            </TabsTrigger>
                            <TabsTrigger value="participants">
                                <Users className="h-4 w-4 mr-2" />
                                People ({participants.length + 1})
                            </TabsTrigger>
                        </TabsList>

                        {/* Chat content */}
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
                                <Button
                                    onClick={handleSendMessage}
                                    className="rounded-l-none h-full"
                                >
                                    Send
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Participants list */}
                        <TabsContent value="participants" className="h-[calc(100vh-14rem)] overflow-y-auto">
                            <div className="space-y-2">
                                <div className="flex items-center p-2 rounded hover:bg-gray-100">
                                    <Avatar className="h-10 w-10 mr-2">
                                        <AvatarFallback>
                                            {getInitials(username)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">{username} (You)</p>
                                    </div>
                                </div>

                                {participants.map((participantId) => (
                                    <div key={participantId} className="flex items-center p-2 rounded hover:bg-gray-100">
                                        <Avatar className="h-10 w-10 mr-2">
                                            <AvatarFallback>
                                                {getInitials(participantId)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">{participantId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}