import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'cardioguard_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) { setChecking(false); return; }
    getCurrentUser().then(setUser).catch(() => sessionStorage.removeItem(TOKEN_KEY)).finally(() => setChecking(false));
  }, []);

  const authenticate = (payload) => { sessionStorage.setItem(TOKEN_KEY, payload.access_token); setUser(payload.user); return payload.user; };
  const login = async (credentials) => authenticate(await loginUser(credentials));
  const signup = async (data) => authenticate(await registerUser(data));
  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); setUser(null); };

  return <AuthContext.Provider value={{ user, checking, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }