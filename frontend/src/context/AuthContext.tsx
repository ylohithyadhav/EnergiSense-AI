import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  updateProfile,
  User 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isFirebaseActive: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginDemoUser: () => void;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rawFirebaseUser, setRawFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local demo session first if saved
    const savedDemo = localStorage.getItem('energisense_demo_user');
    if (savedDemo) {
      try {
        setCurrentUser(JSON.parse(savedDemo));
      } catch (e) {
        localStorage.removeItem('energisense_demo_user');
      }
    }

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          localStorage.removeItem('energisense_demo_user');
          setRawFirebaseUser(user);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || "User",
            isDemo: false
          });
        } else {
          setRawFirebaseUser(null);
          // Preserve active guest demo session if present
          const activeDemo = localStorage.getItem('energisense_demo_user');
          if (activeDemo) {
            try {
              setCurrentUser(JSON.parse(activeDemo));
            } catch (e) {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase Authentication is not configured. Use Demo Login or configure .env.");
    }
    localStorage.removeItem('energisense_demo_user');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name?: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase Authentication is not configured. Use Demo Login or configure .env.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const displayName = name?.trim() || email.split('@')[0];

    try {
      await updateProfile(cred.user, { displayName });
    } catch (e) {
      console.warn("Could not set display name on auth profile:", e);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: displayName,
          email: cred.user.email,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Could not write user record to Cloud Firestore:", e);
      }
    }

    localStorage.removeItem('energisense_demo_user');
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase Authentication is not configured. Configure .env with Firebase credentials.");
    }
    await sendPasswordResetEmail(auth, email);
  };

  const loginDemoUser = () => {
    const demoProfile: UserProfile = {
      uid: "demo-analyst",
      email: "demo@energisense.ai",
      displayName: "Guest Smart Building Analyst",
      isDemo: true
    };
    if (isFirebaseConfigured && auth) {
      fbSignOut(auth).catch(() => {});
    }
    setRawFirebaseUser(null);
    setCurrentUser(demoProfile);
    localStorage.setItem('energisense_demo_user', JSON.stringify(demoProfile));
  };

  const logout = async () => {
    localStorage.removeItem('energisense_demo_user');
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn("Notice signing out of Firebase:", e);
      }
    }
    setCurrentUser(null);
    setRawFirebaseUser(null);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (rawFirebaseUser) {
      return await rawFirebaseUser.getIdToken();
    }
    if (currentUser?.isDemo) {
      return `demo-token-${currentUser.uid}`;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isFirebaseActive: isFirebaseConfigured,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        loginDemoUser,
        logout,
        getIdToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
