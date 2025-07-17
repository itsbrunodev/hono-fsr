import type { MiddlewareHandler } from "hono";

export const VALID_METHODS = [
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"HEAD",
	"OPTIONS",
] as const;
export type HttpMethod = (typeof VALID_METHODS)[number];
export type HonoMethod = Lowercase<HttpMethod>;

export interface HonoFsrOptions {
	/**
	 * The root directory of the routes.
	 * @example path.join(__dirname, "routes")
	 */
	root: string;
	/**
	 * Enable verbose logging for debugging.
	 * @default false
	 */
	debug?: boolean;
	/**
	 * A path prefix for all routes.
	 * @example "/api/v1"
	 */
	basePath?: string;
	/**
	 * Defines the trailing slash behavior for all routes.
	 * - `always`: Adds a trailing slash. `/users` -> `/users/`
	 * - `never`: Removes any trailing slash. `/users/` -> `/users`
	 * - `preserve`: Keeps the original slash behavior.
	 * @default "preserve"
	 */
	trailingSlash?: "always" | "never" | "preserve";
	/**
	 * Enable generating an `rpc.d.ts` file for the routes, allows sharing of the API specifications between the server and the client.
	 * @link https://hono.dev/docs/guides
	 * @default false
	 */
	rpc?: boolean;
}

export interface DiscoveredRoute {
	filePath: string;
	urlPath: string;
	type: "handler" | "middleware";
	precedence: number;
}

export type RouteModule = {
	[M in HttpMethod]?: MiddlewareHandler;
} & {
	default?: MiddlewareHandler;
};

export type MiddlewareModule = {
	default: MiddlewareHandler;
};

export interface SuccessResult {
	status: "success";
	route: DiscoveredRoute;
	// biome-ignore lint/suspicious/noExplicitAny: This is a dynamic module import
	module: any;
}

export interface ErrorResult {
	status: "error";
	route: DiscoveredRoute;
	error: unknown;
}

export type ImportResult = SuccessResult | ErrorResult;
