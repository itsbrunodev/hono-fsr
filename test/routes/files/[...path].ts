import { createRoute } from "@/index";

export const GET = createRoute((c) =>
	c.text(c.req.path.replace(/^\/files\//, "")),
);
