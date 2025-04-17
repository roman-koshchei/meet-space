import { WebSocketServer } from 'ws';
import { roomService } from './services/room.service';

export const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
            case 'join':
                currentRoomId = data.roomId;
                currentUserId = data.userId;
                if (currentRoomId && currentUserId) {
                    roomService.addParticipant(currentRoomId, currentUserId, ws);
                }
                break;
            
            case 'message':
                if (currentRoomId) {
                    const room = roomService.getRoom(currentRoomId);
                    if (room) {
                        // Broadcast message to all participants except sender
                        room.participants.forEach((participantWs, userId) => {
                            if (userId !== currentUserId) {
                                participantWs.send(JSON.stringify({
                                    type: 'message',
                                    from: currentUserId,
                                    content: data.content
                                }));
                            }
                        });
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        if (currentRoomId && currentUserId) {
            roomService.removeParticipant(currentRoomId, currentUserId);
        }
    });
}); 