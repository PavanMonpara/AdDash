import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

let firebaseApp = null;

export const initFirebase = () => {
    try {
        if (firebaseApp) return firebaseApp;

        // Option 1: Load from serviceAccountKey.json if it exists
        const serviceAccountPath = path.resolve(process.cwd(), "serviceAccountKey.json");

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin initialized using serviceAccountKey.json");
        }
        // Option 2: Use environment variables (GOOGLE_APPLICATION_CREDENTIALS)
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            firebaseApp = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log("Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS");
        } else {
            console.warn("Firebase Admin NOT initialized: Missing serviceAccountKey.json or GOOGLE_APPLICATION_CREDENTIALS");
            // We generally shouldn't throw here if we want the app to start even without notifications configured initially
            return null;
        }

        return firebaseApp;
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);
        return null;
    }
};

/**
 * Send a push notification to a specific device token.
 * @param {string} token - The FCM registration token.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @param {object} data - Custom data payload (all values must be strings).
 * @param {string} type - 'call' or 'message' or 'system' (for priority/channel handling)
 */
export const sendPushNotification = async (token, title, body, data = {}, type = "message") => {
    if (!firebaseApp) {
        // Lazy init attempt
        initFirebase();
        if (!firebaseApp) {
            console.warn("Skipping push notification: Firebase not initialized");
            return null;
        }
    }

    // Ensure all data values are strings (FCM requirement)
    const stringifiedData = Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
    }, {});

    const message = {
        token, // Registration token
        notification: {
            title,
            body,
        },
        data: stringifiedData,
        android: {
            priority: type === 'call' ? 'high' : 'normal',
            notification: {
                sound: 'default',
                channelId: type === 'call' ? 'call_channel' : 'default_channel',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Common default, adjust if needed
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    contentAvailable: true, // For background updates
                },
            },
            headers: {
                "apns-priority": type === 'call' ? "10" : "5",
            }
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Successfully sent message:", response);
        return response;
    } catch (error) {
        console.error("Error sending message:", error);
        // Handle invalid token (e.g. remove from DB) - leaving that for the caller or future enhancement
        return null;
    }
};

/**
 * Fetch FCM token from Firestore users collection
 * @param {string} firebaseUid - The Firebase User ID
 */
export const getFcmTokenFromFirestore = async (firebaseUid) => {
    if (!firebaseApp) {
        initFirebase();
        if (!firebaseApp) return null;
    }

    try {
        const doc = await admin.firestore().collection('users').doc(firebaseUid).get();
        if (!doc.exists) {
            console.log('No such document in Firestore!');
            return null;
        }
        const data = doc.data();
        return data.fcmToken || null;
    } catch (error) {
        console.error("Error fetching from Firestore:", error);
        return null;
    }
};
