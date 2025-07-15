import { createFactory } from "hono/factory";

const factory = createFactory();
export const createRoute = factory.createHandlers;
export { createMiddleware } from "hono/factory";

export { createRouter } from "@/lib/core";
export type { HonoFsrOptions } from "@/lib/types";
