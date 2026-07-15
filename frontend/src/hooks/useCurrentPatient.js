import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const SECRET_KEY = import.meta.env.VITE_AES_SECRET_KEY;

const decryptData = (cipherText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

// Resolves the Firestore patient doc linked to the logged-in Firebase Auth
// user via authUid, instead of guessing at the first doc in the collection.
export default function useCurrentPatient() {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'patients'), where('authUid', '==', user.uid), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setPatient(null);
      } else {
        const docSnap = snapshot.docs[0];
        const rawData = docSnap.data();
        setPatient({
          id: docSnap.id,
          ...rawData,
          firstName: rawData.firstName ? decryptData(rawData.firstName) : 'Unknown',
          phoneNumber: rawData.phoneNumber ? decryptData(rawData.phoneNumber) : 'Unknown'
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { patient, isLoading };
}
