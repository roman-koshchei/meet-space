import { createStore, useStore } from "zustand";
import { loadUsername } from "./session";
import * as SignalR from "@microsoft/signalr";
import { createContext, useContext, useMemo, useRef } from "react";
import type { StoreApi } from "zustand";

type Message = {
  text: string;
  sender?: string;
  isSystem?: boolean;
};

export type User = {
  connectionId: string;
  name: string;
};

type RoomStore = {
  username: string;
  messages: Message[];
  otherUsers: User[];

  connection: SignalR.HubConnection;
  isConnected: boolean;

  sendMessage: (message: string) => Promise<void>;
};

const createRoomStore = (hubUrl: string, roomId: string) => {
  const username = loadUsername() ?? "Guest";

  const connection = new SignalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .build();

  const store = createStore<RoomStore>((set) => ({
    username: username,
    messages: [],
    otherUsers: [],

    connection,
    isConnected: false,

    sendMessage: async (message) => {
      connection.send("SendMessage", roomId, message);
      set((state) => ({
        messages: [...state.messages, { text: message, isSystem: false }],
      }));
    },
  }));

  connection.onreconnecting(() => {
    console.log("Reconnecting to SignalR hub...");
    store.setState({ isConnected: false });
  });

  connection.onreconnected(() => {
    console.log("Reconnected to SignalR hub");
    store.setState({ isConnected: true });
  });

  connection.onclose(() => {
    console.log("Connection closed");
    store.setState({ isConnected: false });
  });

  connection.on("UserJoinedRoom", (connectionId: string, name: string) => {
    console.log("UserJoinedRoom", connectionId, name);
    store.setState((state) => ({
      messages: [
        ...state.messages,
        { text: `${name} has joined the room!`, isSystem: true },
      ],
      otherUsers: [...state.otherUsers, { connectionId, name }],
    }));
  });

  connection.on("ReceiveMessage", (message: string) => {
    console.log("ReceiveMessage", message);
    try {
      const parsedMessage = JSON.parse(message);
      store.setState((state) => ({
        messages: [
          ...state.messages,
          {
            text: parsedMessage.text,
            sender: parsedMessage.sender,
            isSystem: false,
          },
        ],
      }));
    } catch (e) {
      // Fallback if message isn't in expected format
      store.setState((state) => ({
        messages: [...state.messages, { text: message, isSystem: false }],
      }));
    }
  });

  connection.on("UserLeft", (connectionId: string) => {
    console.log("UserLeft", connectionId);
    store.setState((state) => {
      return {
        otherUsers: state.otherUsers.filter(
          (x) => x.connectionId != connectionId
        ),
      };
    });
  });

  connection
    .start()
    .then(() => {
      store.setState({ isConnected: true });
    })
    .then(async () => {
      const users = await connection.invoke("ConnectToRoom", roomId, username);
      store.setState((state) => ({
        otherUsers: [...state.otherUsers, ...users],
      }));
    });

  return store;
};

const RoomContext = createContext<StoreApi<RoomStore> | null>(null);

export const RoomStoreProvider = ({
  children,
  hubUrl,
  roomId,
}: React.PropsWithChildren<{ hubUrl: string; roomId: string }>) => {
  const storeRef = useRef<StoreApi<RoomStore>>(null);
  if (!storeRef.current) {
    storeRef.current = createRoomStore(hubUrl, roomId);
  }

  return (
    <RoomContext.Provider value={storeRef.current}>
      {children}
    </RoomContext.Provider>
  );
};

export function useRoomStore<T>(selector: (state: RoomStore) => T): T {
  const store = useContext(RoomContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  return useStore(store, selector);
}

//
//  const createPeerConnection = (userId: string) => {
//     try {
//       const pc = new RTCPeerConnection({
//         iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//       });

//       // Add local tracks to connection
//       if (localStreamRef.current) {
//         localStreamRef.current.getTracks().forEach((track) => {
//           pc.addTrack(track, localStreamRef.current!);
//         });
//       }

//       // Handle ICE candidates
//       pc.onicecandidate = async (event) => {
//         if (event.candidate) {
//           const sdpData: SdpDataModel = {
//             type: "candidate",
//             sdp: event.candidate,
//           };
//           await connection?.invoke("SdpProcess", userId, sdpData);
//         }
//       };

//       // Handle remote tracks
//       pc.ontrack = (event) => {
//         if (remoteVideoRefs.current[userId]) {
//           remoteVideoRefs.current[userId]!.srcObject = event.streams[0];
//         }
//       };

//       peerConnections.current[userId] = pc;

//       // Create and send offer
//       createAndSendOffer(userId, pc);

//       return pc;
//     } catch (err) {
//       console.error("Error creating peer connection:", err);
//       return null;
//     }
//   };

//  const closePeerConnection = (userId: string) => {
//     if (peerConnections.current[userId]) {
//       peerConnections.current[userId].close();
//       delete peerConnections.current[userId];
//     }
//   };

// const createAndSendOffer = async (userId: string, pc: RTCPeerConnection) => {
//   try {
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);

//     const sdpData: SdpDataModel = {
//       type: "offer",
//       sdp: pc.localDescription,
//     };

//     await connection?.invoke("SdpProcess", userId, sdpData);
//   } catch (err) {
//     console.error("Error creating offer:", err);
//   }
// };

// setupEventHandler("UserLeft", (userId: string) => {
//   setParticipants((prev) => prev.filter((id) => id !== userId));
//   closePeerConnection(userId);
// });

// Initialize local media
// useEffect(() => {
//   const initLocalStream = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: isVideoOn,
//         audio: true,
//       });

//       if (localVideoRef.current) {
//         localVideoRef.current.srcObject = stream;
//       }

//       localStreamRef.current = stream;

//       // Connect initial state for audio
//       const audioTrack = stream.getAudioTracks()[0];
//       if (audioTrack) {
//         audioTrack.enabled = true;
//         setIsMicOn(true);
//         console.log("Audio track initialized:", audioTrack.enabled);
//       }
//     } catch (err: any) {
//       console.log(err);
//       console.error("Error accessing media devices:", err);
//       setIsVideoOn(false);
//       setMessages((prev) => [
//         ...prev,
//         {
//           text: `Error accessing camera/microphone: ${err.message.replace(
//             "NotAllowedError:",
//             ""
//           )}`,
//           isSystem: true,
//         },
//       ]);
//     }
//   };

//   if (isConnected && roomId) {
//     initLocalStream();
//   }

//   return () => {
//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach((track) => track.stop());
//     }
//   };
// }, [isConnected, roomId]);
