import { WebSocket } from 'ws';

export interface Room {
    id: string;
    participants: Map<string, WebSocket>;
}

export class RoomService {
    private rooms: Map<string, Room> = new Map();

    createRoom(): Room {
        const id = Math.random().toString(36).substring(2, 8);
        const room: Room = {
            id,
            participants: new Map()
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
        
        room.participants.set(userId, ws);
        return true;
    }

    removeParticipant(roomId: string, userId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.participants.delete(userId);
        
        // Clean up empty rooms
        if (room.participants.size === 0) {
            this.rooms.delete(roomId);
        }
    }
}

export const roomService = new RoomService(); 