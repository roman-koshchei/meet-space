import type { WebSocket } from 'ws';

export interface Participant {
    id: string;
    ws: WebSocket;
}

export interface Room {
    id: string;
    participants: Participant[];
}

export class RoomService {
    private rooms: Map<string, Room> = new Map();

    createRoom(): Room {
        const id = Math.random().toString(36).substring(2, 8);
        const room: Room = {
            id,
            participants: []
        };
        this.rooms.set(id, room);
        return room;
    }

    getRoom(id: string): Room | undefined {
        return this.rooms.get(id);
    }

    addParticipant(roomId: string, userId: string, ws: WebSocket): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        
        // Check if participant already exists
        const existingIndex = room.participants.findIndex(p => p.id === userId);
        if (existingIndex !== -1) {
            // Update existing participant's WebSocket
            room.participants[existingIndex].ws = ws;
        } else {
            // Add new participant
            room.participants.push({ id: userId, ws });
        }
        return true;
    }

    removeParticipant(roomId: string, userId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.participants = room.participants.filter(p => p.id !== userId);
        
        // Clean up empty rooms
        if (room.participants.length === 0) {
            this.rooms.delete(roomId);
        }
    }
}

export const roomService = new RoomService(); 