"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, 
  Activity, 
  Shield, 
  User, 
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Globe
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface SystemLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_url?: string;
  status_code?: number;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

interface LogResponse {
  logs: SystemLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function SystemLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [resourceFilter, setResourceFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  })

  // Check if user can view logs
  const canViewLogs = user && user.role === 'admin'

  const fetchLogs = async (resetOffset = false) => {
    if (!canViewLogs) return

    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: resetOffset ? '0' : pagination.offset.toString(),
      })
      
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter)
      if (resourceFilter) params.append('resource', resourceFilter)
      if (userFilter) params.append('user_name', userFilter)

      const response = await fetch(`/api/settings/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data: LogResponse = await response.json()
      
      if (resetOffset) {
        setLogs(data.logs)
        setPagination({ ...data.pagination, offset: 0 })
      } else {
        setLogs(data.logs)
        setPagination(data.pagination)
      }

    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải system logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dialogOpen) {
      fetchLogs(true)
    }
  }, [dialogOpen, canViewLogs])

  const handleSearch = () => {
    fetchLogs(true)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setActionFilter("all")
    setResourceFilter("")
    setUserFilter("")
    setPagination(prev => ({ ...prev, offset: 0 }))
    setTimeout(() => fetchLogs(true), 100)
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'next' 
      ? pagination.offset + pagination.limit
      : Math.max(0, pagination.offset - pagination.limit)
    
    setPagination(prev => ({ ...prev, offset: newOffset }))
    setTimeout(() => fetchLogs(), 100)
  }

  const handleViewDetails = (log: SystemLog) => {
    setSelectedLog(log)
    setDetailDialogOpen(true)
  }

  if (!canViewLogs) {
    return null
  }

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <User className="h-4 w-4 text-green-500" />
      case 'LOGOUT':
        return <User className="h-4 w-4 text-gray-500" />
      case 'CREATE':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'UPDATE':
      case 'UPDATE_SETTINGS':
        return <Shield className="h-4 w-4 text-orange-500" />
      case 'DELETE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'ACCESS_DENIED':
        return <Shield className="h-4 w-4 text-red-600" />
      case 'GENERATE_PAYROLL':
      case 'APPROVE_PAYROLL':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'text-gray-500'
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600'
    if (statusCode >= 400 && statusCode < 500) return 'text-red-600'
    if (statusCode >= 500) return 'text-red-800'
    return 'text-gray-500'
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
      return date.toLocaleDateString("vi-VN", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Xem log bảo mật
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Activity Logs
            </DialogTitle>
            <DialogDescription>
              Xem lịch sử hoạt động và các sự kiện bảo mật trong hệ thống
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label htmlFor="searchTerm" className="text-xs">Tìm kiếm</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchTerm"
                    placeholder="Tìm kiếm logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="actionFilter" className="text-xs">Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="UPDATE_SETTINGS">Settings</SelectItem>
                    <SelectItem value="PAYROLL">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resourceFilter" className="text-xs">Resource</Label>
                <Input
                  id="resourceFilter"
                  placeholder="Resource filter"
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="userFilter" className="text-xs">User</Label>
                <Input
                  id="userFilter"
                  placeholder="User filter"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} size="sm" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                <Filter className="mr-2 h-3 w-3" />
                Áp dụng filter
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                Xóa filter
              </Button>
              <Button onClick={() => fetchLogs()} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className="mr-2 h-3 w-3" />
                Refresh
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tổng logs</p>
                    <p className="text-xl font-bold">{pagination.total}</p>
                  </div>
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Hiện tại</p>
                    <p className="text-xl font-bold">{logs.length}</p>
                  </div>
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Đang tìm</p>
                    <p className="text-xl font-bold">{filteredLogs.length}</p>
                  </div>
                  <Search className="h-6 w-6 text-orange-500" />
                </div>
              </Card>
            </div>

            {/* Logs List */}
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Đang tải logs...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  {searchTerm || (actionFilter && actionFilter !== 'all') || resourceFilter || userFilter ? 'Không tìm thấy logs phù hợp' : 'Chưa có logs nào'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-0.5">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {log.action}
                            </Badge>
                            {log.status_code && (
                              <Badge variant="outline" className={`text-xs ${getStatusColor(log.status_code)}`}>
                                {log.status_code}
                              </Badge>
                            )}
                            <span className="text-sm font-medium">{log.user_name || 'System'}</span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-1">
                            {log.details}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{log.resource}</span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  <span>{log.ip_address}</span>
                                </div>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                        className="ml-2"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Hiển thị {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} của {pagination.total} logs
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePageChange('prev')}
                  disabled={pagination.offset === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePageChange('next')}
                  disabled={!pagination.hasMore || loading}
                >
                  Tiếp
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Chi tiết Log</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về hoạt động này
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Action</Label>
                    <p className="text-sm">{selectedLog.action}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">User</Label>
                    <p className="text-sm">{selectedLog.user_name || 'System'}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Resource</Label>
                    <p className="text-sm">{selectedLog.resource}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Time</Label>
                    <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <Label className="text-xs font-medium">IP Address</Label>
                      <p className="text-sm">{selectedLog.ip_address}</p>
                    </div>
                  )}
                  {selectedLog.status_code && (
                    <div>
                      <Label className="text-xs font-medium">Status Code</Label>
                      <p className={`text-sm ${getStatusColor(selectedLog.status_code)}`}>
                        {selectedLog.status_code}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedLog.details && (
                  <div>
                    <Label className="text-xs font-medium">Details</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedLog.details}</p>
                  </div>
                )}
                
                {selectedLog.old_values && (
                  <div>
                    <Label className="text-xs font-medium">Old Values</Label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.new_values && (
                  <div>
                    <Label className="text-xs font-medium">New Values</Label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.user_agent && (
                  <div>
                    <Label className="text-xs font-medium">User Agent</Label>
                    <p className="text-xs text-muted-foreground break-all">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 