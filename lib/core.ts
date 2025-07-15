import path from "node:path";
import { pathToFileURL } from "node:url";
import chalk from "chalk";
import { glob } from "glob";
import type { Hono } from "hono";
import { logger } from "./logger";
import {
	type DiscoveredRoute,
	type HonoFsrOptions,
	type HttpMethod,
	type ImportResult,
	type SuccessResult,
	VALID_METHODS,
} from "./types";
import { joinUrl, transformPathToRoute } from "./utils";

async function discoverAndSortRoutes(root: string): Promise<DiscoveredRoute[]> {
	const rootDir = path.resolve(process.cwd(), root);
	const pattern = path.join(rootDir, "**", "*").replace(/\\/g, "/");

	const files = await glob(pattern, { nodir: true });

	const routes: DiscoveredRoute[] = files
		.map((file) => transformPathToRoute(rootDir, file))
		.filter((route): route is DiscoveredRoute => route !== null);

	routes.sort((a, b) => {
		if (a.type === "middleware" && b.type !== "middleware") return -1;
		if (a.type !== "middleware" && b.type === "middleware") return 1;
		if (a.type === "middleware" && b.type === "middleware") {
			return a.urlPath.length - b.urlPath.length;
		}
		return a.precedence - b.precedence;
	});

	return routes;
}

function performRegistration(
	app: Hono,
	route: DiscoveredRoute,
	// biome-ignore lint/suspicious/noExplicitAny: dynamic import
	module: any,
	basePath: string,
	trailingSlash: HonoFsrOptions["trailingSlash"], // <-- NEW: Pass trailingSlash down
	debug?: boolean,
): void {
	const finalRoutePath = joinUrl(trailingSlash, basePath, route.urlPath);

	if (route.type === "middleware") {
		const handler = module.default;

		if (typeof handler === "function") {
			const middlewarePath =
				finalRoutePath === "/" ? "/*" : `${finalRoutePath}/*`;

			app.use(middlewarePath, handler);

			if (debug) {
				logger.debug(`Registered ${chalk.dim("MIDDLEWARE")} ${middlewarePath}`);
			}
		} else {
			logger.warn(`No default export found in ${route.filePath}.`);
		}
		return;
	}

	if (route.type === "handler") {
		let registeredMethod = false;

		// biome-ignore lint/suspicious/noExplicitAny: <>
		const applyRoute = (method: HttpMethod, handlerOrArray: any) => {
			if (!handlerOrArray) return; // skip if the export doesn't exist

			// ensure we have an array of handlers to pass to Hono
			const handlers = Array.isArray(handlerOrArray)
				? handlerOrArray
				: [handlerOrArray];

			if (handlers.length > 0) {
				// pass the chain of handlers to Hono
				app.on(method, finalRoutePath, ...handlers);

				if (debug) {
					logger.debug(`Registered ${chalk.dim(method)} ${finalRoutePath}`);
				}

				registeredMethod = true;
			}
		};

		// apply the logic for all named exports
		for (const method of VALID_METHODS) {
			applyRoute(method, module[method as HttpMethod]);
		}

		// apply for default export if no named GET exists
		if (!module.GET) {
			applyRoute("GET", module.default);
		}

		if (!registeredMethod) {
			logger.warn(`No valid handlers exported in ${route.filePath}.`);
		}
	}
}

/**
 * Creates a file-system router from a directory of routes and registers them to the provided Hono app.
 * @param app Hono
 * @param options HonoFsrOptions
 * @async
 * @example
 * const app = new Hono();
 *
 * const __dirname = path.dirname(fileURLToPath(import.meta.url));
 *
 * createRouter(app, {
 *   root: path.join(__dirname, "routes")
 * });
 */
export async function createRouter(
	app: Hono,
	options: HonoFsrOptions,
): Promise<void> {
	const start = performance.now();

	const { root, basePath = "/", trailingSlash = "preserve", debug } = options;

	if (debug) {
		logger.debug("Initializing routes...");
	}

	if (debug) {
		logger.debug(`Root directory set to ${root}`);
	}

	const sortedRoutes = await discoverAndSortRoutes(root);

	const importPromises = sortedRoutes.map((route): Promise<ImportResult> => {
		return import(pathToFileURL(route.filePath).href)
			.then((module) => ({ status: "success", route, module }) as SuccessResult)
			.catch((error: unknown) => ({ status: "error", route, error }));
	});

	// wait for all modules to be imported concurrently.
	const loadedRoutes = await Promise.all(importPromises);

	for (const result of loadedRoutes) {
		if (result.status === "success") {
			performRegistration(
				app,
				result.route,
				result.module,
				basePath,
				trailingSlash,
				debug,
			);
		} else {
			logger.error(
				`Failed to import or register route at ${result.route.filePath}`,
			);
			const error = result.error;
			if (error instanceof Error) {
				console.error(error.stack);
			} else {
				console.error(error);
			}
		}
	}

	const elapsed = (performance.now() - start).toFixed(2);

	if (debug) {
		logger.debug(`Registered ${sortedRoutes.length} routes in ${elapsed}ms.`);
	}
}
