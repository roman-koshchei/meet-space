import { Hono } from 'hono';
import { roomService } from './services/room-service';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';

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

router.post('/room',
	zValidator('json', z.object({
		roomId: z.string().optional()
	})),
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
