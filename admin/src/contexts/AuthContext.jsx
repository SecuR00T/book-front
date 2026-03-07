import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { loginApi } from '@/api/auth';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'authUser';
const DEFAULT_ADMIN_USER = { name: '관리자', email: 'admin@bukchon.kr' };
const BROKEN_ADMIN_NAMES = new Set(['愿由ъ옄', '原亘由中역']);

function normalizeUserName(name) {
  const normalized = typeof name === 'string' ? name.trim() : '';

  if (!normalized || BROKEN_ADMIN_NAMES.has(normalized)) {
    return DEFAULT_ADMIN_USER.name;
  }

  return normalized;
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return DEFAULT_ADMIN_USER;
  }

  return {
    ...DEFAULT_ADMIN_USER,
    ...user,
    name: normalizeUserName(user.name),
  };
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function parseBookvillageUser() {
  const raw = sessionStorage.getItem('bookvillage_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getBookvillageAdminCredentials() {
  const user = parseBookvillageUser();
  const creds = sessionStorage.getItem('bookvillage_creds');

  if (!user || user.role !== 'ADMIN' || !creds) {
    return null;
  }

  try {
    const decoded = atob(creds);
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    const username = decoded.slice(0, separatorIndex).trim();
    const password = decoded.slice(separatorIndex + 1);

    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const token = getStoredToken();

      if (token) {
        if (!isMounted) return;
        setUser(normalizeUser(getStoredUser()));
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      const adminCredentials = getBookvillageAdminCredentials();
      if (!adminCredentials) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await loginApi(adminCredentials.username, adminCredentials.password);

        if (!isMounted) return;

        sessionStorage.setItem(TOKEN_KEY, response.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setUser(normalizeUser(response.user));
        setIsAuthenticated(true);
      } catch {
        if (!isMounted) return;
        clearStoredAuth();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password, remember = false) => {
    const response = await loginApi(username, password);
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(USER_KEY);

    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(USER_KEY, JSON.stringify(response.user));

    setUser(normalizeUser(response.user));
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
