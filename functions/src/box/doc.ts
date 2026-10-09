import type { BoxEntry } from "./api.js";

// Firestore document schema of the box and conversion to the API schema.
// Firestore access lives in ./handlers.ts so that this module can be tested
// without the emulator.

/**
 * User document stored at `users/{uid}`.
 * It may not exist until the user adds items for the first time.
 */
export type UserDoc = {
	/** True once the user has added items to the empty box. */
	boxInitialized?: boolean;
};

/**
 * Box item document stored at `users/{uid}/boxItems/{id}`.
 */
export type BoxItemDoc = {
	/** Serialized item. */
	data: string;
	/**
	 * Time when the item was added, in milliseconds.
	 * Items added in one request get consecutive values to keep their order.
	 */
	createdAt: number;
	/**
	 * Time when the item was last added or updated, in milliseconds.
	 * Items added or updated in one request get consecutive values to keep
	 * their order.
	 */
	updatedAt: number;
};

/**
 * Sort items in the order they were added.
 * @param docs Item IDs and documents.
 * @returns Sorted items.
 */
export function sortEntries(
	docs: { id: string; doc: BoxItemDoc }[],
): BoxEntry[] {
	return [...docs]
		.sort((a, b) => a.doc.createdAt - b.doc.createdAt)
		.map(({ id, doc }) => ({ id, data: doc.data }));
}
