import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				// Tests that run without the emulator.
				test: {
					name: "unit",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/*.emulator.test.ts"],
				},
			},
			{
				// Tests that run against the Firestore emulator.
				// Run with `npm run test:emulator`.
				test: {
					name: "emulator",
					include: ["src/**/*.emulator.test.ts"],
					// Tests share one emulator, so run files sequentially.
					fileParallelism: false,
				},
			},
		],
	},
});
