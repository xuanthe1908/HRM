"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Bell,
  Search,
  Settings,
  Plus,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Calendar,
  CreditCard,
  Users,
  Receipt,
  Megaphone,
  Clock,
  Loader2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { NotificationTriggers } from "@/components/notification-triggers"
import type { Notification, NotificationSettings, CreateNotificationRequest } from "@/types/notification"
import { useLanguage } from "@/contexts/language-context"

export default function NotificationsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [notificationList, setNotificationList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterRead, setFilterRead] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    categories: {
      payroll: true,
      attendance: true,
      leave: true,
      expense: true,
      system: true,
      announcement: true,
    },
  })

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotificationList(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách thông báo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Thống kê
  const unreadCount = notificationList.filter((n) => !n.is_read).length
  const todayCount = notificationList.filter((n) => {
    const today = new Date().toDateString()
    const notificationDate = new Date(n.created_at).toDateString()
    return today === notificationDate
  }).length

  // Lọc thông báo
  const filteredNotifications = notificationList.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || notification.category === filterCategory
    const matchesType = filterType === "all" || notification.type === filterType
    const matchesRead =
      filterRead === "all" ||
      (filterRead === "read" && notification.is_read) ||
      (filterRead === "unread" && !notification.is_read)

    return matchesSearch && matchesCategory && matchesType && matchesRead
  })

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ is_read: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      setNotificationList((prev) => 
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error('Error marking as read:', error)
      toast({
        title: "Lỗi",
        description: "Không thể đánh dấu đã đọc",
        variant: "destructive",
      })
    }
  }

  const handleAction = async (notification: Notification) => {
    try {
      if (!notification.action_url) return
      if (!notification.is_read) {
        await handleMarkAsRead(notification.id)
      }
      router.push(notification.action_url)
    } catch (error) {
      console.error('Error handling notification action:', error)
      toast({ title: 'Lỗi', description: 'Không thể mở liên kết hành động', variant: 'destructive' })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notificationList.filter(n => !n.is_read)
      
      // Mark all unread notifications as read
      const promises = unreadNotifications.map(notification =>
        fetch(`/api/notifications/${notification.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({ is_read: true }),
        })
      )

      await Promise.all(promises)
      
      setNotificationList((prev) => prev.map((n) => ({ ...n, is_read: true })))
      
      toast({
        title: "Thành công",
        description: "Đã đánh dấu tất cả thông báo là đã đọc",
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: "Lỗi",
        description: "Không thể đánh dấu tất cả đã đọc",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      setNotificationList((prev) => prev.filter((n) => n.id !== id))
      
      toast({
        title: "Thành công",
        description: "Đã xóa thông báo",
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa thông báo",
        variant: "destructive",
      })
    }
  }

  const handleCreateNotification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)

    try {
      const formData = new FormData(event.currentTarget)
      
      const targetRole = formData.get("target_role") as string;
      
      const notificationData: CreateNotificationRequest = {
        title: formData.get("title") as string,
        message: formData.get("message") as string,
        type: formData.get("type") as "info" | "success" | "warning" | "error",
        category: formData.get("category") as "payroll" | "attendance" | "leave" | "expense" | "system" | "announcement",
        target_role: targetRole === "all" ? undefined : (targetRole as "admin" | "hr" | "lead" | "accountant" | "employee"),
        priority: (formData.get("priority") as "low" | "medium" | "high") || "medium",
        action_url: (formData.get("action_url") as string) || undefined,
        action_text: (formData.get("action_text") as string) || undefined,
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(notificationData),
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      const newNotification = await response.json()
      setNotificationList([newNotification, ...notificationList])
      setIsCreateDialogOpen(false)
      
      toast({
        title: "Thành công",
        description: "Đã tạo thông báo mới",
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tạo thông báo",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "payroll":
        return <CreditCard className="h-4 w-4" />
      case "attendance":
        return <Clock className="h-4 w-4" />
      case "leave":
        return <Calendar className="h-4 w-4" />
      case "expense":
        return <Receipt className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      case "announcement":
        return <Megaphone className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Cao</Badge>
      case "medium":
        return <Badge variant="secondary">Trung bình</Badge>
      case "low":
        return <Badge variant="outline">Thấp</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Vừa xong"
    } else if (diffInHours < 24) {
      return `${diffInHours} giờ trước`
    } else {
      return date.toLocaleDateString("vi-VN")
    }
  }

  // Check if user can create notifications (Admin and HR can both create notifications)
  const canCreateNotifications = user && (user.role === 'admin' || user.role === 'hr')

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Đang tải thông báo...</span>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Thông báo</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Đánh dấu tất cả đã đọc
            </Button>
            {canCreateNotifications && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo thông báo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle>Tạo thông báo mới</DialogTitle>
                    <DialogDescription>Gửi thông báo đến nhân viên theo vai trò</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateNotification} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Tiêu đề</Label>
                      <Input id="title" name="title" placeholder="Nhập tiêu đề thông báo" required autoFocus />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Nội dung</Label>
                      <Textarea id="message" name="message" placeholder="Nhập nội dung thông báo" rows={3} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Loại thông báo</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Thông tin</SelectItem>
                            <SelectItem value="success">Thành công</SelectItem>
                            <SelectItem value="warning">Cảnh báo</SelectItem>
                            <SelectItem value="error">Lỗi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Danh mục</Label>
                        <Select name="category" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="payroll">Lương</SelectItem>
                            <SelectItem value="attendance">Chấm công</SelectItem>
                            <SelectItem value="leave">Nghỉ phép</SelectItem>
                            <SelectItem value="expense">Chi phí</SelectItem>
                            <SelectItem value="system">Hệ thống</SelectItem>
                            <SelectItem value="announcement">Thông báo chung</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="target_role">Gửi đến vai trò</Label>
                        <Select name="target_role">
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn vai trò (tùy chọn)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả mọi người</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Độ ưu tiên</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Thấp</SelectItem>
                            <SelectItem value="medium">Trung bình</SelectItem>
                            <SelectItem value="high">Cao</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="action_url">Link hành động (tùy chọn)</Label>
                        <Input id="action_url" name="action_url" placeholder="/page-url" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="action_text">Text nút (tùy chọn)</Label>
                        <Input id="action_text" name="action_text" placeholder="Xem chi tiết" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        disabled={isCreating}
                      >
                        Hủy
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gửi thông báo
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="notifications">
              Thông báo
            </TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {/* Thống kê */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chưa đọc</CardTitle>
                  <Bell className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
                  <p className="text-xs text-muted-foreground">Thông báo cần xem</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{todayCount}</div>
                  <p className="text-xs text-muted-foreground">Thông báo mới</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tổng cộng</CardTitle>
                  <Users className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{notificationList.length}</div>
                  <p className="text-xs text-muted-foreground">Tất cả thông báo</p>
                </CardContent>
              </Card>
            </div>

            {/* Bộ lọc và danh sách */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách thông báo</CardTitle>
                <CardDescription>Quản lý và theo dõi tất cả thông báo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm thông báo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      <SelectItem value="payroll">Lương</SelectItem>
                      <SelectItem value="attendance">Chấm công</SelectItem>
                      <SelectItem value="leave">Nghỉ phép</SelectItem>
                      <SelectItem value="expense">Chi phí</SelectItem>
                      <SelectItem value="system">Hệ thống</SelectItem>
                      <SelectItem value="announcement">Thông báo chung</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại</SelectItem>
                      <SelectItem value="info">Thông tin</SelectItem>
                      <SelectItem value="success">Thành công</SelectItem>
                      <SelectItem value="warning">Cảnh báo</SelectItem>
                      <SelectItem value="error">Lỗi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterRead} onValueChange={setFilterRead}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="unread">Chưa đọc</SelectItem>
                      <SelectItem value="read">Đã đọc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 ${
                        !notification.is_read ? "bg-blue-50 border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(notification.type)}
                          {getCategoryIcon(notification.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-medium ${!notification.is_read ? "font-semibold" : ""}`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{formatDate(notification.created_at)}</span>
                            <span>•</span>
                            <span>{notification.creator?.name || 'Hệ thống'}</span>
                            {notification.target_role && (
                              <>
                                <span>•</span>
                                <span>Gửi đến: {notification.target_role.toUpperCase()}</span>
                              </>
                            )}
                            {!notification.target_role && notification.target_users && notification.target_users.length > 0 && (
                              <>
                                <span>•</span>
                                <span>Gửi đến: Tất cả ({notification.target_users.length} người)</span>
                              </>
                            )}
                          </div>
                          {notification.action_url && notification.action_text && (
                            <Button variant="link" size="sm" className="p-0 h-auto mt-2" onClick={() => handleAction(notification)}>
                              {notification.action_text}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {!notification.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(notification.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredNotifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {notificationList.length === 0 ? "Chưa có thông báo nào" : "Không tìm thấy thông báo nào phù hợp"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {/* Notification Triggers for Admin/HR */}
            <NotificationTriggers />
            
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt thông báo</CardTitle>
                <CardDescription>Tùy chỉnh cách bạn nhận thông báo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Phương thức nhận thông báo</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">Email</Label>
                      <Switch
                        id="email-notifications"
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-notifications">Thông báo đẩy</Label>
                      <Switch
                        id="push-notifications"
                        checked={settings.pushNotifications}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, pushNotifications: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Danh mục thông báo</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payroll-notifications">Lương</Label>
                      <Switch
                        id="payroll-notifications"
                        checked={settings.categories.payroll}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            categories: { ...prev.categories, payroll: checked },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="leave-notifications">Nghỉ phép</Label>
                      <Switch
                        id="leave-notifications"
                        checked={settings.categories.leave}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            categories: { ...prev.categories, leave: checked },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="expense-notifications">Chi phí</Label>
                      <Switch
                        id="expense-notifications"
                        checked={settings.categories.expense}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            categories: { ...prev.categories, expense: checked },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-notifications">Hệ thống</Label>
                      <Switch
                        id="system-notifications"
                        checked={settings.categories.system}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            categories: { ...prev.categories, system: checked },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="announcement-notifications">Thông báo chung</Label>
                      <Switch
                        id="announcement-notifications"
                        checked={settings.categories.announcement}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            categories: { ...prev.categories, announcement: checked },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button>Lưu cài đặt</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}
