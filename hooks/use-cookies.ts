"use client"

import { useEffect, useState } from "react"
import { getCookie, setCookie } from "@/lib/cookie-utils"

export function useCookies<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const cookieValue = getCookie(key)
      if (cookieValue) {
        setValue(JSON.parse(cookieValue))
      }
    } catch {
      // Ignore parsing errors, use initial value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    try {
      setCookie(key, JSON.stringify(value), {
        expires: 365, // 1 year
        path: '/',
        sameSite: 'lax'
      })
    } catch {
      // Ignore cookie setting errors
    }
  }, [key, value])

  return [value, setValue] as const
}

