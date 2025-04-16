import { router } from '$lib/server/api';
import type { RequestHandler } from '@sveltejs/kit';

export const fallback: RequestHandler = async ({ request }) => {
	return router.fetch(request);
};
