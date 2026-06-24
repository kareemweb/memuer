import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile as firebaseUpdateProfile, 
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { generateKeyPair, getStoredKeyPair, storeKeyPair } from '../lib/crypto';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    let docUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous doc listener if any
      if (docUnsubscribe) {
        docUnsubscribe();
        docUnsubscribe = null;
      }

      if (firebaseUser) {
        // Ensure user document exists in firestore and they have E2EE keypairs
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          let localKeys = getStoredKeyPair(firebaseUser.uid);
          
          if (!localKeys) {
            localKeys = generateKeyPair();
            storeKeyPair(firebaseUser.uid, localKeys);
          }

          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.displayName || 'M'}&backgroundColor=f43f5e,d946ef,6366f1`,
              status: 'Hey there! I am using Memuer.',
              publicKey: localKeys.publicKey,
              isOnline: true,
              lastSeen: new Date().toISOString(),
              role: 'user'
            }, { merge: true });
          } else {
            // Self-healing check: always overwrite with local keys if they don't match Firestore
            const existingData = docSnap.data();
            await setDoc(userDocRef, {
              isOnline: true,
              lastSeen: new Date().toISOString(),
              publicKey: localKeys.publicKey
            }, { merge: true });
          }

          // Real-time synchronization of custom Firestore profile fields into the merged 'user' state
          docUnsubscribe = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const latestKeys = getStoredKeyPair(firebaseUser.uid);
              const vaultSynced = latestKeys ? (latestKeys.publicKey === data.publicKey) : false;

              setUser({
                ...firebaseUser,
                ...data,
                vaultSynced,
                uid: firebaseUser.uid,
                email: firebaseUser.email || data.email,
                displayName: data.displayName || firebaseUser.displayName,
                photoURL: data.photoURL || firebaseUser.photoURL,
              } as any);
            } else {
              setUser({
                ...firebaseUser,
                vaultSynced: false
              } as any);
            }
            setLoading(false);
          }, (err) => {
            console.error("Error syncing user document:", err);
            setUser(firebaseUser as any);
            setLoading(false);
          });

        } catch (err: any) {
          console.error("Error setting up user profile in firestore:", err);
          setUser(firebaseUser as any);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (docUnsubscribe) {
        docUnsubscribe();
      }
    };
  }, []);

  const login = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Email login error:", err);
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await firebaseUpdateProfile(res.user, { displayName: name });
      
      // Initialize encryption keys
      const localKeys = generateKeyPair();
      storeKeyPair(res.user.uid, localKeys);

      // Save user record to firestore
      const userDocRef = doc(db, 'users', res.user.uid);
      await setDoc(userDocRef, {
        uid: res.user.uid,
        displayName: name,
        email: email,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=f43f5e,d946ef,6366f1`,
        status: 'Hey there! I am using Memuer.',
        publicKey: localKeys.publicKey,
        isOnline: true,
        lastSeen: new Date().toISOString(),
        role: 'user'
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    setLoading(true);
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, {
          isOnline: false,
          lastSeen: new Date().toISOString(),
          currentPeerId: null
        }, { merge: true });
      }
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign-out error:", err);
      setError(err.message || "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    setResetEmailSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send reset email");
    }
  };

  return {
    user,
    loading,
    error,
    setError,
    login,
    loginWithEmail,
    registerWithEmail,
    logout,
    resetPassword,
    resetEmailSent
  };
}
