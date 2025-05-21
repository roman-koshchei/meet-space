import {Mic, MicOff} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getColorByInitial, getInitials } from "~/helper";
import { cn } from "~/lib/utils";

export default function ParticipantCard({
  name,
  stream,
  hasVideo,
  hasMic,
  muted,
}: {
  name: string;
  hasVideo: boolean;
  stream?: MediaStream | null;
  hasMic: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current != null && stream) {
      // console.log("ParticipantCard", videoRef.current, stream);
      videoRef.current.srcObject = stream;
    }
  }, [videoRef.current, stream]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 aspect-video">
      {/* Video element */}

      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          hasVideo ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-40 blur-xl" />
            <Avatar className="h-24 w-24 border-2 border-white dark:border-gray-700 shadow-md">
              <AvatarFallback
                className={`text-2xl font-medium ${getColorByInitial(name)}`}
              >
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium text-sm px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm flex justify-center items-center gap-1 ">
            <span>
              {name}
            </span>
            {hasMic ? <Mic className="w-3.5 h-3.5" />: <MicOff className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>
    </div>
  );
}
