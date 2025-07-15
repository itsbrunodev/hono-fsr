import { describe, test, expect } from "@jest/globals";
import { Hono } from "hono";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRouter } from "@/index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, "routes");

describe("hono-fsr", () => {
	test("should register a static GET route from index.ts", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("Hello from index");
	});

	test("should register multiple methods from a single file", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const getRes = await app.request("/contact", { method: "GET" });
		expect(getRes.status).toBe(200);
		expect(await getRes.text()).toBe("Contact form");

		const postRes = await app.request("/contact", { method: "POST" });
		expect(postRes.status).toBe(200);
		expect(await postRes.json()).toEqual({ message: "Received" });
	});

	test("should handle dynamic routes with parameters", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/users/123");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ userId: "123" });
	});

	test("should handle catch-all routes", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/files/images/avatars/me.jpg");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("images/avatars/me.jpg");
	});

	test("should ignore folders wrapped in parentheses (Route Groups)", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/about");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("About Us");
	});

	test("should correctly apply nested middleware", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res1 = await app.request("/protected/dashboard");
		expect(res1.status).toBe(401);

		const res2 = await app.request("/protected/dashboard", {
			headers: { "X-API-Key": "secret" },
		});
		expect(res2.status).toBe(200);
		expect(res2.headers.get("X-Root-Middleware")).toBe("true");
	});

	test("should prioritize static routes over dynamic routes", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/users/create");
		expect(res.status).toBe(200);
	});

	test("should handle a default export as a GET request", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		const res = await app.request("/default");
		expect(res.status).toBe(200);
	});

	test("should handle optional parameters", async () => {
		const app = new Hono();
		await createRouter(app, { root: routesDir });

		// Test case 1: Request WITHOUT the parameter
		const res1 = await app.request("/optional");
		expect(res1.status).toBe(200);
		expect(await res1.json()).toEqual({ hasId: false });

		// Test case 2: Request WITH the parameter
		const res2 = await app.request("/optional/456");
		expect(res2.status).toBe(200);
		expect(await res2.json()).toEqual({ hasId: true, id: "456" });
	});
});
