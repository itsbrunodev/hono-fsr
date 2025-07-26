import fs from "node:fs/promises";
import path from "node:path";
import type { DiscoveredRoute } from "./types";
import { transformPathToRoute } from "./utils";

export async function findFilesRecursively(dir: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		const files = await Promise.all(
			entries.map((entry) => {
				const fullPath = path.join(dir, entry.name);
				const normalizedPath = fullPath.replace(/\\/g, "/");

				return entry.isDirectory()
					? findFilesRecursively(normalizedPath)
					: normalizedPath;
			}),
		);

		return files.flat();
	} catch (err) {
		if (err instanceof Error && "code" in err && err.code === "ENOENT") {
			return [];
		}

		throw err;
	}
}

export async function discoverAndSortRoutes(
	root: string,
): Promise<DiscoveredRoute[]> {
	const rootDir = path.resolve(process.cwd(), root);

	const files = await findFilesRecursively(rootDir);

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
