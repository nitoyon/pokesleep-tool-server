/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";

initializeApp();

// For cost control, set the maximum number of containers that can be
// running at the same time.
setGlobalOptions({ region: "asia-northeast1", maxInstances: 10 });

export {
	addBoxItems,
	deleteBoxItems,
	getBoxItems,
	updateBoxItems,
} from "./box/handlers.js";
