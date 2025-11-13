'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/services';
import { apiClient } from '@/lib/api';
import { forceLogoutBackup, emergencyLogout } from '@/lib/auth-utils';
import type { Employee } from '@/lib/services';

interface AuthContextType {
  user: Employee | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isTokenExpired: boolean;
  emergencyLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Kiểm tra các loại lỗi cụ thể
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email hoặc mật khẩu không đúng' };
        }
        return { success: false, error: error.message };
      }
      
      if (!data.session) {
        return { success: false, error: 'Không thể tạo phiên đăng nhập' };
      }
      
      // Persist token to HttpOnly cookie via API for server-side auth
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
      } catch {}
      
      // Kiểm tra trạng thái user ngay sau khi đăng nhập
      try {
        const { data: userProfile, error: profileError } = await authService.getCurrentUser();
        
        if (profileError || !userProfile) {
          // Có thể là lỗi từ API, kiểm tra nếu là account terminated
          if (profileError && 
              (profileError === 'Account terminated' || 
               profileError.error === 'Account terminated' || 
               (typeof profileError === 'object' && profileError.error === 'Account terminated'))) {
            // Logout để clear session
          await supabase.auth.signOut();
            return { 
              success: false, 
              error: 'Tài khoản đã bị vô hiệu hóa', 
              message: (typeof profileError === 'object' ? profileError.message : null) || 'Tài khoản của bạn đã bị vô hiệu hóa do đã nghỉ việc. Vui lòng liên hệ quản trị viên.' 
            };
          }
          
          // Logout để clear session cho các lỗi khác
          await supabase.auth.signOut();
          return { success: false, error: 'Không thể lấy thông tin tài khoản' };
        }
        
        // Kiểm tra trạng thái trực tiếp từ user profile
        if (userProfile.status === 'terminated') {
          // Logout ngay lập tức
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'Tài khoản đã bị vô hiệu hóa', 
            message: 'Tài khoản của bạn đã bị vô hiệu hóa do đã nghỉ việc. Vui lòng liên hệ quản trị viên nếu có thắc mắc.' 
          };
        }
        
        // Set user data nếu thành công
        setUser(userProfile);
        setIsTokenExpired(false);
        
      } catch (profileError) {
        console.error('Error checking user profile:', profileError);
        // Logout và trả về lỗi
        await supabase.auth.signOut();
        return { success: false, error: 'Lỗi kiểm tra thông tin tài khoản' };
      }
      
      // Success - user data đã được set
      return { success: true };
      
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Đã xảy ra lỗi trong quá trình đăng nhập' };
    }
  };

  const logout = async (): Promise<void> => {
    setIsTokenExpired(false);
    
    try {
      console.log('🔐 Attempting Supabase logout...');
      await supabase.auth.signOut();
      console.log('✅ Supabase logout successful');
      // onAuthStateChange will handle state cleanup
    } catch (error) {
      console.warn('⚠️ Supabase logout failed, using backup logout method:', error);
      // Backup logout: Force clear everything locally
      try {
        await forceLogout();
      } catch (backupError) {
        console.error('❌ Backup logout also failed, using emergency method:', backupError);
        emergencyLogout();
      }
    }
  };

  // Force logout backup method
  const forceLogout = async (): Promise<void> => {
    console.log('🔧 Executing force logout...');
    
    try {
      // Clear all authentication-related data
      localStorage.removeItem('access_token');
      try { await fetch('/api/auth/session', { method: 'DELETE' }); } catch {}
      localStorage.removeItem('supabase.auth.token');
      
      // Clear any other auth-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase') || key.includes('auth') || key.includes('token')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage as well
      sessionStorage.clear();

      // Clear state
      setUser(null);
      setIsTokenExpired(false);
      userIdRef.current = null;
      
      // Stop any running intervals/timeouts
      stopTokenValidityCheck();
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }

      console.log('✅ Force logout completed');

      // Redirect to login page
      if (typeof window !== 'undefined') {
        // Use replace to prevent back button issues
        window.location.replace('/');
      }
    } catch (error) {
      console.error('❌ Force logout failed:', error);
      // Last resort: hard reload
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Hàm xử lý khi JWT hết hạn
  const handleTokenExpired = async () => {
    console.warn('🔐 Token expired, logging out user...');
    setIsTokenExpired(true);
    
    // Delay một chút để UI có thể hiển thị thông báo
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    
    logoutTimeoutRef.current = setTimeout(async () => {
      try {
        await logout();
      } catch (error) {
        console.warn('⚠️ Regular logout failed during token expiry, using force logout:', error);
        await forceLogout();
      }
    }, 2000); // 2 seconds delay
  };

  // Kiểm tra token validity định kỳ
  const startTokenValidityCheck = () => {
    // Clear existing interval
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }

    // Kiểm tra mỗi 5 phút
    tokenCheckIntervalRef.current = setInterval(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          console.warn('🔐 No valid session found during periodic check');
          handleTokenExpired();
        }
      } catch (error) {
        console.error('🔐 Error during token validity check:', error);
        handleTokenExpired();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  const stopTokenValidityCheck = () => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const { data: userProfile, error } = await authService.getCurrentUser();
      if (userProfile && !error) {
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: userProfile, error } = await authService.getCurrentUser();
      if (userProfile && !error) {
        // Kiểm tra trạng thái nhân viên
        if (userProfile.status === 'terminated') {
          console.warn('🚫 User account is terminated, logging out...');
          setUser(null);
          localStorage.removeItem('access_token');
          await supabase.auth.signOut();
          
          // Hiển thị thông báo cho user
          if (typeof window !== 'undefined') {
            alert('Tài khoản của bạn đã bị vô hiệu hóa do đã nghỉ việc. Vui lòng liên hệ quản trị viên nếu có thắc mắc.');
          }
          return;
        }
        
        setUser(userProfile);
        setIsTokenExpired(false);
      } else {
        // Kiểm tra nếu lỗi do account terminated
        if (error && error.error === 'Account terminated') {
          console.warn('🚫 Account terminated error received');
          setUser(null);
          localStorage.removeItem('access_token');
          await supabase.auth.signOut();
          
          // Hiển thị thông báo cho user
          if (typeof window !== 'undefined') {
            alert('Tài khoản của bạn đã bị vô hiệu hóa do đã nghỉ việc. Vui lòng liên hệ quản trị viên nếu có thắc mắc.');
          }
          return;
        }
        
        // Token không hợp lệ hoặc user chưa có trong bảng employees
        setUser(null);
        localStorage.removeItem('access_token');
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Có thể là do JWT hết hạn
      setUser(null);
      localStorage.removeItem('access_token');
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    // Thiết lập callback cho API client để xử lý JWT hết hạn
    apiClient.setTokenExpiredCallback(handleTokenExpired);

    // Check initial session state without triggering listeners
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        userIdRef.current = session.user.id;
        // Refresh HttpOnly cookie on token refresh
        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } catch {}
        await fetchUserProfile();
        startTokenValidityCheck();
      }
      setLoading(false);
    };

    checkInitialSession();

    // Set up the listener for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUserId = session?.user?.id ?? null;
      
      // Act only if the user ID has changed (e.g., login or logout)
      if (newUserId !== userIdRef.current) {
        setLoading(true);
        userIdRef.current = newUserId;
        
        if (newUserId) {
          // New user signed in
          localStorage.setItem('access_token', session!.access_token);
          // KHÔNG gọi fetchUserProfile ở đây để tránh conflict với login function
          // await fetchUserProfile();
          startTokenValidityCheck();
        } else {
          // User signed out
          localStorage.removeItem('access_token');
          setUser(null);
          stopTokenValidityCheck();
        }
        setLoading(false);
      } else if (session && session.access_token) {
        // Handle token refresh: user is the same, but token has changed
        localStorage.setItem('access_token', session.access_token);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      stopTokenValidityCheck();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isTokenExpired,
    emergencyLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 