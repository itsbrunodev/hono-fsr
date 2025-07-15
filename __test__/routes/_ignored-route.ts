import { createRoute } from "@/index";

export const GET = createRoute((c) => {
	return c.text("This file should not be reachable");
});
