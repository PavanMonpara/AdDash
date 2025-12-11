import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Admin, Role } from './types';
import { mockAdmins } from './mockData';
import { granularRolePermissions } from './permissions';


interface AuthContextType {
  admin: Admin | null;
  login: (data: any, token: string, refreshToken: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isSessionActive: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>({
    id: 'admin-1',
    email: 'superadmin@example.com',
    name: 'John Doe',
    role: 'SuperAdmin',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2025-10-26T10:00:00Z',
    twoFactorEnabled: true,
    permissions: ['*']
  },);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isSessionActive, setIsSessionActive] = useState(true);

  // Session timeout checker
  useEffect(() => {
    if (!admin) return;

    const checkTimeout = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        setIsSessionActive(false);
        // Auto logout after showing timeout warning
        setTimeout(() => {
          logout();
        }, 5000);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkTimeout);
  }, [admin, lastActivity]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      setIsSessionActive(true);
    };

    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, []);

  const login = async (data: any, token: string, refreshToken: string): Promise<boolean> => {
    // Mock authentication
    // const foundAdmin = mockAdmins.find(a => a.email === email);

    // if (!foundAdmin) {
    //   return false;
    // }

    // // Simulate password check (in production, this would be verified on backend)
    // if (password !== 'admin123') {
    //   return false;
    // }

    // // Check 2FA if enabled
    // if (foundAdmin.twoFactorEnabled && !twoFactorCode) {
    //   return false; // Need 2FA code
    // }

    // if (foundAdmin.twoFactorEnabled && twoFactorCode !== '123456') {
    //   return false; // Invalid 2FA code
    // }

    // // Mock JWT token storage
    // const mockToken = btoa(JSON.stringify({ 
    //   adminId: foundAdmin.id, 
    //   role: foundAdmin.role,
    //   exp: Date.now() + 24 * 60 * 60 * 1000 
    // }));

    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);

    setAdmin({
      ...data, name: data.username, permissions: ['*']
      , lastLogin: new Date().toISOString()
    });
    setLastActivity(Date.now());
    setIsSessionActive(true);

    return true;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setAdmin(null);
    setIsSessionActive(true);
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    if (admin.permissions.includes('*')) return true;
    return admin.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, hasPermission, isSessionActive }}>
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

// Route guard component
export function RequireAuth({
  children,
  requiredPermission
}: {
  children: React.ReactNode;
  requiredPermission?: string;
}) {
  const { admin, hasPermission } = useAuth();

  if (!admin) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2>Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this module.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
