/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
};
