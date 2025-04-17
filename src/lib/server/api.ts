import { Hono } from 'hono';
import { roomService } from './services/room.service';

export const router = new Hono().basePath('/api');

router.post('/room', async (c) => {
	const { roomId } = await c.req.json();
	
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
});

export type Router = typeof router;
