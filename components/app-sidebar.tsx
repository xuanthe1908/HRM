"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Calendar,
  CreditCard,
  Home,
  Settings,
  User,
  Users,
  LogOut,
  Shield,
  Calculator,
  ClipboardList,
  Receipt,
  Wallet,
  Bell,
  Clock,
  DollarSign,
  FileText,
  Building,
  Briefcase,
} from "lucide-react"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { isProfileComplete } from "@/lib/profile-completion-check"
import { toast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useNotificationCount } from "@/hooks/use-notification-count"
import { 
  mapDatabaseRoleToUI, 
  hasEmployeeManagementAccess as checkEmployeeAccess, 
  hasFinanceManagementAccess as checkFinanceAccess, 
  canToggleViews,
  getRoleDisplayName,
  hasAdminAccess,
  hasHRAccess,
  canManagePayroll,
  canManageBudgets,
  canManageSystemSettings,
  canApproveExpenseRequests,
  type DatabaseRole,
  type UIRole 
} from "@/lib/role-types"

export function AppSidebar() {
  const { user, logout, emergencyLogout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const { count: notificationCount } = useNotificationCount()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle logout with backup logic
  const handleLogout = async () => {
    try {
      console.log('🔐 Attempting logout from sidebar...')
      await logout()
    } catch (error) {
      console.warn('⚠️ Sidebar logout failed, using emergency method:', error)
      emergencyLogout()
    }
  }

  // Use centralized role mapping
  const getUserRole = useCallback((): UIRole => {
    if (!user) return "Employee"
    return mapDatabaseRoleToUI(user.role as DatabaseRole)
  }, [user])

  // Use centralized access control functions
  const hasEmployeeAccess = useCallback((): boolean => {
    if (!user) return false
    return checkEmployeeAccess(user.role as DatabaseRole)
  }, [user])

  const hasFinanceAccess = useCallback((): boolean => {
    if (!user) return false
    return checkFinanceAccess(user.role as DatabaseRole)
  }, [user])

  // New permission checks for Admin/HR separation
  const isAdmin = useCallback((): boolean => {
    if (!user) return false
    return hasAdminAccess(user.role as DatabaseRole)
  }, [user])

  const isHR = useCallback((): boolean => {
    if (!user) return false
    return hasHRAccess(user.role as DatabaseRole)
  }, [user])

  const canAccessPayroll = useCallback((): boolean => {
    if (!user) return false
    return canManagePayroll(user.role as DatabaseRole)
  }, [user])

  const canAccessBudgets = useCallback((): boolean => {
    if (!user) return false
    return canManageBudgets(user.role as DatabaseRole)
  }, [user])

  const canAccessSettings = useCallback((): boolean => {
    if (!user) return false
    return canManageSystemSettings(user.role as DatabaseRole)
  }, [user])

  const canAccessExpenseApproval = useCallback((): boolean => {
    if (!user) return false
    return canApproveExpenseRequests(user.role as DatabaseRole)
  }, [user])

  // Map database roles to sidebar roles
  const userRole = getUserRole()
  
  // Determine view mode based on URL for manager-level roles
  const isPersonalView = searchParams.get('view') === 'personal'
  const [viewMode, setViewMode] = useState<"Management" | "Personal">(() => {
    // Manager-level roles can toggle between views
    if (userRole === "HR" || userRole === "Accountant" || isAdmin()) {
      return isPersonalView ? "Personal" : "Management"
    }
    return "Personal"
  })

  // When the user's role changes or URL changes, reset the view mode
  useEffect(() => {
    // Manager-level roles can toggle between views
    if (userRole === "HR" || userRole === "Accountant" || isAdmin()) {
      setViewMode(isPersonalView ? "Personal" : "Management")
    } else {
      setViewMode("Personal")
    }
  }, [userRole, isPersonalView, isAdmin])


  // Function to check if a menu item is active
  const isActive = (url: string): boolean => {
    // Exact match for home page
    if (url === "/" && pathname === "/") return true
    
    // Special case for leave-requests: check view mode
    if (url === "/leave-requests" && pathname === "/leave-requests") {
      return true;
    }
    
    // For other pages, check if current path starts with the menu URL
    // This handles sub-pages correctly
    if (url !== "/" && pathname.startsWith(url)) {
      // Special case: if we're on /employee/*, only highlight employee menu items
      if (pathname.startsWith("/employee/") && !url.startsWith("/employee/")) {
        return false
      }
      // Special case: if we're on /payroll/*, highlight payroll menu
      if (pathname.startsWith("/payroll/") && url === "/payroll") {
        return true
      }
      // Special case: if we're on /attendance/*, highlight attendance menu
      if (pathname.startsWith("/attendance/") && url === "/attendance") {
        return true
      }
      // Special case: if we're on /employees/*, highlight employees menu
      if (pathname.startsWith("/employees/") && url === "/employees") {
        return true
      }
      // Special case: if we're on /departments/*, highlight departments menu
      if (pathname.startsWith("/departments/") && url === "/departments") {
        return true
      }
      // Special case: if we're on /positions/*, highlight positions menu
      if (pathname.startsWith("/positions/") && url === "/positions") {
        return true
      }
      // Special case: if we're on /leave-requests/*, highlight leave-requests menu
      if (pathname.startsWith("/leave-requests/") && url === "/leave-requests") {
        return true
      }
      // Special case: if we're on /leave-requests with query params, highlight leave-requests menu
      if (pathname === "/leave-requests" && url === "/leave-requests") {
        return true
      }
      // Special case: if we're on /expenses/*, highlight expenses menu
      if (pathname.startsWith("/expenses/") && url === "/expenses") {
        return true
      }
      // Special case: if we're on /my-expenses, highlight my-expenses menu
      if (pathname === "/my-expenses" && url === "/my-expenses") {
        return true
      }
      // Special case: if we're on /manage-expenses, highlight manage-expenses menu
      if (pathname === "/manage-expenses" && url === "/manage-expenses") {
        return true
      }
      // Special case: if we're on /employee-balances/*, highlight employee-balances menu
      if (pathname.startsWith("/employee-balances/") && url === "/employee-balances") {
        return true
      }
      // Special case: if we're on /financials/*, highlight financials menu
      if (pathname.startsWith("/financials/") && url === "/financials") {
        return true
      }
      // Special case: if we're on /notifications/*, highlight notifications menu
      if (pathname.startsWith("/notifications/") && url === "/notifications") {
        return true
      }
      // Special case: if we're on /settings/*, highlight settings menu
      if (pathname.startsWith("/settings/") && url === "/settings") {
        return true
      }
      return true
    }
    
    return false
  }

  const hrMenuItems = [
    {
      title: t("nav.dashboard"),
      url: "/",
      icon: Home,
    },
    {
      title: t("nav.employees"),
      url: "/employees",
      icon: Users,
    },
    {
      title: t("nav.attendance"),
      url: "/attendance",
      icon: Calendar,
    },
    {
      title: t("nav.payroll"),
      url: "/payroll",
      icon: CreditCard,
    },
    {
      title: t("nav.calculatePayroll"),
      url: "/calculate-payroll",
      icon: Calculator,
    },
    {
      title: "Quản lý nghỉ phép",
      url: "/leave-requests",
      icon: ClipboardList,
    },
    {
      title: "Duyệt chi phí",
      url: "/manage-expenses",
      icon: Receipt,
    },
    {
      title: "Quản lý số dư nhân viên",
      url: "/employee-balances",
      icon: Wallet,
    },
    {
      title: "Quản lý Thu-Chi",
      url: "/financials",
      icon: DollarSign,
    },
    {
      title: "Thông báo",
      url: "/notifications",
      icon: Bell,
    },
    {
      title: t("nav.settings"),
      url: "/settings",
      icon: Settings,
    },
  ]

  const employeeMenuItems = [
    {
      title: "Hồ sơ của tôi",
      url: "/employee/profile",
      icon: User,
    },
    {
      title: t("nav.myPayroll"),
      url: "/employee/payroll",
      icon: CreditCard,
    },
    {
      title: t("nav.myAttendance"),
      url: "/employee/attendance",
      icon: Calendar,
    },
    {
      title: "Đơn nghỉ phép",
      url: "/leave-requests",
      icon: ClipboardList,
    },
    {
      title: "Xin cấp chi phí",
      url: "/my-expenses",
      icon: Receipt,
    },
    {
      title: "Thông báo",
      url: "/notifications",
      icon: Bell,
    },
  ]

  const menuItems = viewMode === "Management" ? hrMenuItems : employeeMenuItems
  const profileIncomplete = !!user && !isProfileComplete(user)
  const isAllowedPath = (url: string) => url === "/employee/profile"
  const onNavClick = (e: React.MouseEvent, url: string) => {
    if (profileIncomplete && !isAllowedPath(url)) {
      e.preventDefault()
      toast({ title: "Vui lòng hoàn thiện hồ sơ", description: "Bạn cần hoàn thiện hồ sơ trước khi truy cập các chức năng khác." })
      router.push("/employee/profile")
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Image
            src="/logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">TDSolution</span>
            <span className="text-xs text-muted-foreground">v2.0</span>
          </div>
        </div>
      </SidebarHeader>

      <ScrollArea className="h-full flex-1">
        <SidebarContent className="p-4">
          {/* Main Dashboard */}
          <SidebarGroup>
            <SidebarGroupLabel>Tổng quan</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")}>
                    <Link href="/" onClick={(e) => onNavClick(e, "/")}>
                      <span>Tổng quan</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {viewMode === "Management" && (
            <>
              {/* Employee Management - HR/Admin only (Accountant: not allowed) */}
              {hasEmployeeAccess() && userRole !== "Accountant" && (
                <SidebarGroup>
                  <SidebarGroupLabel>Quản lý nhân sự</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/employees")}>
                          <Link href="/employees" onClick={(e) => onNavClick(e, "/employees")}>
                            <Users className="h-4 w-4" />
                            <span>Nhân viên</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/departments")}>
                          <Link href="/departments" onClick={(e) => onNavClick(e, "/departments")}>
                            <Building className="h-4 w-4" />
                            <span>Phòng ban</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/positions")}>
                          <Link href="/positions" onClick={(e) => onNavClick(e, "/positions")}>
                            <Briefcase className="h-4 w-4" />
                            <span>Chức vụ</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/attendance")}>
                          <Link href="/attendance" onClick={(e) => onNavClick(e, "/attendance")}>
                            <Clock className="h-4 w-4" />
                            <span>Chấm công</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {/* Attendance - For Accountant users who can't access Employee Management */}
              {viewMode === "Management" && !hasEmployeeAccess() && (
                <SidebarGroup>
                  <SidebarGroupLabel>Chấm công</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/attendance")}>
                          <Link href="/attendance" onClick={(e) => onNavClick(e, "/attendance")}>
                            <Clock className="h-4 w-4" />
                            <span>Chấm công</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {/* Payroll & Finance - Admin and Accountant only (HR restricted) */}
              {(isAdmin() || userRole === "Accountant") && (
                <SidebarGroup>
                  <SidebarGroupLabel>Lương & Tài chính</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/payroll")}>
                          <Link href="/payroll" onClick={(e) => onNavClick(e, "/payroll")}>
                            <DollarSign className="h-4 w-4" />
                            <span>Bảng lương</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/calculate-payroll")}>
                          <Link href="/calculate-payroll" onClick={(e) => onNavClick(e, "/calculate-payroll")}>
                            <Calculator className="h-4 w-4" />
                            <span>Tính lương</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {canAccessBudgets() && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/financials")}>
                            <Link href="/financials" onClick={(e) => onNavClick(e, "/financials")}>
                              <Wallet className="h-4 w-4" />
                              <span>Quản lý Thu-Chi</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </>
          )}

          {/* Employee Self-Service */}
          {viewMode === "Personal" && (
            <SidebarGroup>
              <SidebarGroupLabel>Lương của tôi</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/employee/payroll")}>
                      <Link href="/employee/payroll" onClick={(e) => onNavClick(e, "/employee/payroll")}>
                        <DollarSign className="h-4 w-4" />
                        <span>Lương của tôi</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/employee/attendance")}>
                      <Link href="/employee/attendance" onClick={(e) => onNavClick(e, "/employee/attendance")}>
                        <Clock className="h-4 w-4" />
                        <span>Chấm công của tôi</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Requests & Approvals */}
          <SidebarGroup>
            <SidebarGroupLabel>Duyệt & Phê duyệt</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!(viewMode === "Management" && userRole === "Accountant") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive(viewMode === "Management" ? "/manage-leave-requests" : "/my-leave-requests")}>
                      <Link href={viewMode === "Management" ? "/manage-leave-requests" : "/my-leave-requests"} onClick={(e) => onNavClick(e, viewMode === "Management" ? "/manage-leave-requests" : "/my-leave-requests")}>
                        <ClipboardList className="h-4 w-4" />
                        <span>{viewMode === "Management" ? "Quản lý nghỉ phép" : "Đơn nghỉ phép"}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* Expense approval - Admin and Accountant only (HR restricted) */}
                {(isAdmin() || userRole === "Accountant") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive(viewMode === "Management" ? "/manage-expenses" : "/my-expenses")}>
                      <Link href={viewMode === "Management" ? "/manage-expenses" : "/my-expenses"} onClick={(e) => onNavClick(e, viewMode === "Management" ? "/manage-expenses" : "/my-expenses")}>
                        <Receipt className="h-4 w-4" />
                        <span>{viewMode === "Management" ? "Duyệt chi phí" : "Xin cấp chi phí"}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* Employee balances - Admin and Accountant only (HR restricted) */}
                {viewMode === "Management" && (isAdmin() || userRole === "Accountant") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/employee-balances")}>
                      <Link href="/employee-balances" onClick={(e) => onNavClick(e, "/employee-balances")}>
                        <Wallet className="h-4 w-4" />
                        <span>Quản lý số dư nhân viên</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {/* General Requests - Admin and HR only */}
                {viewMode === "Management" && (isAdmin() || isHR()) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/general-requests")}>
                      <Link href="/general-requests" onClick={(e) => onNavClick(e, "/general-requests")}>
                        <FileText className="h-4 w-4" />
                        <span>Yêu cầu chung</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Personal Profile - Employee Only */}
          {viewMode === "Personal" && (
            <SidebarGroup>
              <SidebarGroupLabel>Hồ sơ cá nhân</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/employee/profile")}>
                      <Link href="/employee/profile" onClick={(e) => onNavClick(e, "/employee/profile")}>
                        <User className="h-4 w-4" />
                        <span>Hồ sơ của tôi</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/account")}>
                      <Link href="/account" onClick={(e) => onNavClick(e, "/account")}>
                        <Settings className="h-4 w-4" />
                        <span>Cài đặt cá nhân</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}


          {/* Communications */}
          <SidebarGroup>
            <SidebarGroupLabel>Thông tin & Liên lạc</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/notifications")}>
                    <Link href="/notifications" onClick={(e) => onNavClick(e, "/notifications")}>
                      <Bell className="h-4 w-4" />
                      <span>Thông báo</span>
                      {notificationCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs min-w-[1.5rem] h-5 flex items-center justify-center rounded-full">
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* System Settings - Admin Only */}
          {isAdmin() && (
            <SidebarGroup>
              <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/settings")}>
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                        <span>Hệ thống</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </ScrollArea>

      <SidebarFooter>
        <div className="p-2">
          {(userRole === "HR" || userRole === "Accountant" || isAdmin()) ? (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-3 mb-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Vai trò: {user?.role ? getRoleDisplayName(user.role as DatabaseRole) : "Nhân viên"}
                </span>
              </div>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={value => {
                  if (value) setViewMode(value as "Management" | "Personal")
                }}
                className="grid w-full grid-cols-2 gap-1"
              >
                <ToggleGroupItem value="Management" aria-label="Toggle management view">
                  Quản trị
                </ToggleGroupItem>
                <ToggleGroupItem value="Personal" aria-label="Toggle personal view">
                  Cá nhân
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-2 py-3 mb-2 bg-muted/50 rounded-lg">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">
                Vai trò: {user?.role ? getRoleDisplayName(user.role as DatabaseRole) : "Nhân viên"}
              </span>
              {/* <Badge variant="secondary" className="text-xs">
                {user?.role ? getRoleDisplayName(user.role) : "Nhân viên"}
              </Badge> */}
            </div>
          )}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User className="h-4 w-4" />
                  <span>{user?.name || "User"}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem asChild>
                <Link href="/employee/profile">
                  <User className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.role ? getRoleDisplayName(user.role) : "Nhân viên"}</span>
                  </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <Settings className="h-4 w-4 mr-2" />
                    Cài đặt cá nhân
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
