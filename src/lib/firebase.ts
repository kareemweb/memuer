import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD872iKH9U4FgufVY1xlRuDBfX6V5spOQQ",
  authDomain: "gen-lang-client-0695111722.firebaseapp.com",
  projectId: "gen-lang-client-0695111722",
  storageBucket: "gen-lang-client-0695111722.firebasestorage.app",
  messagingSenderId: "79719209657",
  appId: "1:79719209657:web:181b1fafb45d03a5b45968"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the user-configured custom database ID!
export const db = getFirestore(app, "ai-studio-97798100-d2b2-42da-8f47-d329ca461af4");
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  WRITE = "WRITE",
  LIST = "LIST",
  GET = "GET"
}

export function handleFirestoreError(error: any, operation: OperationType, path: string) {
  console.error(`Firebase Firestore Error [Operation: ${operation}] on Path [${path}]:`, error);
  return error;
}
export { app };
