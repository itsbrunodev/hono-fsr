import type { Context } from "hono";
import { createRoute } from "@/index";

export const GET = createRoute((c: Context) => {
	const { id } = c.req.param();

	if (id) {
		return c.json({ hasId: true, id: id });
	}

	return c.json({ hasId: false });
});
