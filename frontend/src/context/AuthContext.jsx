import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get custom claims (role, branch) from token
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        setUser(firebaseUser);
        setRole(tokenResult.claims.role || 'branch_manager');
        setBranch(tokenResult.claims.branch || 'Maheshwaram');
      } else {
        setUser(null);
        setRole(null);
        setBranch(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult(true);
    return {
      role: tokenResult.claims.role,
      branch: tokenResult.claims.branch,
    };
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, branch, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
