import { createMiddleware } from "hono/factory";

export default createMiddleware(async (c, next) => {
	if (c.req.header("X-API-Key") !== "secret") {
		return c.text("Unauthorized", 401);
	}
	await next();
});
