import {
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import ParticipantCard from "~/components/ParticipantCard";
import { cn } from "~/lib/utils";
import { useRoomStore } from "~/store/room";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isMicOn: boolean;
  setIsMicOn: (isOn: boolean) => void;
  isVideoOn: boolean;
  setIsVideoOn: (isOn: boolean) => void;
  remoteVideoRefs: React.RefObject<{
    [userId: string]: HTMLVideoElement | null;
  }>;
  localStreamRef: React.RefObject<MediaStream | null>;
  // closePeerConnection: (userId: string) => void;
  peerConnections: React.RefObject<{ [key: string]: RTCPeerConnection }>;
  roomId: string;
};

type Control = {
  icon: (isOn?: boolean) => React.ReactNode;
  variant: (
    expression: boolean
  ) => "outline" | "destructive" | "default" | "link" | "secondary" | "ghost";
  onClick: () => void;
  isActive?: boolean;
  isTooltip?: boolean;
};

export default function MeetingArea({ activeTab, setActiveTab }: Props) {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const navigate = useNavigate();

  const participants = useRoomStore((state) => state.otherUsers);
  const username = useRoomStore((state) => state.username);
  const localStream = useRoomStore((state) => state.localStream);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const toggleVideo = useRoomStore((state) => state.toggleVideo);
  const videoEnabled = useRoomStore((state) => state.videoEnabled);
  const toggleMic = useRoomStore((state) => state.toggleMic);
  const micEnabled = useRoomStore((state) => state.micEnabled);

  const handleEndCall = async () => {
    await leaveRoom();
    navigate("/");
  };

  // const copyIdToClipboard = () => {
  //   if (roomId) {
  //     navigator.clipboard
  //       .writeText(roomId)
  //       .then(() => {
  //         setShowCopiedTooltip(true);
  //         setTimeout(() => setShowCopiedTooltip(false), 2000);
  //       })
  //       .catch((err) => {
  //         console.error("Error copying Room ID:", err);
  //       });
  //   }
  // };

  const controls: Control[] = [
    {
      icon: (isOn) => (isOn ? <Mic /> : <MicOff />),
      variant: (isOn: boolean) => (isOn ? "outline" : "destructive"),
      onClick: toggleMic,
      isActive: micEnabled,
    },
    {
      icon: (isOn) => (isOn ? <Video /> : <VideoOff />),
      variant: (isOn: boolean) => (isOn ? "outline" : "destructive"),
      onClick: toggleVideo,
      isActive: videoEnabled,
    },
    // {
    //   icon: () => <Share2 />,
    //   variant: () => "outline",
    //   onClick: copyIdToClipboard,
    //   isTooltip: true,
    // },
    // {
    //   icon: () => <Airplay />,
    //   variant: (isOn: boolean) => (isOn ? "default" : "outline"),
    //   onClick: toggleScreenShare,
    //   isActive: isSharingScreen,
    // },
    {
      icon: () => <MessageSquare />,
      variant: (isOn: boolean) => (isOn ? "default" : "outline"),
      onClick: () => setActiveTab(activeTab === "chat" ? "meeting" : "chat"),
      isActive: activeTab === "chat",
    },
    {
      icon: () => <PhoneOff />,
      variant: () => "destructive",
      onClick: handleEndCall,
    },
  ];

  return (
    <div
      className={`flex-1 p-4 overflow-auto ${
        activeTab === "meeting" || window.innerWidth >= 768
          ? "block"
          : "hidden md:block"
      }`}
    >
      {/* Video grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
        {/* Local video */}
        <ParticipantCard
          hasVideo={videoEnabled}
          stream={localStream}
          name={username}
          muted={true}
        />

        {/* Remote videos */}
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.connectionId}
            name={participant.name}
            hasVideo={participant.videoEnabled}
            muted={false}
            stream={participant.stream}
          />
        ))}
      </div>

      {/* Meeting controls */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex justify-center sm:gap-1 gap-2 md:space-x-3 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full shadow-md px-4 md:px-6 max-w-[95vw] md:max-w-none">
        {controls.map((control, index) => (
          <React.Fragment key={index}>
            {control.isTooltip ? (
              <TooltipProvider>
                <Tooltip open={showCopiedTooltip}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={control.variant(false)}
                      size="icon"
                      onClick={control.onClick}
                      className="rounded-full h-12 w-12 shadow-sm hover:shadow-md transition-all"
                    >
                      {control.icon(false)}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ID copied!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant={control.variant(
                  control.isActive ? control.isActive : false
                )}
                size="icon"
                onClick={control.onClick}
                className={cn(
                  "rounded-full h-12 w-12 shadow-sm hover:shadow-md transition-all",
                  control.variant(
                    control.isActive ? control.isActive : false
                  ) === "destructive"
                    ? "hover:bg-red-600"
                    : "",
                  control.isActive && control.variant(true) === "default"
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : ""
                )}
              >
                {control.icon(control.isActive)}
              </Button>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
