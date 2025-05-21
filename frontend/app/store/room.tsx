import { createStore, useStore } from "zustand";
import { loadUsername } from "./session";
import * as SignalR from "@microsoft/signalr";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { StoreApi } from "zustand";
import { debugLog } from "~/lib/utils";

type Message = {
  text: string;
  sender?: string;
  isSystem?: boolean;
};

export type User = {
  connectionId: string;
  name: string;
  peerConnection: RTCPeerConnection | null;
  localTracksAreAdded: boolean;
  stream?: MediaStream | null;
  videoEnabled: boolean;
  micEnabled: boolean;
};

type RoomStore = {
  username: string;
  messages: Message[];
  otherUsers: User[];
  roomId: string;

  connection: SignalR.HubConnection;
  isConnected: boolean;

  // localPeerConnection: RTCPeerConnection;
  localStream: MediaStream | null | undefined;
  videoEnabled: boolean;
  toggleVideo: () => Promise<void>;
  micEnabled: boolean;
  toggleMic: () => Promise<void>;

  sendMessage: (message: string) => Promise<void>;

  leaveRoom: () => Promise<void>;
};

const createRoomStore = (hubUrl: string, roomId: string) => {
  const username = loadUsername() ?? "Guest";

  window.addEventListener("error", (event) => {
    console.error("Global Error:", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  const connection = new SignalR.HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .build();

  const store = createStore<RoomStore>((set, get) => ({
    username: username,
    messages: [],
    otherUsers: [],
    roomId: roomId,

    connection,
    isConnected: false,

    localStream: null,

    sendMessage: async (message) => {
      debugLog("SendMessage", roomId, message);

      await connection.send(
          "SendMessage",
          roomId,
          JSON.stringify({text: message, sender: username})
      );
      set((state) => ({
        messages: [
          ...state.messages,
          { text: message, sender: username, isSystem: false },
        ],
      }));
    },

    leaveRoom: async () => {
      await connection.send("LeaveRoom");
      if (connection.state === SignalR.HubConnectionState.Connected) {
        connection.stop();
        set(() => ({ isConnected: false }));
      }

      const state = get();
      state.otherUsers.forEach((user) => {
        if (user.peerConnection) {
          user.peerConnection.close();
        }
      });
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }
      set(() => ({
        messages: [],
        otherUsers: [],
        localStream: null,
        videoEnabled: false,
        micEnabled: false,
      }));
    },

    videoEnabled: false,
    toggleVideo: async () => {
      const state = store.getState();
      if (state.localStream) {
        const newEnabled = !state.videoEnabled;
        state.localStream.getVideoTracks().forEach((track) => {
          track.enabled = newEnabled;
        });
        set(() => ({ videoEnabled: newEnabled }));
        await connection.send("SendVideoStatus", roomId, newEnabled);
      }
    },

    micEnabled: false,
    toggleMic: async () => {
      const state = store.getState();
      if (state.localStream) {
        const newEnabled = !state.micEnabled;
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = newEnabled;
        });
        set(() => ({ micEnabled: newEnabled }));
        await connection.send("SendMicStatus", roomId, newEnabled);
      }
    },
  }));

  connection.onreconnecting(() => {
    debugLog("Reconnecting to SignalR hub...");
    store.setState({ isConnected: false });
  });

  connection.onreconnected(() => {
    debugLog("Reconnected to SignalR hub");
    store.setState({ isConnected: true });
  });

  connection.onclose(() => {
    debugLog("Connection closed");
    store.setState({ isConnected: false });
  });

  connection.on(
    "ReceiveVideoStatus",
    (connectionId: string, enabled: boolean) => {
      store.setState((state) => ({
        otherUsers: state.otherUsers.map((x) => {
          if (x.connectionId === connectionId) {
            x.videoEnabled = enabled;
          }
          return x;
        }),
      }));
    }
  );

  connection.on(
      "ReceiveMicStatus",
      (connectionId: string, enabled: boolean) => {
        store.setState((state) => ({
          otherUsers: state.otherUsers.map((x) => {
            if (x.connectionId === connectionId) {
              x.micEnabled = enabled;
            }
            return x;
          }),
        }));
      }
  );

  connection.on("UserJoinedRoom", (connectionId: string, name: string, micEnabled: boolean, videoEnabled: boolean) => {
    debugLog("UserJoinedRoom", connectionId, name);
    store.setState((state) => ({
      messages: [
        ...state.messages,
        { text: `${name} has joined the room!`, isSystem: true },
      ],
      otherUsers: [
        ...state.otherUsers,
        {
          connectionId,
          name,
          videoEnabled,
          micEnabled,
          peerConnection: createPeerConnection(connectionId),
          localTracksAreAdded: false
        },
      ],
    }));
  });

  connection.on("ReceiveMessage", (message: string) => {
    debugLog("ReceiveMessage", message);
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
    debugLog("UserLeft", connectionId);
    store.setState((state) => {
      return {
        otherUsers: state.otherUsers.filter(
          (x) => x.connectionId != connectionId
        ),
      };
    });
  });

  const createPeerConnection = (connectionId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
      ],
    });

    pc.addEventListener("negotiationneeded", async () => {
      // debugLog("negotiationneeded");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await connection.send(
        "SendOffer",
        connectionId,
        JSON.stringify(pc.localDescription)
      );
    });

    pc.addEventListener("icecandidate", async (event) => {
      // debugLog("icecandidate");
      if (event.candidate) {
        await connection.send(
          "SendIceCandidate",
          connectionId,
          JSON.stringify(event.candidate)
        );
      }
    });

    pc.addEventListener("track", async (event) => {
      // debugLog("track");
      store.setState((state) => ({
        otherUsers: state.otherUsers.map((x) => {
          if (x.connectionId === connectionId) {
            debugLog(x.connectionId, event.streams[0]);
            x.stream = event.streams[0];
          }
          return x;
        }),
      }));
    });

    return pc;
  };

  connection.on(
    "ReceiveIceCandidate",
    async (fromConnectionId: string, candidateData: string) => {
      // debugLog("ReceiveIceCandidate", fromConnectionId, candidateData);

      const candidate = new RTCIceCandidate(JSON.parse(candidateData));
      const user = store
        .getState()
        .otherUsers.find((x) => x.connectionId === fromConnectionId);

      if (user && user.peerConnection) {
        user.peerConnection.addIceCandidate(candidate);
      }
    }
  );

  connection.on(
    "ReceiveOffer",
    async (fromConnectionId: string, sdpData: string) => {
      // debugLog("ReceiveOffer", fromConnectionId);

      const user = store
        .getState()
        .otherUsers.find((x) => x.connectionId === fromConnectionId);

      if (!user) {
        // TODO: sync
        return;
      }

      if (!user.peerConnection) {
        user.peerConnection = createPeerConnection(connection.connectionId!);
      }

      const sdp = new RTCSessionDescription(JSON.parse(sdpData));
      await user.peerConnection.setRemoteDescription(sdp);
      const answer = await user.peerConnection.createAnswer();
      await user.peerConnection.setLocalDescription(answer);
      await connection.send(
        "SendAnswer",
        fromConnectionId,
        JSON.stringify(user.peerConnection.localDescription)
      );
    }
  );

  connection.on(
    "ReceiveAnswer",
    async (fromConnectionId: string, answerData: string) => {
      // debugLog("ReceiveAnswer", fromConnectionId);

      const description = new RTCSessionDescription(JSON.parse(answerData));

      const user = store
        .getState()
        .otherUsers.find((x) => x.connectionId === fromConnectionId);
      if (user && user.peerConnection) {
        user.peerConnection.setRemoteDescription(description);
      }
    }
  );

  connection
    .start()
    .then(() => {
      store.setState({ isConnected: true });
    })
    .then(async () => {
      const users: { connectionId: string; name: string; micEnabled: boolean; videoEnabled: boolean }[] =
          await connection.invoke("ConnectToRoom", roomId, username, false, false);

      debugLog("users", users);

      store.setState((state) => ({
        otherUsers: [
          ...state.otherUsers,
          ...users.map((x) => ({
            connectionId: x.connectionId,
            name: x.name,
            localTracksAreAdded: false,
            peerConnection: createPeerConnection(x.connectionId),
            videoEnabled: x.videoEnabled,
            micEnabled: x.micEnabled,
          })),
        ],
      }));
    });

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      // Initially disable tracks
      stream.getTracks().forEach((track) => {
        track.enabled = false;
      });
      store.setState(() => ({
        localStream: stream,
        videoEnabled: false,
        micEnabled: false,
      }));
    });

  store.subscribe((state) => {
    if (!state.localStream) return;
    const tracks = state.localStream.getTracks();

    for (const user of state.otherUsers) {
      if (user.peerConnection && !user.localTracksAreAdded) {
        for (const track of tracks) {
          user.peerConnection.addTrack(track, state.localStream);
          user.localTracksAreAdded = true;
        }
      }
    }
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

  useEffect(() => {
    debugLog(storeRef.current);

    return () => {
      debugLog("RoomStoreProvider dismounted");
    };
  }, [storeRef.current]);

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
