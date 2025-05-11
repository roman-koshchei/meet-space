export interface SdpDataModel {
    type: "offer" | "answer" | "candidate";
    sdp: RTCSessionDescription | RTCIceCandidate | null;
}