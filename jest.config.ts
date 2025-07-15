/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	// No preset needed, we'll configure manually for ESM
	testEnvironment: "node",
	// Tell Jest to look for tests in .ts files
	extensionsToTreatAsEsm: [".ts"],
	// A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
	moduleNameMapper: {
		// Allows us to use absolute paths in tests like `@/*`
		"^@/(.*)$": "<rootDir>/$1",
	},
	// The transformer configuration
	transform: {
		// Use ts-jest for .ts files and tell it to use ESM mode
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
};
