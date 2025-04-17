import { Hono } from 'hono';
import { roomService } from './services/room-service';
import { z } from 'zod';
import { validator } from 'hono/validator';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';

export const router = new Hono().basePath('/api');

router.use('/*', cors({
	origin: 'http://localhost:3000',
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	exposeHeaders: ['Content-Length', 'X-Request-Id'],
	maxAge: 86400,
	credentials: true
}));

router.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	console.error(err);
	return c.json({ error: 'Internal Server Error' }, 500);
});

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
