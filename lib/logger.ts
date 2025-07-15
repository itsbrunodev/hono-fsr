import chalk from "chalk";

const prefix = chalk.cyan.bold("[hono-fsr]");

export const logger = {
	info(message: string): void {
		console.log(`${prefix} ${chalk.blue("info")}: ${message}`);
	},
	warn(message: string): void {
		console.warn(`${prefix} ${chalk.yellowBright("warn")}: ${message}`);
	},
	error(message: string): void {
		console.error(`${prefix} ${chalk.red("error")}: ${message}`);
	},
	debug(message: string): void {
		console.debug(`${prefix} ${chalk.magenta("debug")}: ${message}`);
	},
	log(message: string): void {
		console.log(`${prefix} ${message}`);
	},
};
