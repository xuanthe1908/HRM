"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Settings, Users, Loader2, Save, Plus } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SystemLogs } from "@/components/system-logs"
import { DatabaseSetupWarning } from "@/components/database-setup-warning"
// Personal security and notifications have moved to /account
import type { SystemSettings } from "@/app/api/settings/route"
import type { UserStats } from "@/app/api/settings/user-stats/route"

export default function SettingsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)

  // Check if user can manage settings (Admin only)
  const canManageSettings = user && user.role === 'admin'

  // Fetch settings and user stats
  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [settingsResponse, statsResponse] = await Promise.all([
        fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/settings/user-stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
      ])

      if (!settingsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [settingsData, statsData] = await Promise.all([
        settingsResponse.json(),
        statsResponse.json()
      ])

      setSettings(settingsData)
      setUserStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu cài đặt",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveSettings = async (section: 'company' | 'notifications' | 'security') => {
    if (!settings) return

    try {
      setSaving(true)
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      
      toast({
        title: "Thành công",
        description: "Cài đặt đã được lưu",
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Đang tải cài đặt...</span>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!canManageSettings) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Truy cập bị từ chối</CardTitle>
              <CardDescription>
                Bạn không có quyền truy cập trang cài đặt. Chỉ Admin mới có thể truy cập.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      admin: 'Quản trị viên',
      hr: 'Nhân sự',
      lead: 'Trưởng nhóm', 
      accountant: 'Kế toán',
      employee: 'Nhân viên'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  return (
    <AuthGuard allowedDbRoles={["admin"]} redirectTo="/forbidden">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cài đặt hệ thống</h1>
            <p className="text-muted-foreground">Quản lý cài đặt và cấu hình hệ thống</p>
          </div>
        </div>

        {/* Database Setup Warning */}
        <DatabaseSetupWarning />

        <div className="grid gap-6">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Thông tin công ty
              </CardTitle>
              <CardDescription>Cập nhật thông tin cơ bản của công ty</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Tên công ty</Label>
                      <Input 
                        id="companyName" 
                        value={settings.company_name}
                        onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email công ty</Label>
                      <Input 
                        id="companyEmail" 
                        type="email" 
                        value={settings.company_email}
                        onChange={(e) => setSettings({...settings, company_email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Số điện thoại</Label>
                      <Input 
                        id="companyPhone" 
                        value={settings.company_phone}
                        onChange={(e) => setSettings({...settings, company_phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Mã số thuế</Label>
                      <Input 
                        id="taxId" 
                        value={settings.tax_id}
                        onChange={(e) => setSettings({...settings, tax_id: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Địa chỉ công ty</Label>
                    <Input 
                      id="companyAddress" 
                      value={settings.company_address}
                      onChange={(e) => setSettings({...settings, company_address: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workingDays">Số ngày làm việc/tháng</Label>
                      <Input 
                        id="workingDays" 
                        type="number"
                        value={settings.working_days_per_month}
                        onChange={(e) => setSettings({...settings, working_days_per_month: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeRate">Tỷ lệ làm thêm (%)</Label>
                      <Input 
                        id="overtimeRate" 
                        type="number"
                        value={settings.overtime_rate}
                        onChange={(e) => setSettings({...settings, overtime_rate: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personalDeduction">Giảm trừ cá nhân (VND)</Label>
                      <Input 
                        id="personalDeduction" 
                        type="number"
                        value={settings.personal_tax_deduction}
                        onChange={(e) => setSettings({...settings, personal_tax_deduction: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('company')}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thông tin công ty
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quản lý người dùng
              </CardTitle>
              <CardDescription>Thống kê và quản lý người dùng trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStats && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-green-600">Tổng người dùng</p>
                        <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                      </div>
                      <Badge variant="default">{userStats.total_users}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-blue-600">Đang hoạt động</p>
                        <p className="text-sm text-muted-foreground">Active users</p>
                      </div>
                      <Badge variant="secondary">{userStats.active_users}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-orange-600">Tạm nghỉ</p>
                        <p className="text-sm text-muted-foreground">Inactive users</p>
                      </div>
                      <Badge variant="outline">{userStats.inactive_users}</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Phân bổ theo vai trò</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{getRoleDisplayName('admin')}</p>
                          <p className="text-sm text-muted-foreground">Quản trị hệ thống</p>
                        </div>
                        <Badge>{userStats.admin_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{getRoleDisplayName('hr')}</p>
                          <p className="text-sm text-muted-foreground">Nhân sự</p>
                        </div>
                        <Badge>{userStats.hr_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{getRoleDisplayName('lead')}</p>
                          <p className="text-sm text-muted-foreground">Quản lý nhóm</p>
                        </div>
                        <Badge variant="secondary">{userStats.lead_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{getRoleDisplayName('accountant')}</p>
                          <p className="text-sm text-muted-foreground">Kế toán</p>
                        </div>
                        <Badge variant="secondary">{userStats.accountant_count}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                        <div>
                          <p className="font-medium">{getRoleDisplayName('employee')}</p>
                          <p className="text-sm text-muted-foreground">Nhân viên</p>
                        </div>
                        <Badge variant="outline">{userStats.employee_count}</Badge>
                      </div>
                    </div>
                  </div>

                  {userStats.by_department.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Phân bổ theo phòng ban</h4>
                      <div className="grid gap-2">
                        {userStats.by_department.map((dept, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{dept.department_name}</span>
                            <Badge variant="outline">{dept.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="pt-4">
                <Button onClick={() => window.location.href = '/employees'}>
                  <Users className="mr-2 h-4 w-4" />
                  Quản lý nhân viên
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Personal notifications and security moved to /account */}
        </div>
      </div>
    </AuthGuard>
  )
}
