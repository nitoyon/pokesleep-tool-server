import { describe, expect, test } from "vitest";
import { sortEntries } from "./doc.js";

const id1 = "AAAAAAAAAAAAAAAAAAA1";
const id2 = "AAAAAAAAAAAAAAAAAAA2";
const id3 = "AAAAAAAAAAAAAAAAAAA3";

describe("sortEntries", () => {
	test("sorts by createdAt", () => {
		expect(
			sortEntries([
				{ id: id1, doc: { data: "a", createdAt: 200, updatedAt: 200 } },
				{ id: id2, doc: { data: "b", createdAt: 101, updatedAt: 300 } },
				{ id: id3, doc: { data: "c", createdAt: 100, updatedAt: 100 } },
			]),
		).toEqual([
			{ id: id3, data: "c" },
			{ id: id2, data: "b" },
			{ id: id1, data: "a" },
		]);
	});
});
