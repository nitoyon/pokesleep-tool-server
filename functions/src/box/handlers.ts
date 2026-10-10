import { getFirestore } from "firebase-admin/firestore";
import {
	type CallableRequest,
	HttpsError,
	onCall,
} from "firebase-functions/v2/https";
import type { z } from "zod";
import {
	addBoxItemsSchema,
	type BoxEntry,
	deleteBoxItemsSchema,
	MAX_BOX_ITEMS,
	updateBoxItemsSchema,
} from "./api.js";
import { type BoxItemDoc, sortEntries, type UserDoc } from "./doc.js";

/** Firestore database ID (not the `(default)` database). */
const DATABASE_ID = "pksl-nitoyon";

/** gRPC status code returned when a document to update does not exist. */
const GRPC_NOT_FOUND = 5;

const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
export const corsOrigins = isEmulator
	? true
	: ["https://nitoyon.github.io", "https://www.nitoyon.com"];

/**
 * Get all items in the order they were added.
 * `needsInit` is true if the box is empty and has never been initialized.
 */
export const getBoxItems = onCall(
	{ cors: corsOrigins },
	async (request): Promise<{ items: BoxEntry[]; needsInit: boolean }> => {
		const uid = requireUid(request);
		const [boxItemsSnap, userSnap] = await Promise.all([
			boxItems(uid).get(),
			userDoc(uid).get(),
		]);
		const items = sortEntries(
			boxItemsSnap.docs.map((x) => ({ id: x.id, doc: x.data() as BoxItemDoc })),
		);
		const user = userSnap.data() as UserDoc | undefined;
		return {
			items,
			needsInit: items.length === 0 && user?.boxInitialized !== true,
		};
	},
);

/**
 * Add items to the end of the box.
 * Returns the IDs of the added items in the same order as the request.
 */
export const addBoxItems = onCall(
	{ cors: corsOrigins },
	async (request): Promise<{ ids: string[] }> => {
		const uid = requireUid(request);
		const { items } = parseData(addBoxItemsSchema, request.data);
		if (items.length === 0) {
			return { ids: [] };
		}

		const col = boxItems(uid);
		return await db().runTransaction(async (tx) => {
			// Error if the box is full
			const count = (await tx.get(col.count())).data().count;
			if (count + items.length > MAX_BOX_ITEMS) {
				throw new HttpsError("resource-exhausted", "box is full");
			}

			// Set boxInitialized to true if at least one item is added
			if (count === 0) {
				const user: UserDoc = { boxInitialized: true };
				tx.set(userDoc(uid), user, { merge: true });
			}

			// Add each items to Firestore
			const now = Date.now();
			const ids: string[] = [];
			items.forEach((data, index) => {
				const ref = col.doc();
				const doc: BoxItemDoc = {
					data,
					createdAt: now + index,
					updatedAt: now + index,
				};
				tx.create(ref, doc);
				ids.push(ref.id);
			});
			return { ids };
		});
	},
);

/**
 * Update existing items.
 * Fails with `not-found` (and updates nothing) if any item does not exist.
 */
export const updateBoxItems = onCall(
	{ cors: corsOrigins },
	async (request): Promise<void> => {
		const uid = requireUid(request);
		const { items } = parseData(updateBoxItemsSchema, request.data);
		if (items.length === 0) {
			return;
		}

		const col = boxItems(uid);
		const batch = db().batch();
		const now = Date.now();
		items.forEach(({ id, data }, index) => {
			const doc: Pick<BoxItemDoc, "data" | "updatedAt"> = {
				data,
				updatedAt: now + index,
			};
			batch.update(col.doc(id), doc);
		});
		try {
			await batch.commit();
		} catch (e) {
			if ((e as { code?: unknown }).code === GRPC_NOT_FOUND) {
				throw new HttpsError("not-found", "item not found");
			}
			throw e;
		}
	},
);

/**
 * Delete items. Unknown IDs are ignored.
 */
export const deleteBoxItems = onCall(
	{ cors: corsOrigins },
	async (request): Promise<void> => {
		const uid = requireUid(request);
		const { ids } = parseData(deleteBoxItemsSchema, request.data);
		if (ids.length === 0) {
			return;
		}

		const col = boxItems(uid);
		const batch = db().batch();
		for (const id of ids) {
			batch.delete(col.doc(id));
		}
		await batch.commit();
	},
);

/**
 * Get the UID of the signed-in user.
 * @throws HttpsError if not signed in.
 */
function requireUid(request: CallableRequest): string {
	const uid = request.auth?.uid;
	if (uid === undefined) {
		throw new HttpsError("unauthenticated", "sign-in required");
	}
	return uid;
}

/**
 * Validate request data.
 * @throws HttpsError if the data is invalid.
 */
function parseData<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		throw new HttpsError("invalid-argument", "invalid request");
	}
	return parsed.data;
}

function db() {
	return getFirestore(DATABASE_ID);
}

function userDoc(uid: string) {
	return db().collection("users").doc(uid);
}

function boxItems(uid: string) {
	return userDoc(uid).collection("boxItems");
}
