import { Hono } from 'hono';
import { roomService } from './services/room-service';
import { z } from 'zod';
import { validator } from 'hono/validator';

export const router = new Hono().basePath('/api');

const createRoomSchema = z.object({
	roomId: z.string().optional()
});

router.post('/room',
	validator('json', (value, c) => {
		const parsed = createRoomSchema.safeParse(value);
		if (!parsed.success) {
			return c.json({ error: 'Invalid request body' }, 400);
		}
		return parsed.data;
	}),
	(c) => {
		const { roomId } = c.req.valid('json');
		
		let room;
		if (roomId) {
			room = roomService.getRoom(roomId);
			if (!room) {
				return c.json({ error: 'Room not found' }, 404);
			}
		} else {
			room = roomService.createRoom();
		}
		
		return c.json({ roomId: room.id });
	}
);

export type Router = typeof router;
