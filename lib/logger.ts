const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	blue: "\x1b[34m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
};

const prefix = `${colors.bold}${colors.cyan}[hono-fsr]${colors.reset}`;

export function dim(text: string): string {
	return `${colors.dim}${text}${colors.reset}`;
}

export const logger = {
	info(...message: string[]): void {
		console.log(`${prefix} ${colors.blue}info${colors.reset}: ${message}`);
	},
	warn(...message: string[]): void {
		console.warn(`${prefix} ${colors.yellow}warn${colors.reset}: ${message}`);
	},
	error(...message: string[]): void {
		console.error(`${prefix} ${colors.red}error${colors.reset}: ${message}`);
	},
	debug(...message: string[]): void {
		console.debug(
			`${prefix} ${colors.magenta}debug${colors.reset}: ${message}`,
		);
	},
	log(...message: string[]): void {
		console.log(`${prefix} ${message}`);
	},
};
