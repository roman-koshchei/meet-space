import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const debugLog =
  import.meta.env.VITE_DEBUG === "true"
    ? (message?: any, ...optionalParams: any[]) => {
        console.log(message, ...optionalParams);
      }
    : (_message?: any, ..._optionalParams: any[]) => {};
