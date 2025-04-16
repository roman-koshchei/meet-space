import { Hono } from 'hono';

export const router = new Hono().basePath('/api').get('/', (c) => {
	return c.text('Hello world!');
});

export type Router = typeof router;
