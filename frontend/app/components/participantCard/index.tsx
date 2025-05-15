import {MicOff, Video, VideoOff} from "lucide-react";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {getColorByInitial, getInitials} from "~/helper";
import React from "react";
import {cn} from "~/lib/utils";

type Props = {
    participantId: string;
    remoteVideoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement | null }>;
    peerConnections: React.MutableRefObject<{ [key: string]: RTCPeerConnection }>;
}

export default function ParticipantCard({
    participantId,
    remoteVideoRefs,
    peerConnections,
}: Props) {
    const hasVideo = React.useMemo(() => {
        return remoteVideoRefs.current[participantId]?.srcObject &&
            (remoteVideoRefs.current[participantId]?.srcObject as MediaStream)?.getVideoTracks().length > 0;
    }, [participantId, remoteVideoRefs]);

    const isMuted = React.useMemo(() => {
        return !peerConnections.current[participantId]?.getTransceivers().find(
            transceiver => transceiver.receiver.track?.kind === 'audio' &&
                transceiver.receiver.track.enabled
        );
    }, [participantId, peerConnections]);

    return (
        <div
            key={participantId}
            className="relative rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 aspect-video"
        >
            {/* Video element */}
            <video
                ref={(el) => {
                    if (el) {
                        remoteVideoRefs.current[participantId] = el
                    }
                }}
                autoPlay
                playsInline
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    hasVideo ? "opacity-100" : "opacity-0",
                )}
            />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 pointer-events-none" />

            {/* Avatar fallback when no video */}
            {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                    <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-40 blur-xl" />
                        <Avatar className="h-24 w-24 border-2 border-white dark:border-gray-700 shadow-md">
                            <AvatarFallback className={`text-2xl font-medium ${getColorByInitial(participantId)}`}>
                                {getInitials(participantId)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            )}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                  <span className="text-white font-medium text-sm px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                    {participantId}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Video status indicator */}
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                        {hasVideo ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-white" />}
                    </div>

                    {/* Audio status indicator */}
                    {isMuted && (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/80 backdrop-blur-sm">
                            <MicOff className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}