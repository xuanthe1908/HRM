"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Bell, Shield, Save } from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { supabase } from "@/lib/supabase"
import { TwoFactorAuth } from "@/components/two-factor-auth"
import { toast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState as useReactState } from "react"

type SystemSettings = {
  payroll_notifications: boolean
  onboarding_notifications: boolean
  maintenance_notifications: boolean
  two_factor_auth: boolean
  session_timeout: boolean
  session_timeout_minutes?: number
  audit_logging: boolean
}

export default function AccountSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // Load and save system settings (personal view uses same API but only shows relevant cards)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useReactState<SystemSettings | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        if (!res.ok) return
        const data = await res.json()
        setSettings(data)
      } catch {}
    }
    fetchSettings()
  }, [])

  const handleSaveSettings = async (section: 'notifications' | 'security') => {
    if (!settings) return
    try {
      setSaving(true)
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save')
      const next = await res.json()
      setSettings(next)
      toast({ title: 'Thành công', description: 'Cài đặt đã được lưu' })
    } catch (e: any) {
      toast({ title: 'Lỗi', description: e?.message || 'Không thể lưu cài đặt', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Personal toggles are persisted via backend settings (same API)

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu mới phải có ít nhất 6 ký tự", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Lỗi", description: "Xác nhận mật khẩu không khớp", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      if (currentPassword) {
        const { data: sessionData } = await supabase.auth.getSession()
        const email = sessionData.session?.user?.email
        if (email) {
          const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
          if (reauthErr) {
            toast({ title: "Lỗi", description: "Mật khẩu hiện tại không đúng", variant: "destructive" })
            setLoading(false)
            return
          }
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast({ title: "Lỗi", description: error.message, variant: "destructive" })
        return
      }
      toast({ title: "Thành công", description: "Đã đổi mật khẩu thành công" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } finally {
      setLoading(false)
    }
  }

  const handleGlobalSignOut = async () => {
    try {
      // Supabase v2 supports global sign out
      // @ts-ignore - scope exists in supabase-js
      await supabase.auth.signOut({ scope: "global" })
      toast({ title: "Đã đăng xuất tất cả phiên", description: "Bạn cần đăng nhập lại trên các thiết bị." })
      window.location.replace("/")
    } catch (e: any) {
      console.error(e)
      toast({ title: "Lỗi", description: e?.message || "Không thể đăng xuất toàn bộ phiên", variant: "destructive" })
    }
  }

  return (
    <AuthGuard requireProfileCompletion={false}>
      <div className="flex-1 space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt cá nhân</h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Quản lý mật khẩu đăng nhập của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Xác nhận mật khẩu</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
                <Button variant="outline" onClick={handleGlobalSignOut}>
                  Đăng xuất tất cả phiên
                </Button>
              </div>
            </CardContent>
          </Card>

          {settings && (
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4"/>Cài đặt bảo mật</CardTitle>
              <CardDescription>Quản lý bảo mật và quyền truy cập</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Xác thực 2 bước (bắt buộc cho admin)</div>
                    <div className="text-xs text-muted-foreground">Bật/tắt chính sách bắt buộc 2FA</div>
                  </div>
                  <Switch checked={!!settings.two_factor_auth} onCheckedChange={(v) => setSettings({ ...settings!, two_factor_auth: !!v }) as any} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Timeout phiên làm việc</div>
                    <div className="text-xs text-muted-foreground">Tự động đăng xuất sau thời gian không hoạt động</div>
                  </div>
                  <Switch checked={!!settings.session_timeout} onCheckedChange={(v) => setSettings({ ...settings!, session_timeout: !!v }) as any} />
                </div>
                {settings.session_timeout && (
                  <div className="space-y-2">
                    <Label>Thời gian timeout (phút)</Label>
                    <Input type="number" min="5" max="480" value={settings.session_timeout_minutes || 30} onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) }) as any} className="w-32" />
                  </div>
                )}
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Ghi log hoạt động</div>
                    <div className="text-xs text-muted-foreground">Lưu trữ log các hoạt động quan trọng</div>
                  </div>
                  <Switch checked={!!settings.audit_logging} onCheckedChange={(v) => setSettings({ ...settings!, audit_logging: !!v }) as any} />
                </div>
              </div>
              <Button onClick={() => handleSaveSettings('security')} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Lưu cài đặt bảo mật
              </Button>
            </CardContent>
          </Card>
          )}

          {/* 2FA Setup - its own card to keep layout compact */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Xác thực 2 bước</CardTitle>
              <CardDescription>Quản lý bảo mật 2FA cho tài khoản</CardDescription>
            </CardHeader>
            <CardContent>
              <TwoFactorAuth />
            </CardContent>
          </Card>

          {settings && (
          <Card className="xl:col-span-1 md:col-span-2 xl:md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4"/>Thông báo của tôi</CardTitle>
              <CardDescription>Cài đặt thông báo cá nhân</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="text-sm font-medium">Thông báo lương</div>
                  <div className="text-xs text-muted-foreground">Nhận thông báo khi có bảng lương mới</div>
                </div>
                <Switch checked={!!settings.payroll_notifications} onCheckedChange={(v) => setSettings({ ...settings!, payroll_notifications: !!v }) as any} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="text-sm font-medium">Chào mừng nhân viên mới</div>
                  <div className="text-xs text-muted-foreground">Nhận thông báo chúc mừng</div>
                </div>
                <Switch checked={!!settings.onboarding_notifications} onCheckedChange={(v) => setSettings({ ...settings!, onboarding_notifications: !!v }) as any} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="text-sm font-medium">Bảo trì hệ thống</div>
                  <div className="text-xs text-muted-foreground">Nhận cảnh báo bảo trì</div>
                </div>
                <Switch checked={!!settings.maintenance_notifications} onCheckedChange={(v) => setSettings({ ...settings!, maintenance_notifications: !!v }) as any} />
              </div>
              <Button onClick={() => handleSaveSettings('notifications')} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Lưu cài đặt thông báo
              </Button>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}


