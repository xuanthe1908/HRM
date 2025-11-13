"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, LogOut } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export function JwtExpiryNotification() {
  const { isTokenExpired, logout, emergencyLogout } = useAuth()
  const [countdown, setCountdown] = useState(2)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
  }

  useEffect(() => {
    if (!isTokenExpired) {
      clearTimers()
      return
    }

    // reset đếm ngược
    setCountdown(2)
    clearTimers()

    // hiển thị đếm ngược
    intervalRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)

    // auto-logout khi hết thời gian
    timeoutRef.current = window.setTimeout(async () => {
      setIsLoggingOut(true)
      try {
        await logout()
      } catch (e) {
        console.error("Auto logout failed, forcing...", e)
        emergencyLogout()
      }
    }, 2000)

    return clearTimers
  }, [isTokenExpired, logout, emergencyLogout])

  const handleLogout = async () => {
    clearTimers()
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed in notification:", error)
      // dự phòng cuối
      emergencyLogout()
    }
  }

  const handleForceLogout = () => {
    clearTimers()
    emergencyLogout()
  }

  if (!isTokenExpired) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <Alert variant="destructive" className="border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <div className="space-y-3">
              <div className="font-semibold">Phiên đăng nhập đã hết hạn</div>
              <div className="text-sm">
                Để bảo mật thông tin, bạn sẽ được tự động đăng xuất trong{" "}
                <span className="font-bold text-red-600">{countdown}</span> giây.
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất ngay"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceLogout}
                  className="flex items-center gap-2 text-red-700 border-red-300 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Force Logout
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
