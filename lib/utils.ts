import path from "node:path";
import type { DiscoveredRoute, HonoFsrOptions } from "./types";

const VALID_EXTENSIONS = [".ts", ".mts", ".js", ".mjs", ".cjs"];

function calculatePrecedence(urlPath: string): number {
	if (urlPath.includes("*")) return 3;
	if (urlPath.includes("?")) return 2; // Optional routes have the same precedence as dynamic
	if (urlPath.includes(":")) return 2;
	return 1;
}

/**
 * Joins URL path segments and applies trailing slash logic.
 * @param trailingSlash The desired trailing slash behavior.
 * @param segments The URL segments to join.
 */
export function joinUrl(
	trailingSlash: HonoFsrOptions["trailingSlash"],
	...segments: string[]
): string {
	// filter out segments that are empty, null, or just the root slash, as they are redundant
	const cleanSegments = segments.filter((s) => s && s !== "/");

	if (cleanSegments.length === 0) {
		return "/";
	}

	// join the clean segments and normalize.
	let urlPath = `/${cleanSegments.join("/")}`
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");

	// if cleaning results in an empty string, it's the root
	if (urlPath === "") {
		urlPath = "/";
	}

	// apply the trailing slash rule definitively
	const lastOriginalSegment = segments[segments.length - 1];

	if (
		(trailingSlash === "always" && urlPath !== "/") ||
		(trailingSlash === "preserve" &&
			lastOriginalSegment &&
			lastOriginalSegment.length > 1 &&
			lastOriginalSegment.endsWith("/"))
	) {
		// add a slash if "always" is set (and not for the root) OR
		// if "preserve" is set and the original last part had a slash.
		urlPath += "/";
	}
	// for "never", the slash was already removed, so no action is needed

	return urlPath;
}

export function transformPathToRoute(
	rootDir: string,
	filePath: string,
): DiscoveredRoute | null {
	if (filePath.endsWith(".d.ts")) {
		return null;
	}

	const ext = path.extname(filePath);
	if (!VALID_EXTENSIONS.includes(ext)) {
		return null;
	}

	const relativePath = path.relative(rootDir, filePath);
	const baseName = path.basename(relativePath, ext);

	// ignore files that start with an underscore
	if (baseName.startsWith("_")) {
		return null;
	}

	const dirName = path.dirname(relativePath);
	const isMiddleware = baseName === "+middleware";

	let urlPath: string;

	if (dirName === ".") {
		urlPath = "/";
	} else {
		const pathSegments = dirName
			.replace(/\\/g, "/")
			.split("/")
			.filter((segment) => !/^\(.*\)$/.test(segment));
		urlPath = `/${pathSegments.join("/")}`;
	}

	if (!isMiddleware && baseName !== "index") {
		urlPath = path.join(urlPath, baseName);
	}

	urlPath = urlPath
		.replace(/\\/g, "/")
		.replace(/\[\.\.\.(.*?)\]/g, "*")
		.replace(/\[\[(.*?)\]\]/g, ":$1?") // turns [[param]] into :param?
		.replace(/\[(.*?)\]/g, ":$1"); // turns [param] into :param

	// Final cleanup
	urlPath = urlPath.replace(/\/+/g, "/");
	if (urlPath.length > 1 && urlPath.endsWith("/")) {
		urlPath = urlPath.slice(0, -1);
	}

	if (urlPath === "") {
		urlPath = "/";
	}

	return {
		filePath,
		urlPath,
		type: isMiddleware ? "middleware" : "handler",
		precedence: isMiddleware ? 0 : calculatePrecedence(urlPath),
	};
}
