import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Hono } from "hono";
import { discoverAndSortRoutes } from "./discovery";
import { dim, logger } from "./logger";
import { generateRpcTypes } from "./rpc";
import {
	type DiscoveredRoute,
	type ErrorResult,
	type HonoFsrOptions,
	type HttpMethod,
	type Manifest,
	type ManifestRoute,
	type SuccessResult,
	VALID_METHODS,
} from "./types";
import { joinUrl } from "./utils";

function performRegistration(
	app: Hono,
	route: DiscoveredRoute,
	// biome-ignore lint/suspicious/noExplicitAny: dynamic import
	module: any,
	basePath: string,
	trailingSlash: HonoFsrOptions["trailingSlash"],
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
				logger.debug(`Registered ${dim("MIDDLEWARE")} ${middlewarePath}`);
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
					logger.debug(`Registered ${dim(method)} ${finalRoutePath}`);
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

async function registerRoutesFromManifest(
	app: Hono,
	manifest: Manifest,
	basePath: string,
	trailingSlash: HonoFsrOptions["trailingSlash"],
	debug?: boolean,
) {
	if (debug) {
		logger.debug("Registering routes from pre-generated manifest...");
	}

	for (const route of manifest) {
		performRegistration(
			app,
			route,
			route.module,
			basePath,
			trailingSlash,
			debug,
		);
	}
}

async function registerRoutesFromFileSystem(
	app: Hono,
	root: string,
	basePath: string,
	trailingSlash: HonoFsrOptions["trailingSlash"],
	debug?: boolean,
) {
	if (debug) {
		logger.debug("Discovering routes from file system...");
		logger.debug(`Root directory set to ${root}`);
	}

	const sortedRoutes = await discoverAndSortRoutes(root);

	const registrationPromises = sortedRoutes.map(async (route) => {
		try {
			const module = await import(
				/* @vite-ignore */ pathToFileURL(route.filePath).href
			);
			performRegistration(app, route, module, basePath, trailingSlash, debug);

			return { status: "success", route } as SuccessResult;
		} catch (error) {
			logger.error(`Failed to import or register route at ${route.filePath}`);

			if (error instanceof Error) console.error(error.stack);
			else console.error(error);

			return { status: "error", route, error } as ErrorResult;
		}
	});

	await Promise.allSettled(registrationPromises);

	return sortedRoutes;
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
export async function createRouter<T extends Hono>(
	app: T,
	options: HonoFsrOptions,
): Promise<void> {
	const start = performance.now();

	const {
		root,
		manifest,
		debug = false,
		basePath = "/",
		trailingSlash = "preserve",
		rpc = false,
	} = options;

	if (debug) {
		logger.debug("Initializing routes...");
	}

	let resolvedRoutes: (DiscoveredRoute | ManifestRoute)[] = [];

	if (manifest) {
		// bundler
		await registerRoutesFromManifest(
			app,
			manifest,
			basePath,
			trailingSlash,
			debug,
		);

		resolvedRoutes = manifest;
	} else if (root) {
		// file system
		resolvedRoutes = await registerRoutesFromFileSystem(
			app,
			root,
			basePath,
			trailingSlash,
			debug,
		);
	} else {
		throw new Error('Either "root" or "manifest" option must be provided.');
	}

	if (rpc) {
		if (!root) {
			logger.warn(
				'Cannot generate RPC types without a "root" directory specified.',
			);
		} else {
			try {
				const rpcTypesContent = await generateRpcTypes(
					resolvedRoutes as DiscoveredRoute[],
					root,
				);
				const typesFilePath = path.join(
					path.resolve(process.cwd(), root),
					"_rpc.d.ts",
				);

				let existingContent = "";

				try {
					existingContent = await fs.readFile(typesFilePath, "utf-8");
				} catch (err) {
					if (err instanceof Error && "code" in err && err.code !== "ENOENT") {
						logger.error("Failed to read existing RPC types file.");
						console.error(err);
					}
				}

				// only write the file if the content has changed
				if (existingContent !== rpcTypesContent) {
					await fs.writeFile(typesFilePath, rpcTypesContent);

					if (debug) {
						logger.debug(
							`Generated or updated RPC types file at ${typesFilePath}`,
						);
					}
				} else {
					if (debug) {
						logger.debug("RPC types are already up to date.");
					}
				}
			} catch (error) {
				logger.error("Failed to generate RPC types file.");

				if (error instanceof Error) {
					console.error(error.stack);
				} else {
					console.error(error);
				}
			}
		}
	}

	const elapsed = (performance.now() - start).toFixed(2);

	if (debug) {
		logger.debug(`Registered ${resolvedRoutes.length} routes in ${elapsed}ms.`);
	}
}
