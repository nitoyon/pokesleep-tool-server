import { describe, expect, test } from "vitest";
import {
	addBoxItemsSchema,
	deleteBoxItemsSchema,
	MAX_BOX_ITEMS,
	updateBoxItemsSchema,
} from "./api.js";

const id1 = "AAAAAAAAAAAAAAAAAAA1";

describe("schemas", () => {
	test("accepts valid requests", () => {
		expect(addBoxItemsSchema.safeParse({ items: ["a@nick"] }).success).toBe(
			true,
		);
		expect(
			updateBoxItemsSchema.safeParse({ items: [{ id: id1, data: "a" }] })
				.success,
		).toBe(true);
		expect(deleteBoxItemsSchema.safeParse({ ids: [id1] }).success).toBe(true);
	});

	test("rejects invalid requests", () => {
		expect(addBoxItemsSchema.safeParse({}).success).toBe(false);
		expect(addBoxItemsSchema.safeParse({ items: [""] }).success).toBe(false);
		expect(
			addBoxItemsSchema.safeParse({
				items: Array(MAX_BOX_ITEMS + 1).fill("a"),
			}).success,
		).toBe(false);
		expect(
			updateBoxItemsSchema.safeParse({ items: [{ id: "../x", data: "a" }] })
				.success,
		).toBe(false);
		expect(deleteBoxItemsSchema.safeParse({ ids: ["a/b"] }).success).toBe(
			false,
		);
	});
});
