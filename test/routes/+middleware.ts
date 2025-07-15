import { createMiddleware } from "hono/factory";

export default createMiddleware(async (c, next) => {
	c.res.headers.set("X-Root-Middleware", "true");
	await next();
});
