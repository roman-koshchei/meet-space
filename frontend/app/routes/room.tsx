import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useSignalR } from "~/context/ConnectionContext";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Users,
  PhoneOff,
  Share2,
  MoreVertical,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { Route } from "./+types/room";
import type { SdpDataModel } from "~/models/SdpDataModel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meet Space - Meeting Room" },
    {
      name: "description",
      content: "Video meetings and real-time chat with SignalR",
    },
  ];
}

export default function Room() {
  const { connection, isConnected, setupEventHandler } = useSignalR();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("id");
  const [messages, setMessages] = useState<
    Array<{
      text: string;
      sender?: string;
      isSystem: boolean;
    }>
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [videoDevice, setVideoDevice] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevice, setAudioDevice] = useState("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [activeTab, setActiveTab] = useState("meeting");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [userId: string]: HTMLVideoElement | null }>(
    {}
  );
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
        const devices = await navigator.mediaDevices.enumerateDevices();
        const availableVideoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const availableAudioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );

        setVideoDevices(availableVideoDevices);
        setAudioDevices(availableAudioDevices);

        // Set default devices if none selected
        if (!videoDevice && availableVideoDevices.length > 0) {
          setVideoDevice(availableVideoDevices[0].deviceId);
        }
        if (!audioDevice && availableAudioDevices.length > 0) {
          setAudioDevice(availableAudioDevices[0].deviceId);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn ? { deviceId: videoDevice || undefined } : false,
          audio: isMicOn ? { deviceId: audioDevice || undefined } : false,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        localStreamRef.current = stream;
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setMessages((prev) => [
          ...prev,
          {
            text: `Error accessing camera/microphone: ${err}`,
            isSystem: true,
          },
        ]);
      }
    };

    if (isConnected && roomId) {
      initLocalStream();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isConnected, roomId, videoDevice, audioDevice]);

  const switchVideoDevice = async (deviceId: string) => {
    setVideoDevice(deviceId);
    if (localStreamRef.current) {
      // Stop existing video track
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop());

      try {
        // Get new stream with selected device
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: deviceId },
          audio: true,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];

        // Replace video track in local stream
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);

        // Update local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        // Replace track in all peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        });
      } catch (err) {
        console.error("Error switching video device:", err);
      }
    }
  };

  const switchAudioDevice = async (deviceId: string) => {
    setAudioDevice(deviceId);
    if (localStreamRef.current) {
      // Stop existing audio track
      localStreamRef.current.getAudioTracks().forEach((track) => track.stop());

      try {
        // Get new stream with selected device
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: deviceId },
          video: false,
        });

        const newAudioTrack = newStream.getAudioTracks()[0];

        // Replace audio track in local stream
        const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
        localStreamRef.current.removeTrack(oldAudioTrack);
        localStreamRef.current.addTrack(newAudioTrack);

        // Replace track in all peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) {
            sender.replaceTrack(newAudioTrack);
          }
        });
      } catch (err) {
        console.error("Error switching audio device:", err);
      }
    }
  };

  // Set up WebRTC and SignalR event handlers
  useEffect(() => {
    if (!isConnected || !roomId || !username) return;

    // Set up event handlers for chat
    setupEventHandler("NewUserInRoom", () => {
      setMessages((prev) => [
        ...prev,
        { text: "A new user has joined the room!", isSystem: true },
      ]);
    });

    setupEventHandler("ReceiveMessage", (receivedMessage: string) => {
      try {
        const parsedMessage = JSON.parse(receivedMessage);
        setMessages((prev) => [
          ...prev,
          {
            text: parsedMessage.text,
            sender: parsedMessage.sender,
            isSystem: false,
          },
        ]);
      } catch (e) {
        // Fallback if message isn't in expected format
        setMessages((prev) => [
          ...prev,
          { text: receivedMessage, isSystem: false },
        ]);
      }
    });

    setupEventHandler("GlobalReceiveMessage", (message: string) => {
      setMessages((prev) => [...prev, { text: message, isSystem: true }]);
    });

    // Set up WebRTC event handlers
    setupEventHandler("AnotherUserJoined", (newUserId: string) => {
      setParticipants((prev) => [...prev, newUserId]);
      createPeerConnection(newUserId);
    });

    setupEventHandler("UserLeft", (userId: string) => {
      setParticipants((prev) => prev.filter((id) => id !== userId));
      closePeerConnection(userId);
    });

    setupEventHandler(
      "sdpProcess",
      async (fromUserId: string, sdpData: SdpDataModel) => {
        if (sdpData.type === "offer") {
          const pc = getPeerConnection(fromUserId);
          if (sdpData.sdp instanceof RTCSessionDescription) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(sdpData.sdp)
            );
          } else {
            console.error("Invalid SDP offer:", sdpData.sdp);
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const sdpDataToSend: SdpDataModel = {
            type: "answer",
            sdp: pc.localDescription,
          };

          await connection?.invoke("SdpProcess", fromUserId, sdpDataToSend);
        } else if (sdpData.type === "answer") {
          const pc = peerConnections.current[fromUserId];
          if (pc) {
            if (sdpData.sdp instanceof RTCSessionDescription) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(sdpData.sdp)
              );
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
      }
    );

    // Join the room
    const joinMeeting = async () => {
      if (!connection) return;

      try {
        console.log("Joining meeting:", roomId);
        const existingUsers = await connection.invoke(
          "UserJoining",
          username,
          roomId
        );

        setParticipants(existingUsers);
        existingUsers.forEach((userId: string) => createPeerConnection(userId));

        setMessages((prev) => [
          ...prev,
          { text: `Joined room: ${roomId}`, isSystem: true },
        ]);
      } catch (err) {
        console.error("Error joining meeting:", err);
        setMessages((prev) => [
          ...prev,
          {
            text: `Error joining meeting: ${err}`,
            isSystem: true,
          },
        ]);
      }
    };

    // Small delay to ensure connection is ready
    const timer = setTimeout(() => {
      joinMeeting();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Clean up peer connections
      Object.keys(peerConnections.current).forEach((userId) => {
        closePeerConnection(userId);
      });
    };
  }, [isConnected, roomId, username]);

  // Handle media controls
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isSharingScreen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Replace the video track in all peer connections
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // When screen sharing stops
        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsSharingScreen(true);
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (localStreamRef.current && localVideoRef.current) {
      // Switch back to camera
      localVideoRef.current.srcObject = localStreamRef.current;

      // Replace screen sharing track with camera track in all peer connections
      const videoTrack = localStreamRef.current.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });

      setIsSharingScreen(false);
    }
  };

  // WebRTC helpers
  const createPeerConnection = (userId: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Add local tracks to connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          const sdpData: SdpDataModel = {
            type: "candidate",
            sdp: event.candidate,
          };
          await connection?.invoke("SdpProcess", userId, sdpData);
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRefs.current[userId]) {
          const videoElement = remoteVideoRefs.current[userId]!;
          videoElement.srcObject = event.streams[0];
          // Enable audio playback
          videoElement.muted = false;
          videoElement.volume = 1.0;
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
        sdp: pc.localDescription,
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
          sender: username,
        };
        await connection.invoke(
          "SendMessage",
          roomId,
          JSON.stringify(messageObj)
        );
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

  const handleEndCall = () => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close all peer connections
    Object.keys(peerConnections.current).forEach((userId) => {
      closePeerConnection(userId);
    });

    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
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
        <div
          className={`flex-1 p-4 flex flex-col ${
            activeTab === "meeting" || window.innerWidth >= 768
              ? "block"
              : "hidden md:block"
          }`}
        >
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
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs py-1 px-2 rounded">
                {username} (You)
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
              <div
                key={participantId}
                className="relative bg-black rounded-lg overflow-hidden"
              >
                <video
                  ref={(el) => {
                    remoteVideoRefs.current[participantId] = el;
                  }}
                  autoPlay
                  muted={false}
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
          <div className="flex justify-center space-x-2 py-4">
            <Button
              variant={isMicOn ? "default" : "destructive"}
              size="icon"
              onClick={toggleMic}
              className="rounded-full h-12 w-12"
            >
              {isMicOn ? <Mic /> : <MicOff />}
            </Button>
            <select
              className="rounded-lg border border-gray-300 px-3"
              value={audioDevice}
              onChange={(e) => switchAudioDevice(e.target.value)}
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 4)}`}
                </option>
              ))}
            </select>
            <Button
              variant={isVideoOn ? "default" : "destructive"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12"
            >
              {isVideoOn ? <Video /> : <VideoOff />}
            </Button>
            <select
              className="rounded-lg border border-gray-300 px-3"
              value={videoDevice}
              onChange={(e) => switchVideoDevice(e.target.value)}
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 4)}`}
                </option>
              ))}
            </select>
            <Button
              variant={isSharingScreen ? "secondary" : "outline"}
              size="icon"
              onClick={toggleScreenShare}
              className="rounded-full h-12 w-12"
            >
              <Share2 />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleEndCall}
              className="rounded-full h-12 w-12"
            >
              <PhoneOff />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-12 w-12"
            >
              <Settings />
            </Button>
          </div>
        </div>

        {/* Chat area - visible on desktop or when Chat tab is active */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-white shadow-md p-4 flex flex-col ${
            activeTab === "chat" || window.innerWidth >= 768
              ? "block"
              : "hidden md:block"
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
                People ({participants.length + 1})
              </TabsTrigger>
            </TabsList>

            {/* Chat content */}
            <TabsContent
              value="chat"
              className="flex flex-col h-[calc(100vh-14rem)]"
            >
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

              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-l"
                />
                <Button onClick={handleSendMessage} className="rounded-l-none">
                  Send
                </Button>
              </div>
            </TabsContent>

            {/* Participants list */}
            <TabsContent
              value="participants"
              className="h-[calc(100vh-14rem)] overflow-y-auto"
            >
              <div className="space-y-2">
                <div className="flex items-center p-2 rounded hover:bg-gray-100">
                  <Avatar className="h-10 w-10 mr-2">
                    <AvatarFallback>{getInitials(username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{username} (You)</p>
                  </div>
                </div>

                {participants.map((participantId) => (
                  <div
                    key={participantId}
                    className="flex items-center p-2 rounded hover:bg-gray-100"
                  >
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
