# Firestore rules

These rules fix **"Missing or insufficient permissions"** for `users/{uid}/notifications` and align with how the app uses Firestore.

## Option 1: Firebase Console (quickest)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **linkup-ef051** → **Firestore Database** → **Rules**.
2. Replace the existing rules with the contents of `firestore.rules` in this folder.
3. Click **Publish**.

## Option 2: Firebase CLI

From the project root:

```bash
# If you haven’t already
pnpm add -g firebase-tools
firebase login
firebase init firestore
# When prompted, choose “Use an existing project” → linkup-ef051, and keep firestore.rules path as firebase/firestore.rules (or move the file to the path it suggests)
firebase deploy --only firestore:rules
```

After the rules are published, the notifications `onSnapshot` in `NotificationContext.tsx` should work without the permissions error.
