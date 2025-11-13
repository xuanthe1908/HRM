/**
 * Authentication utility functions
 */

/**
 * Force logout backup method
 * Used when normal Supabase logout fails
 */
export const forceLogoutBackup = (): void => {
  console.log('🔧 Executing backup force logout...')
  
  try {
    // Clear all localStorage
    if (typeof window !== 'undefined') {
      // Clear specific auth items first
      const authKeys = [
        'access_token',
        'supabase.auth.token',
        'sb-auth-token',
      ]
      
      authKeys.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      // Clear any supabase or auth related items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase') || 
            key.includes('auth') || 
            key.includes('token') ||
            key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase') || 
            key.includes('auth') || 
            key.includes('token') ||
            key.startsWith('sb-')) {
          sessionStorage.removeItem(key)
        }
      })
      
      console.log('✅ Force logout backup completed')
      
      // Redirect to login page with replace to prevent back button issues
      window.location.replace('/')
    }
  } catch (error) {
    console.error('❌ Force logout backup failed:', error)
    // Last resort: hard reload
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }
}

/**
 * Safe logout wrapper that always succeeds
 * @param logoutFn - The main logout function to try first
 */
export const safeLogout = async (logoutFn: () => Promise<void>): Promise<void> => {
  try {
    await logoutFn()
  } catch (error) {
    console.warn('⚠️ Primary logout failed, using backup method:', error)
    forceLogoutBackup()
  }
}

/**
 * Check if we're in a valid authentication state
 */
export const isValidAuthState = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const hasToken = localStorage.getItem('access_token') !== null
  const hasSupabaseSession = Object.keys(localStorage).some(key => 
    key.startsWith('supabase') && key.includes('auth')
  )
  
  return hasToken || hasSupabaseSession
}

/**
 * Emergency logout - clears everything and redirects immediately
 * Use this as a last resort when everything else fails
 */
export const emergencyLogout = (): void => {
  console.log('🚨 Emergency logout triggered')
  
  if (typeof window !== 'undefined') {
    // Clear everything
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies (best effort)
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
    
    // Force redirect
    window.location.replace('/')
  }
}
