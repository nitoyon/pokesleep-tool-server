import { z } from "zod";

// Request and response schemas of the box API exchanged with the client.

/** Max number of items in a box (same as `PokemonBox.maxEntryCount`). */
export const MAX_BOX_ITEMS = 300;

/** Max length of serialized item data (`xxxx@nickname`). */
const MAX_DATA_LENGTH = 1000;

/** Serialized item (`PokemonBoxItem.serialize()`). */
const dataSchema = z.string().min(1).max(MAX_DATA_LENGTH);

/** Item ID (Firestore auto-generated document ID). */
const idSchema = z.string().regex(/^[A-Za-z0-9]{20}$/);

export const addBoxItemsSchema = z.object({
	items: z.array(dataSchema).max(MAX_BOX_ITEMS),
});

export const updateBoxItemsSchema = z.object({
	items: z
		.array(z.object({ id: idSchema, data: dataSchema }))
		.max(MAX_BOX_ITEMS),
});

export const deleteBoxItemsSchema = z.object({
	ids: z.array(idSchema).max(MAX_BOX_ITEMS),
});

/** A box item exchanged with the client. */
export type BoxEntry = {
	/** Item ID. */
	id: string;
	/** Serialized item. */
	data: string;
};
