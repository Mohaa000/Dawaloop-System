import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Staff/admin accounts have a doc at staff/{uid}; the hardcoded email
        // check is kept as a permanent fallback so the original admin account
        // never gets locked out if that doc is missing.
        const staffSnap = await getDoc(doc(db, 'staff', currentUser.uid));
        const isAdmin = staffSnap.exists() || currentUser.email === 'admin@dawaloop.com';
        setUserRole(isAdmin ? 'admin' : 'patient');
      } else {
        setUserRole(null);
      }

      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, isCheckingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to AuthProvider, splitting into a separate file adds indirection for no benefit
export const useAuth = () => useContext(AuthContext);
