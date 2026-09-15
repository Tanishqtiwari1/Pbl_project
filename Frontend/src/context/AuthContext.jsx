import { createContext, useContext, useEffect, useState } from 'react';
import { clearStoredToken, getCurrentUser, getStoredToken, loginUser, registerUser, storeToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setChecking(false); return; }
    getCurrentUser().then(setUser).catch(() => clearStoredToken()).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener('cardioguard:session-expired', handleSessionExpired);
    return () => window.removeEventListener('cardioguard:session-expired', handleSessionExpired);
  }, []);

  const authenticate = (payload) => { storeToken(payload.access_token); setUser(payload.user); return payload.user; };
  const login = async (credentials) => authenticate(await loginUser(credentials));
  const signup = async (data) => authenticate(await registerUser(data));
  const logout = () => { clearStoredToken(); setUser(null); };

  return <AuthContext.Provider value={{ user, checking, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }