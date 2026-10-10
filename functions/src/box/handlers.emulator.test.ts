import { initializeApp } from "firebase-admin/app";
import type {
	CallableFunction,
	CallableRequest,
} from "firebase-functions/v2/https";
import functionsTest from "firebase-functions-test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { MAX_BOX_ITEMS } from "./api.js";
import {
	addBoxItems,
	deleteBoxItems,
	getBoxItems,
	updateBoxItems,
} from "./handlers.js";

// Never touch the production Firestore.
if (process.env.FIRESTORE_EMULATOR_HOST === undefined) {
	throw new Error(
		"Firestore emulator is not running. Use `npm run test:emulator`.",
	);
}

const fft = functionsTest({ projectId: process.env.GCLOUD_PROJECT });
beforeAll(() => {
	initializeApp();
});
afterAll(() => {
	fft.cleanup();
});

/** ID that matches the ID format but does not exist. */
const unknownId = "AAAAAAAAAAAAAAAAAAAA";

/**
 * Call a callable function as the given user.
 * @param uid User ID, or undefined to call without signing in.
 */
function call<Res>(
	fn: CallableFunction<unknown, Promise<Res>>,
	uid: string | undefined,
	data: unknown = {},
): Promise<Res> {
	const auth = uid === undefined ? undefined : { uid, token: {}, rawToken: "" };
	return fft.wrap(fn)({ data, auth } as CallableRequest);
}

/** Create a new user. Each test uses its own user, so no cleanup is needed. */
function newUid(): string {
	return crypto.randomUUID();
}

describe("getBoxItems", () => {
	test("requires sign-in", async () => {
		await expect(call(getBoxItems, undefined)).rejects.toMatchObject({
			code: "unauthenticated",
		});
	});

	test("returns needsInit for a new user", async () => {
		const res = await call(getBoxItems, newUid());
		expect(res).toEqual({ items: [], needsInit: true });
	});

	test("returns items without needsInit after adding items", async () => {
		const uid = newUid();
		const { ids } = await call(addBoxItems, uid, { items: ["a", "b"] });

		const res = await call(getBoxItems, uid);
		expect(res).toEqual({
			items: [
				{ id: ids[0], data: "a" },
				{ id: ids[1], data: "b" },
			],
			needsInit: false,
		});
	});

	test("does not return needsInit after deleting all items", async () => {
		const uid = newUid();
		const { ids } = await call(addBoxItems, uid, { items: ["a"] });
		await call(deleteBoxItems, uid, { ids });

		const res = await call(getBoxItems, uid);
		expect(res).toEqual({ items: [], needsInit: false });
	});
});

describe("addBoxItems", () => {
	test("appends items to the end", async () => {
		const uid = newUid();
		const { ids: ids1 } = await call(addBoxItems, uid, { items: ["a"] });
		const { ids: ids2 } = await call(addBoxItems, uid, {
			items: ["b", "c"],
		});
		expect(ids2).toHaveLength(2);

		const { items } = await call(getBoxItems, uid);
		expect(items).toEqual([
			{ id: ids1[0], data: "a" },
			{ id: ids2[0], data: "b" },
			{ id: ids2[1], data: "c" },
		]);
	});

	test("does nothing for empty items", async () => {
		const uid = newUid();
		const res = await call(addBoxItems, uid, { items: [] });
		expect(res).toEqual({ ids: [] });

		const { needsInit } = await call(getBoxItems, uid);
		expect(needsInit).toBe(true);
	});

	test("rejects invalid data", async () => {
		await expect(
			call(addBoxItems, newUid(), { items: [""] }),
		).rejects.toMatchObject({ code: "invalid-argument" });
	});

	test("rejects items over the limit", async () => {
		const uid = newUid();
		const full = Array.from({ length: MAX_BOX_ITEMS }, (_, i) => `${i}`);
		await call(addBoxItems, uid, { items: full });

		await expect(
			call(addBoxItems, uid, { items: ["over"] }),
		).rejects.toMatchObject({ code: "resource-exhausted" });
		const { items } = await call(getBoxItems, uid);
		expect(items).toHaveLength(MAX_BOX_ITEMS);
	});
});

describe("updateBoxItems", () => {
	test("updates data and keeps order", async () => {
		const uid = newUid();
		const { ids } = await call(addBoxItems, uid, { items: ["a", "b"] });
		await call(updateBoxItems, uid, { items: [{ id: ids[0], data: "A" }] });

		const { items } = await call(getBoxItems, uid);
		expect(items).toEqual([
			{ id: ids[0], data: "A" },
			{ id: ids[1], data: "b" },
		]);
	});

	test("updates nothing if any item does not exist", async () => {
		const uid = newUid();
		const { ids } = await call(addBoxItems, uid, { items: ["a"] });

		await expect(
			call(updateBoxItems, uid, {
				items: [
					{ id: ids[0], data: "A" },
					{ id: unknownId, data: "X" },
				],
			}),
		).rejects.toMatchObject({ code: "not-found" });
		const { items } = await call(getBoxItems, uid);
		expect(items).toEqual([{ id: ids[0], data: "a" }]);
	});

	test("cannot update other user's items", async () => {
		const { ids } = await call(addBoxItems, newUid(), { items: ["a"] });

		await expect(
			call(updateBoxItems, newUid(), { items: [{ id: ids[0], data: "A" }] }),
		).rejects.toMatchObject({ code: "not-found" });
	});
});

describe("deleteBoxItems", () => {
	test("deletes items and ignores unknown IDs", async () => {
		const uid = newUid();
		const { ids } = await call(addBoxItems, uid, { items: ["a", "b"] });
		await call(deleteBoxItems, uid, { ids: [ids[0], unknownId] });

		const { items } = await call(getBoxItems, uid);
		expect(items).toEqual([{ id: ids[1], data: "b" }]);
	});
});
