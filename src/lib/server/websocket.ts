import { roomService } from './services/room-service';
import type { WebSocket as WS } from 'ws';
import { z } from 'zod';
import { router } from './api';
import type { Context } from 'hono';

const joinMessageSchema = z.object({
    type: z.literal('join'),
    roomId: z.string(),
    userId: z.string()
});

const chatMessageSchema = z.object({
    type: z.literal('message'),
    content: z.string()
});

const wsMessageSchema = z.discriminatedUnion('type', [
    joinMessageSchema,
    chatMessageSchema
]);

const errorResponseSchema = z.object({
    type: z.literal('error'),
    message: z.string(),
    errors: z.array(z.any()).optional()
});

const joinedResponseSchema = z.object({
    type: z.literal('joined'),
    roomId: z.string()
});

const messageResponseSchema = z.object({
    type: z.literal('message'),
    from: z.string(),
    content: z.string()
});

const wsResponseSchema = z.discriminatedUnion('type', [
    errorResponseSchema,
    joinedResponseSchema,
    messageResponseSchema
]);

type WSMessage = z.infer<typeof wsMessageSchema>;
type WSResponse = z.infer<typeof wsResponseSchema>;

const sendResponse = (ws: { send: (data: string) => void }, response: WSResponse) => {
    ws.send(JSON.stringify(response));
};


router.get('/ws', (c: Context) => {
    const upgrade = c.req.raw.headers.get('upgrade')?.toLowerCase();
    if (upgrade !== 'websocket') {
        return c.text('Expected Upgrade: websocket', 426);
    }
    
    const { response, socket } = c.env.server.upgrade(c.req.raw);
    
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;
    
    socket.onmessage = (event: MessageEvent) => {
        let data: WSMessage;
        try {
            const parsed = JSON.parse(event.data.toString());
            const result = wsMessageSchema.safeParse(parsed);
            
            if (!result.success) {
                sendResponse(socket, {
                    type: 'error',
                    message: 'Invalid message format',
                    errors: result.error.errors
                });
                return;
            }
            
            data = result.data;
        } catch (error) {
            sendResponse(socket, {
                type: 'error',
                message: 'Failed to parse message',
                errors: [error instanceof Error ? error.message : 'Unknown error']
            });
            return;
        }
        
        switch (data.type) {
            case 'join': {
                currentRoomId = data.roomId;
                currentUserId = data.userId;
                if (currentRoomId && currentUserId) {
                    const success = roomService.addParticipant(currentRoomId, currentUserId, socket as unknown as WS);
                    if (success) {
                        sendResponse(socket, {
                            type: 'joined',
                            roomId: currentRoomId
                        });
                    } else {
                        sendResponse(socket, {
                            type: 'error',
                            message: 'Failed to join room'
                        });
                    }
                }
                break;
            }
            case 'message': {
                if (!currentRoomId) {
                    sendResponse(socket, {
                        type: 'error',
                        message: 'Not joined to any room'
                    });
                    return;
                }

                const room = roomService.getRoom(currentRoomId);
                if (!room) {
                    sendResponse(socket, {
                        type: 'error',
                        message: 'Room not found'
                    });
                    return;
                }

                const messageResponse: WSResponse = {
                    type: 'message',
                    from: currentUserId!,
                    content: data.content
                };

                room.participants.forEach(participant => {
                    if (participant.id !== currentUserId) {
                        sendResponse(participant.ws, messageResponse);
                    }
                });
                break;
            }
        }
    };
    
    socket.onclose = () => {
        if (currentRoomId && currentUserId) {
            roomService.removeParticipant(currentRoomId, currentUserId);
        }
    };
    
    return response;
});