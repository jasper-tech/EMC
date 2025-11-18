// app.config.js
// Loads environment variables and maps them into Expo's `expo.extra` so Constants.expoConfig.extra is available at runtime.

module.exports = ({ config }) => {
  // Attempt to load .env.local or .env if dotenv is installed (optional, safe if not present)
  try {
    // eslint-disable-next-line global-require
    require("dotenv").config({ path: ".env.local" });
    // eslint-disable-next-line global-require
    require("dotenv").config();
  } catch (e) {
    // ignore if dotenv is not installed
  }

  const pick = (...names) => {
    for (const n of names) {
      if (process.env[n]) return process.env[n];
    }
    return undefined;
  };

  const extra = {
    firebaseApiKey: pick(
      "FIREBASE_API_KEY",
      "EXPO_PUBLIC_FIREBASE_API_KEY",
      "REACT_APP_FIREBASE_API_KEY"
    ),
    firebaseAuthDomain: pick(
      "FIREBASE_AUTH_DOMAIN",
      "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "REACT_APP_FIREBASE_AUTH_DOMAIN"
    ),
    firebaseProjectId: pick(
      "FIREBASE_PROJECT_ID",
      "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
      "REACT_APP_FIREBASE_PROJECT_ID"
    ),
    firebaseStorageBucket: pick(
      "FIREBASE_STORAGE_BUCKET",
      "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "REACT_APP_FIREBASE_STORAGE_BUCKET"
    ),
    firebaseMessagingSenderId: pick(
      "FIREBASE_MESSAGING_SENDER_ID",
      "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "REACT_APP_FIREBASE_MESSAGING_SENDER_ID"
    ),
    firebaseAppId: pick(
      "FIREBASE_APP_ID",
      "EXPO_PUBLIC_FIREBASE_APP_ID",
      "REACT_APP_FIREBASE_APP_ID"
    ),
    firebaseMeasurementId: pick(
      "FIREBASE_MEASUREMENT_ID",
      "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
      "REACT_APP_FIREBASE_MEASUREMENT_ID"
    ),
  };

  // Determine a URI scheme for deep linking. Read from common env names or fall back to a safe default.
  const scheme =
    pick(
      "EXPO_SCHEME",
      "APP_SCHEME",
      "REACT_NATIVE_SCHEME",
      "REACT_APP_SCHEME",
      "SHELL_APP_SCHEME"
    ) || "emc";

  return {
    ...config,
    expo: {
      ...config.expo,
      scheme,
      extra: {
        ...(config.expo?.extra ?? {}),
        ...extra,
      },
      plugins: [...(config.expo?.plugins ?? []), "expo-router"],
    },
  };
};
