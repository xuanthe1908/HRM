"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'

export default function DebugAttendancePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Test employee attendance API
      console.log('Testing employee attendance API...')
      const response = await apiClient.get('/employee/attendance')
      console.log('API Response:', response)
      
      setResult({
        success: true,
        data: response.data,
        error: response.error
      })
    } catch (err) {
      console.error('API Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testUserMapping = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing user-employee mapping...')
      const response = await fetch('/api/debug/user-employee-mapping', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      const text = await response.text()
      console.log('Response status:', response.status)
      console.log('Response text:', text)
      
      let data = null
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
      
      setResult({
        success: response.ok,
        status: response.status,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (err) {
      console.error('User mapping error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testDirectFetch = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing direct fetch...')
      const response = await fetch('/api/employee/attendance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })
      
      const text = await response.text()
      console.log('Response status:', response.status)
      console.log('Response text:', text)
      
      let data = null
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
      
      setResult({
        success: response.ok,
        status: response.status,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (err) {
      console.error('Direct fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Employee Attendance API</h1>
      
      <div className="flex gap-4 flex-wrap">
        <Button onClick={testUserMapping} disabled={loading}>
          Test User-Employee Mapping
        </Button>
        <Button onClick={testAPI} disabled={loading}>
          Test với apiClient
        </Button>
        <Button onClick={testDirectFetch} disabled={loading}>
          Test với fetch trực tiếp
        </Button>
      </div>

      {loading && <p>Đang test...</p>}
      {error && <p className="text-red-500">Lỗi: {error}</p>}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả test API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 