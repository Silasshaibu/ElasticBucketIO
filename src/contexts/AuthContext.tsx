import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { loadData, saveData } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; message: string; mustChangePassword?: boolean };
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock password store (in real app, passwords are hashed server-side)
const MOCK_PASSWORDS: Record<string, string> = {
  'admin@staffdrive.io': 'admin123456',
  'alice@company.com': 'alice123456',
  'bob@company.com': 'bob123456',
  'carol@company.com': 'carol123456',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('staffdrive_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const data = loadData();
    const foundUser = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!foundUser) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!foundUser.isActive) {
      return { success: false, message: 'Account is disabled. Contact your admin.' };
    }

    if (MOCK_PASSWORDS[email.toLowerCase()] !== password) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Update last login
    foundUser.lastLoginAt = new Date().toISOString();
    saveData(data);
    
    setUser(foundUser);
    localStorage.setItem('staffdrive_user', JSON.stringify(foundUser));

    if (foundUser.mustChangePassword) {
      return { success: true, message: 'Login successful', mustChangePassword: true };
    }

    return { success: true, message: 'Login successful' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('staffdrive_user');
  }, []);

  const changePassword = useCallback((oldPassword: string, newPassword: string) => {
    if (!user) return { success: false, message: 'Not authenticated' };
    
    const data = loadData();
    const foundUser = data.users.find(u => u.id === user.id);
    if (!foundUser) return { success: false, message: 'User not found' };

    if (MOCK_PASSWORDS[user.email.toLowerCase()] !== oldPassword) {
      return { success: false, message: 'Current password is incorrect' };
    }

    if (newPassword.length < 10) {
      return { success: false, message: 'Password must be at least 10 characters' };
    }

    MOCK_PASSWORDS[user.email.toLowerCase()] = newPassword;
    foundUser.mustChangePassword = false;
    saveData(data);

    const updatedUser = { ...foundUser, mustChangePassword: false };
    setUser(updatedUser);
    localStorage.setItem('staffdrive_user', JSON.stringify(updatedUser));

    return { success: true, message: 'Password changed successfully' };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
