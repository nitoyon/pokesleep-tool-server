/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { logger, setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";

// For cost control, set the maximum number of containers that can be
// running at the same time.
setGlobalOptions({ maxInstances: 10 });

const requestSchema = z.object({
	name: z.string().min(1).max(100).default("world"),
});

export const helloWorld = onRequest((req, res) => {
	const parsed = requestSchema.safeParse(req.query);
	if (!parsed.success) {
		res.status(400).json({ ok: false, error: "invalid name" });
		return;
	}
	const { name } = parsed.data;

	logger.info("Hello logs!", { name, structuredData: true });
	res.json({ ok: true, message: `Hello, ${name}!` });
});
