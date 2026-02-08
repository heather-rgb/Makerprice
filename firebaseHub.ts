import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const HUB_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBfx7XQZ0KvYZXUmQ3-gzRgkOfwluE5BRM",
    authDomain: "ixia-creative-hub.firebaseapp.com",
    projectId: "ixia-creative-hub",
    storageBucket: "ixia-creative-hub.firebasestorage.app",
    messagingSenderId: "386043623642",
    appId: "1:386043623642:web:9710fafc8d5f0d03618de3",
    measurementId: "G-61MS0X4WW9",
};

const HUB_APP_NAME = "hub";

// Prevent duplicate init in Vite dev
const hubApp =
    getApps().find((app) => app.name === HUB_APP_NAME) ??
    initializeApp(HUB_FIREBASE_CONFIG, HUB_APP_NAME);

export const hubAuth = getAuth(hubApp);

// ✅ CRITICAL: persist auth across refresh (prevents new anon UID + prevents logout)
setPersistence(hubAuth, browserLocalPersistence).catch((err) => {
    // Don't crash the app if persistence fails (e.g. in some private modes)
    console.warn("Auth persistence not set:", err);
});

export const hubFunctions = getFunctions(hubApp, "australia-southeast1");

// Optional: use emulator only when explicitly enabled in local dev
if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    import.meta.env.VITE_USE_EMULATORS === "true"
) {
    try {
        connectFunctionsEmulator(hubFunctions, "localhost", 5001);
    } catch {
        // ignore if already connected
    }
}





