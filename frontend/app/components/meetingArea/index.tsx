import {Airplay, MessageSquare, Mic, MicOff, PhoneOff, Share2, Video, VideoOff} from "lucide-react";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {Button} from "~/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";
import {getColorByInitial, getInitials} from "~/helper";
import React, {useState} from "react";
import { useNavigate } from "react-router";
import ParticipantCard from "~/components/participantCard";
import {cn} from "~/lib/utils";

type Props = {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    username: string;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    isMicOn: boolean;
    setIsMicOn: (isOn: boolean) => void;
    isVideoOn: boolean;
    setIsVideoOn: (isOn: boolean) => void;
    participants: string[];
    remoteVideoRefs: React.RefObject<{ [userId: string]: HTMLVideoElement | null }>;
    localStreamRef: React.RefObject<MediaStream | null>;
    closePeerConnection: (userId: string) => void;
    peerConnections: React.RefObject<{ [key: string]: RTCPeerConnection }>;
    roomId: string;
}

type Control = {
    icon: (isOn?: boolean) => React.ReactNode;
    variant: (expression: boolean) => "outline" | "destructive" | "default" | "link" | "secondary" | "ghost";
    onClick: () => void;
    isActive?: boolean;
    isTooltip?: boolean;
}

export default function MeetingArea({
    activeTab,
    setActiveTab,
    username,
    localVideoRef,
    isMicOn,
    setIsMicOn,
    isVideoOn,
    setIsVideoOn,
    participants,
    remoteVideoRefs,
    localStreamRef,
    closePeerConnection,
    peerConnections,
    roomId
}: Props){
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const navigate = useNavigate();

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
        if (!isSharingScreen) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                const screenTrack = screenStream.getVideoTracks()[0];

                Object.values(peerConnections.current).forEach((pc: any) => {
                    const sender = pc.getSenders().find((s: RTCRtpSender) =>
                        s.track?.kind === "video"
                    );
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                screenTrack.addEventListener('ended', async () => {
                    setIsSharingScreen(false);
                    if (isVideoOn && localStreamRef.current) {
                        const videoTrack = localStreamRef.current.getVideoTracks()[0];
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = localStreamRef.current;
                        }
                        Object.values(peerConnections.current).forEach((pc: any) => {
                            const sender = pc.getSenders().find((s: RTCRtpSender) =>
                                s.track?.kind === "video"
                            );
                            if (sender && videoTrack) {
                                sender.replaceTrack(videoTrack);
                            }
                        });
                    }
                });

                setIsSharingScreen(true);
            } catch (err) {
                console.error("Error sharing screen:", err);
                setIsSharingScreen(false);
            }
        } else {
            await stopScreenSharing();
            setIsSharingScreen(false);
        }
    };

    const stopScreenSharing = async () => {
        if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;

            const videoTrack = localStreamRef.current.getVideoTracks()[0];

            await Promise.all(Object.values(peerConnections.current).map(async (pc: any) => {
                const sender = pc.getSenders().find((s: RTCRtpSender) =>
                    s.track?.kind === "video"
                );
                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            }));
        }
    };

    const handleEndCall = () => {
        // Stop all media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }

        // Close all peer connections
        Object.keys(peerConnections.current).forEach(userId => {
            closePeerConnection(userId);
        });

        navigate("/");
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

    const controls: Control[] = [
        {
            icon: (isOn: boolean | undefined) => isOn ? <Mic /> : <MicOff />,
            variant: (isOn: boolean) => isOn ? "outline" : "destructive",
            onClick: toggleMic,
            isActive: isMicOn
        },
        {
            icon: (isOn: boolean | undefined) => isOn ? <Video /> : <VideoOff />,
            variant: (isOn: boolean) => isOn ? "outline" : "destructive",
            onClick: toggleVideo,
            isActive: isVideoOn
        },
        {
            icon: () => <Share2 />,
            variant: () => "outline",
            onClick: copyIdToClipboard,
            isTooltip: true
        },
        {
            icon: () => <Airplay />,
            variant: (isOn: boolean) => isOn ? "default" : "outline",
            onClick: toggleScreenShare,
            isActive: isSharingScreen
        },
        {
            icon: () => <MessageSquare />,
            variant: (isOn: boolean) => isOn ? "default" : "outline",
            onClick: () => setActiveTab(activeTab === "chat" ? "meeting" : "chat"),
            isActive: activeTab === "chat"
        },
        {
            icon: () => <PhoneOff />,
            variant: () => "destructive",
            onClick: handleEndCall
        }
    ];

    return (
        <div
            className={`flex-1 p-4 overflow-auto ${
                activeTab === "meeting" || window.innerWidth >= 768 ? "block" : "hidden md:block"
            }`}
        >
            {/* Video grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
                {/* Local video */}
                <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-900 aspect-video">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cn(
                            "w-full h-full object-cover transform scale-x-[-1]",
                            isVideoOn || isSharingScreen ? "opacity-100" : "opacity-0",
                        )}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 pointer-events-none" />

                    <div className="absolute top-3 left-3">
                        <div className="px-2 py-1 bg-blue-500/20 backdrop-blur-sm rounded-md text-xs text-white font-medium">
                            Your View
                        </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between z-10">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium text-sm px-3 py-1 rounded-full bg-blue-500/70 backdrop-blur-sm">
                            {username} (You)
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm",
                                    isMicOn ? "bg-black/40" : "bg-red-500/80",
                                )}
                            >
                                {isMicOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
                            </div>

                            <div
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm",
                                    isVideoOn ? "bg-black/40" : "bg-red-500/80",
                                )}
                            >
                                {isVideoOn ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                    </div>

                    {!isVideoOn && !isSharingScreen && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                            <div className="relative">
                                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 blur-xl animate-pulse" />
                                <Avatar className="h-24 w-24 border-2 border-white dark:border-gray-700 shadow-md">
                                    <AvatarFallback className={`text-2xl font-medium ${getColorByInitial(username)}`}>
                                        {getInitials(username)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    )}
                </div>

                {/* Remote videos */}
                {participants.map((participantId: string) => (
                    <ParticipantCard
                        key={participantId}
                        participantId={participantId}
                        remoteVideoRefs={remoteVideoRefs as any}
                        peerConnections={peerConnections as any}
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
                                variant={control.variant(control.isActive ? control.isActive : false)}
                                size="icon"
                                onClick={control.onClick}
                                className={cn(
                                    "rounded-full h-12 w-12 shadow-sm hover:shadow-md transition-all",
                                    control.variant(control.isActive ? control.isActive : false) === "destructive"
                                        ? "hover:bg-red-600"
                                        : "",
                                    control.isActive && control.variant(true) === "default"
                                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                                        : "",
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