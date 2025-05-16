import { MicOff, TruckIcon, Video, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { getColorByInitial, getInitials } from "~/helper";
import React from "react";
import { cn } from "~/lib/utils";

export default function ParticipantCard({ name }: { name: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 aspect-video">
      {/* Video element */}
      {/* <video
        ref={(el) => {
          if (el) {
            remoteVideoRefs.current[participantId] = el;
          }
        }}
        autoPlay
        playsInline
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          hasVideo ? "opacity-100" : "opacity-0"
        )}
      /> */}

      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 pointer-events-none" />

      {/* Avatar fallback when no video */}
      {true && (
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
          <span className="text-white font-medium text-sm px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            {name}
          </span>
        </div>
      </div>
    </div>
  );
}
