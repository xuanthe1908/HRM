"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export function useNotificationCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!user) {
        setCount(0)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch notifications')
        }

        const notifications = await response.json()
        const unreadCount = notifications.filter((n: any) => !n.is_read).length
        setCount(unreadCount)
      } catch (error) {
        console.error('Error fetching notification count:', error)
        setCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchNotificationCount()

    // Refetch every 30 seconds to keep count updated
    const interval = setInterval(fetchNotificationCount, 30000)

    return () => clearInterval(interval)
  }, [user])

  return { count, loading }
}
