import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useSignalR } from "~/store/ConnectionContext";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Route } from "./+types/room";
import type { SdpDataModel } from "~/models/SdpDataModel";
import Header from "~/components/header";
import MeetingArea from "~/components/meetingArea";
import ChatArea from "~/components/chatArea";
import { loadUsername } from "~/store/session";

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

export default function Room({ params: { roomId } }: Route.ComponentProps) {
  const { connection, isConnected, setupEventHandler } = useSignalR();
  const [messages, setMessages] = useState<Message[]>([]);

  const username = useMemo(() => loadUsername() ?? "Guest", []);
  const [participants, setParticipants] = useState<string[]>([]);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);

  const [activeTab, setActiveTab] = useState("meeting");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [userId: string]: HTMLVideoElement | null }>(
    {}
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [userId: string]: RTCPeerConnection }>({});

  // Initialize local media
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        localStreamRef.current = stream;

        // Connect initial state for audio
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = true;
          setIsMicOn(true);
          console.log("Audio track initialized:", audioTrack.enabled);
        }
      } catch (err: any) {
        console.log(err);
        console.error("Error accessing media devices:", err);
        setIsVideoOn(false);
        setMessages((prev) => [
          ...prev,
          {
            text: `Error accessing camera/microphone: ${err.message.replace(
              "NotAllowedError:",
              ""
            )}`,
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
  }, [isConnected, roomId]);

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
        <MeetingArea
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          username={username}
          localVideoRef={localVideoRef}
          isMicOn={isMicOn}
          setIsMicOn={setIsMicOn}
          isVideoOn={isVideoOn}
          setIsVideoOn={setIsVideoOn}
          participants={participants}
          remoteVideoRefs={remoteVideoRefs}
          localStreamRef={localStreamRef}
          closePeerConnection={closePeerConnection}
          peerConnections={peerConnections}
          roomId={roomId}
        />

        {/* Chat area - visible on desktop or when Chat tab is active */}
        <ChatArea
          activeTab={activeTab}
          username={username}
          participants={participants}
          messages={messages}
          connection={connection}
          roomId={roomId}
        />
      </div>
    </div>
  );
}
