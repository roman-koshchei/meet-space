import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { roomService } from './services/room-service';
import type { WebSocket as WS } from 'ws';
import { z } from 'zod';

// Message schemas
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

// Response schemas
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

export const wsApp = new Hono();

const { upgradeWebSocket, websocket } = createBunWebSocket();

wsApp.get('/ws', upgradeWebSocket((c) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    return {
        onMessage(message, ws) {
            let data: WSMessage;
            try {
                const parsed = JSON.parse(message.toString());
                const result = wsMessageSchema.safeParse(parsed);
                
                if (!result.success) {
                    sendResponse(ws, {
                        type: 'error',
                        message: 'Invalid message format',
                        errors: result.error.errors
                    });
                    return;
                }
                
                data = result.data;
            } catch (error) {
                sendResponse(ws, {
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
                        const success = roomService.addParticipant(currentRoomId, currentUserId, ws as unknown as WS);
                        if (success) {
                            sendResponse(ws, {
                                type: 'joined',
                                roomId: currentRoomId
                            });
                        } else {
                            sendResponse(ws, {
                                type: 'error',
                                message: 'Failed to join room'
                            });
                        }
                    }
                    break;
                }
                case 'message': {
                    if (!currentRoomId) {
                        sendResponse(ws, {
                            type: 'error',
                            message: 'Not joined to any room'
                        });
                        return;
                    }

                    const room = roomService.getRoom(currentRoomId);
                    if (!room) {
                        sendResponse(ws, {
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
        },
        onClose() {
            if (currentRoomId && currentUserId) {
                roomService.removeParticipant(currentRoomId, currentUserId);
            }
        }
    };
}));

export default {
    fetch: wsApp.fetch,
    websocket
}; 