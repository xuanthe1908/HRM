"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Bell, 
  Settings, 
  Clock, 
  Users, 
  DollarSign,
  AlertTriangle,
  Loader2,
  Zap
} from "lucide-react"

export function NotificationTriggers() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Check if user can trigger notifications (Admin and HR can both trigger notifications)
  const canTrigger = user && (user.role === 'admin' || user.role === 'hr')

  if (!canTrigger) {
    return null
  }

  const triggerNotification = async (triggerType: string, params: any = {}) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/triggers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ triggerType, ...params }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger notification')
      }

      toast({
        title: "Thành công",
        description: result.message,
      })
      
      if (result.note) {
        toast({
          title: "Lưu ý",
          description: result.note,
          variant: "default",
        })
      }
      
      setDialogOpen(false)
    } catch (error) {
      console.error('Error triggering notification:', error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể gửi thông báo",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerMaintenanceWithTime = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    
    if (startTime && endTime) {
      await triggerNotification('system_maintenance', { startTime, endTime })
    } else {
      await triggerNotification('system_maintenance')
    }
  }

  const triggers = [
    {
      id: 'system_maintenance',
      name: 'Bảo trì hệ thống',
      description: 'Thông báo bảo trì đến tất cả user',
      settingControl: 'Maintenance Notifications',
      icon: <Settings className="h-5 w-5" />,
      color: 'bg-orange-50 border-orange-200',
      action: () => triggerNotification('system_maintenance'),
      hasCustomDialog: true
    },
    {
      id: 'payroll_generated',
      name: 'Tạo lương mới',
      description: 'Thông báo lương tháng hiện tại đã được tạo',
      settingControl: 'Payroll Notifications',
      icon: <DollarSign className="h-5 w-5 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
      action: () => triggerNotification('payroll_generated')
    },
    {
      id: 'payroll_approval',
      name: 'Duyệt lương',
      description: 'Thông báo lương tháng hiện tại đã được duyệt',
      settingControl: 'Payroll Notifications',
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      color: 'bg-green-50 border-green-200',
      action: () => triggerNotification('payroll_approval')
    },
    {
      id: 'employee_welcome',
      name: 'Chào mừng nhân viên',
      description: 'Gửi lời chào mừng đến nhân viên gần nhất',
      settingControl: 'Onboarding Notifications',
      icon: <Users className="h-5 w-5 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200',
      action: () => triggerNotification('employee_welcome')
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Manual Triggers (Test)
        </CardTitle>
        <CardDescription>
          Test các loại thông báo. Chỉ gửi khi settings tương ứng được BẬT.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={`p-4 border rounded-lg ${trigger.color} transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {trigger.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{trigger.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {trigger.settingControl}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {trigger.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {trigger.hasCustomDialog ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isLoading}
                        >
                          <Settings className="mr-1 h-3 w-3" />
                          Cấu hình
                        </Button>
                      </DialogTrigger>
                      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                        <DialogHeader>
                          <DialogTitle>Thông báo bảo trì hệ thống</DialogTitle>
                          <DialogDescription>
                            Gửi thông báo bảo trì đến tất cả người dùng (nếu Maintenance Notifications được bật)
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={triggerMaintenanceWithTime} className="space-y-4">
                          <div>
                            <Label htmlFor="startTime">Thời gian bắt đầu (tùy chọn)</Label>
                            <Input 
                              id="startTime" 
                              name="startTime" 
                              placeholder="VD: 22:00 ngày 15/12/2024" 
                              autoFocus
                            />
                          </div>
                          <div>
                            <Label htmlFor="endTime">Thời gian kết thúc (tùy chọn)</Label>
                            <Input 
                              id="endTime" 
                              name="endTime" 
                              placeholder="VD: 02:00 ngày 16/12/2024" 
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Gửi thông báo
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => triggerNotification('system_maintenance')}
                              disabled={isLoading}
                            >
                              Dùng thời gian mặc định
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={trigger.action}
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      <Bell className="mr-1 h-3 w-3" />
                      Gửi
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Cách hoạt động:</p>
              <ul className="space-y-1 text-xs">
                <li>• Chỉ gửi notification khi settings tương ứng được BẬT</li>
                <li>• Nếu TẮT → Log "disabled, skipping..." và không gửi</li>
                <li>• Xem Browser Console để debug</li>
                <li>• Thay đổi settings ở trên để test on/off</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 