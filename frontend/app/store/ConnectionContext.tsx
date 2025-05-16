import React, { createContext, useContext, useEffect, useState } from "react";
import * as SignalR from "@microsoft/signalr";

export interface SignalRContextType {
  connection: SignalR.HubConnection | null;
  isConnected: boolean;
  setupEventHandler: (
    eventName: string,
    callback: (...args: any[]) => void
  ) => void;
  removeEventHandler: (eventName: string) => void;
}

const SignalRContext = createContext<SignalRContextType>({
  connection: null,
  isConnected: false,
  setupEventHandler: () => {},
  removeEventHandler: () => {},
});

export const useSignalR = () => useContext(SignalRContext);

type Props = {
  children: React.ReactNode;
  hubUrl: string;
};

export const SignalRProvider = ({ children, hubUrl }: Props) => {
  const [connection, setConnection] = useState<SignalR.HubConnection>(
    new SignalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build()
  );
  const [isConnected, setIsConnected] = useState(false);

  // Initialize the SignalR connection when the component mounts
  useEffect(() => {
    const createConnection = async () => {
      try {
        // Set up connection state change handler
        connection.onreconnecting(() => {
          console.log("Reconnecting to SignalR hub...");
          setIsConnected(false);
        });

        connection.onreconnected(() => {
          console.log("Reconnected to SignalR hub");
          setIsConnected(true);
        });

        connection.onclose(() => {
          console.log("Connection closed");
          setIsConnected(false);
        });

        // Start the connection
        await connection.start();
        console.log("Connected to SignalR hub!");
        setConnection(connection);
        setIsConnected(true);
      } catch (err) {
        console.error("Error with SignalR connection:", err);
        setIsConnected(false);
      }
    };

    createConnection();

    // Cleanup function
    return () => {
      if (
        connection &&
        connection.state === SignalR.HubConnectionState.Connected
      ) {
        connection.stop().catch((err) => {
          console.error("Error stopping connection:", err);
        });
      }
    };
  }, [hubUrl]);

  // Helper function to set up event handlers
  const setupEventHandler = (
    eventName: string,
    callback: (...args: any[]) => void
  ) => {
    if (!connection) return;

    // Remove any existing handler first to prevent duplicates
    connection.off(eventName);
    // Register the new handler
    connection.on(eventName, callback);
  };

  // Helper function to remove event handlers
  const removeEventHandler = (eventName: string) => {
    if (!connection) return;
    connection.off(eventName);
  };

  const contextValue: SignalRContextType = {
    connection,
    isConnected,
    setupEventHandler,
    removeEventHandler,
  };

  return (
    <SignalRContext.Provider value={contextValue}>
      {children}
    </SignalRContext.Provider>
  );
};
