import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(null);

function getDeviceCode() {
  const raw = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  const code = 'DEV-' + Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
  return code;
}

export const DEVICE_CODE = getDeviceCode();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        setUser(firebaseUser);
        setRole(tokenResult.claims.role || 'branch_manager');
        setBranch(tokenResult.claims.branch || '');
      } else {
        setUser(null);
        setRole(null);
        setBranch(null);
        setDeviceBlocked(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult(true);
    const userRole = tokenResult.claims.role;

    // Admin is never blocked
    if (userRole === 'admin') {
      return { role: userRole, branch: tokenResult.claims.branch };
    }

    // Check device for non-admin users
    const token = await cred.user.getIdToken();
    const res = await fetch(
      (import.meta.env.VITE_API_URL || '') + '/api/auth/check-device',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ deviceCode: DEVICE_CODE }),
      }
    );
    const data = await res.json();

    if (!data.allowed) {
      await signOut(auth);
      setDeviceBlocked(true);
      throw { deviceBlocked: true, deviceCode: DEVICE_CODE };
    }

    return { role: userRole, branch: tokenResult.claims.branch };
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, branch, loading, deviceBlocked, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
