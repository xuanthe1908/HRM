'use client';

import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from './login-form';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isProfileComplete } from '@/lib/profile-completion-check';
import type { DatabaseRole } from '@/lib/role-types';

interface AuthGuardProps {
  children: React.ReactNode;
  requireProfileCompletion?: boolean;
  allowedDbRoles?: DatabaseRole[]; // optional role-based guard
  redirectTo?: string; // optional custom redirect
}

export function AuthGuard({ children, requireProfileCompletion = true, allowedDbRoles, redirectTo }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    // 1) If user is invited and hasn't set password yet, force set-password first
    if (user.status === 'invite_sent' && pathname !== '/set-password') {
      router.push('/set-password');
      return;
    }

    // 2) Enforce profile completion (but allow set-password route)
    if (
      requireProfileCompletion &&
      !isProfileComplete(user) &&
      pathname !== '/employee/profile' &&
      pathname !== '/set-password'
    ) {
      router.push('/employee/profile');
    }
  }, [user, requireProfileCompletion, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // If profile completion is required but profile is not complete, and we're not on the profile page
  if (requireProfileCompletion && !isProfileComplete(user) && pathname !== '/employee/profile') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang kiểm tra hồ sơ...</span>
        </div>
      </div>
    );
  }

  // Role-based UI guard: if allowedDbRoles is provided and user's role is not allowed
  if (allowedDbRoles && user && !allowedDbRoles.includes(user.role as DatabaseRole)) {
    // Prefer redirect to friendly Forbidden page (or custom)
    if (redirectTo) {
      router.replace(redirectTo);
    } else {
      router.replace('/forbidden');
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang chuyển hướng...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 