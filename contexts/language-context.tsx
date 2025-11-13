"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "vi" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  formatCurrency: (amount: number) => string
  formatCurrencyShort: (amount: number) => string
}

const translations = {
  vi: {
    // Navigation
    "nav.dashboard": "Tổng quan",
    "nav.employees": "Nhân viên",
    "nav.attendance": "Chấm công",
    "nav.payroll": "Bảng lương",
    "nav.payrollTable": "Bảng lương",
    "nav.calculatePayroll": "Tính lương",
    "nav.salaryRegulations": "Quy định lương",
    "nav.leaveRequests": "Đơn nghỉ phép",
    "nav.settings": "Cài đặt",
    "nav.profile": "Hồ sơ của tôi",
    "nav.myAttendance": "Chấm công của tôi",
    "nav.myPayroll": "Lương của tôi",

    // Dashboard
    "dashboard.title": "Tổng quan hệ thống",
    "dashboard.description": "Theo dõi tổng quan về nhân sự và lương bổng",
    "dashboard.hrOverview": "Tổng quan nhân sự",
    "dashboard.totalEmployees": "Tổng nhân viên",
    "dashboard.totalSalary": "Tổng lương tháng",
    "dashboard.avgAttendance": "Chấm công TB",
    "dashboard.pendingRequests": "Đơn chờ duyệt",
    "dashboard.recentActivities": "Hoạt động gần đây",
    "dashboard.quickActions": "Thao tác nhanh",
    "dashboard.viewEmployees": "Xem nhân viên",
    "dashboard.calculatePayroll": "Tính lương",
    "dashboard.viewReports": "Xem báo cáo",
    "dashboard.manageLeave": "Quản lý nghỉ phép",
    "dashboard.activeEmployees": "Nhân viên đang hoạt động",
    "dashboard.employeeCount": "Số nhân viên",
    "dashboard.personalOverview": "Đây là trang tổng quan cá nhân của bạn.",

    // Employees
    "employees.title": "Quản lý nhân viên",
    "employees.description": "Quản lý thông tin và hồ sơ nhân viên",
    "employees.managementDescription": "Thêm, sửa, xóa và xem thông tin nhân viên.",
    "employees.addEmployee": "Thêm nhân viên",
    "employees.addNewEmployee": "Thêm nhân viên mới",
    "employees.search": "Tìm kiếm nhân viên...",
    "employees.filterDepartment": "Lọc theo phòng ban",
    "employees.allDepartments": "Tất cả phòng ban",
    "employees.allEmployees": "Tất cả nhân viên",
    "employees.name": "Họ tên",
    "employees.id": "Mã NV",
    "employees.employeeCode": "Mã nhân viên",
    "employees.employeeCodeRequired": "Mã nhân viên là bắt buộc",
    "employees.department": "Phòng ban",
    "employees.position": "Chức vụ",
    "employees.salary": "Lương",
    "employees.status": "Trạng thái",
    "employees.actions": "Thao tác",
    "employees.active": "Đang làm việc",
    "employees.inactive": "Nghỉ việc",
    "employees.view": "Xem",
    "employees.edit": "Sửa",
    "employees.delete": "Xóa",
    "employees.manager": "Người quản lý",
    "employees.directManager": "Quản lý trực tiếp",
    "employees.noManager": "Chưa có",
    "employees.employeeList": "Danh sách nhân viên",
    "employees.totalCount": "Tổng cộng {count} nhân viên",
    "employees.editInfo": "Chỉnh sửa thông tin",
    "employees.employeeDetails": "Chi tiết nhân viên",
    "employees.createSuccess": "Tạo mới nhân viên thành công.",
    "employees.updateSuccess": "Cập nhật nhân viên thành công.",
    "employees.deleteSuccess": "Đã xóa nhân viên.",
    "employees.deleteConfirm": "Hành động này sẽ xóa vĩnh viễn nhân viên và tài khoản đăng nhập của họ. Không thể hoàn tác.",
    "employees.notFound": "Không tìm thấy thông tin nhân viên",
    "employees.updateProfile": "Cập nhật hồ sơ cho {name}.",
    "employees.createProfile": "Nhập thông tin chi tiết để tạo nhân viên mới.",

    // Employee Details
    "employee.details": "Chi tiết nhân viên",
    "employee.personalInfo": "Thông tin cá nhân",
    "employee.jobInfo": "Thông tin công việc",
    "employee.salaryDetails": "Chi tiết lương",
    "employee.fullName": "Họ và tên",
    "employee.email": "Email",
    "employee.phone": "Số điện thoại",
    "employee.address": "Địa chỉ",
    "employee.birthDate": "Ngày sinh",
    "employee.employeeId": "Mã nhân viên",
    "employee.startDate": "Ngày bắt đầu",
    "employee.baseSalary": "Lương cơ bản",
    "employee.allowances": "Phụ cấp",
    "employee.deductions": "Khấu trừ",
    "employee.netSalary": "Lương thực nhận",
    "employee.housingAllowance": "Phụ cấp nhà ở",
    "employee.transportAllowance": "Phụ cấp đi lại",
    "employee.mealAllowance": "Phụ cấp ăn trưa",
    "employee.personalIncomeTax": "Thuế TNCN",
    "employee.socialInsurance": "Bảo hiểm xã hội",
    "employee.healthInsurance": "Bảo hiểm y tế",
    "employee.role": "Nhân viên",

    // Add Employee Form
    "addEmployee.title": "Thêm nhân viên mới",
    "addEmployee.personal": "Thông tin cá nhân",
    "addEmployee.job": "Thông tin công việc",
    "addEmployee.salary": "Thông tin lương",
    "addEmployee.save": "Lưu",
    "addEmployee.cancel": "Hủy",

    // Attendance
    "attendance.title": "Chấm công",
    "attendance.myTitle": "Chấm công của tôi",
    "attendance.description": "Xem lịch sử chấm công, ngày nghỉ và giờ làm thêm của bạn",
    "attendance.thisMonth": "Tháng này",
    "attendance.attendanceRate": "Tỷ lệ chấm công",
    "attendance.daysPresent": "Ngày có mặt",
    "attendance.presentDays": "Có mặt",
    "attendance.daysAbsent": "Ngày nghỉ",
    "attendance.yearToDate": "Tổng hợp theo năm",
    "attendance.overallRate": "Tỷ lệ chấm công tổng thể",
    "attendance.history": "Lịch sử chấm công",
    "attendance.attendanceHistory": "Lịch sử chấm công",
    "attendance.monthlyAnalysis": "Phân tích chấm công theo tháng",
    "attendance.monthlyData": "Bản ghi chấm công theo tháng năm {year}",
    "attendance.monthlyHistory": "Bản ghi chấm công theo tháng năm {year}",
    "attendance.noData": "Chưa có dữ liệu chấm công nào. Vui lòng liên hệ HR để biết thêm thông tin.",
    "attendance.noDataForYear": "Không có dữ liệu chấm công cho năm {year}",
    "attendance.loadError": "Lỗi khi tải dữ liệu chấm công: {error}",
    "attendance.yearlyStats": "Thống kê chấm công năm {year}",
    "attendance.saveSuccess": "Đã lưu bảng chấm công.",
    "attendance.saveError": "Không thể lưu chấm công.",
    "attendance.monthlyTitle": "Chấm công tháng {month}/{year}",
    "attendance.clickToChange": "Click vào ô để thay đổi trạng thái chấm công.",
    "attendance.editRecord": "Sửa bản ghi chấm công",
    "attendance.detailRecord": "Chấm công chi tiết",
    "attendance.noDataThisMonth": "Không có dữ liệu chấm công cho tháng này.",
    "attendance.totalPresentDays": "Tổng ngày có mặt",
    "attendance.totalWorkingDays": "Tổng ngày làm việc",
    "attendance.totalLeaveDays": "Tổng ngày nghỉ",
    "attendance.totalLateDays": "Ngày đi trễ",
    "attendance.totalAbsentDays": "Ngày vắng mặt",
    "attendance.totalOvertimeHours": "Tổng giờ làm thêm",
    "attendance.evaluation": "Đánh giá",
    "attendance.month": "Tháng",
    "attendance.workingDays": "Ngày làm việc",
    "attendance.leaveDays": "Nghỉ phép",
    "attendance.lateDays": "Đi trễ",
    "attendance.absentDays": "Vắng mặt",
    "attendance.overtimeHours": "Làm thêm",
    "attendance.leaveType": "Loại nghỉ phép",

    // Payroll
    "payroll.title": "Bảng lương",
    "payroll.employee": "Nhân viên",
    "payroll.payrollSlip": "PHIẾU LƯƠNG NHÂN VIÊN",
    "payroll.basicSalaryAndAttendance": "Lương cơ bản & Chấm công",
    "payroll.attendanceInfo": "Chấm công",
    "payroll.attendanceRate": "Tỷ lệ chấm công:",
    "payroll.employeeInsurance": "Bảo hiểm nhân viên đóng",
    "payroll.totalEmployeeInsurance": "Tổng BH nhân viên:",
    "payroll.companyContributions": "Các khoản công ty đóng thay nhân viên",
    "payroll.manageSalary": "Quản lý thông tin lương chi tiết của nhân viên",
    "payroll.filterData": "Lọc dữ liệu theo nhân viên, tháng và năm",
    "payroll.searchEmployee": "Tìm kiếm nhân viên...",
    "payroll.selectEmployee": "Chọn nhân viên",
    "payroll.allEmployees": "Tất cả nhân viên",
    "payroll.employeeName": "Tên nhân viên",
    "payroll.attendanceAndSalary": "Chấm công & Lương",
    "payroll.displayCount": "Hiển thị {count} nhân viên",

    // Settings
    "settings.employeeRole": "Nhân viên",
    "settings.manageEmployees": "Quản lý nhân viên",
    "settings.newEmployeeNotification": "Thông báo nhân viên mới",
    "settings.newEmployeeNotificationDesc": "Gửi thông báo chào mừng nhân viên mới",
    "settings.attendanceAlert": "Cảnh báo chấm công",
    "settings.attendanceAlertDesc": "Thông báo khi có bất thường chấm công",
    "settings.attendanceNotifications": "Chấm công",

    // Notifications
    "notifications.sendToEmployees": "Gửi thông báo đến nhân viên theo vai trò",
    "notifications.attendanceCategory": "Chấm công",
    "notifications.employeeRole": "Nhân viên",

    // Expenses
    "expenses.title": "Xin cấp chi phí",
    "expenses.overview": "Thống kê tổng quan",
    "expenses.manageFromEmployees": "Quản lý các yêu cầu chi phí từ nhân viên",

    // Financials
    "financials.overview": "Tổng quan",
    "financials.overviewStats": "Thống kê tổng quan chính",

    // Calculate Payroll
    "calculatePayroll.errorNoData": "Lỗi khi tạo mới bảng lương cho nhân viên chưa có dữ liệu",
    "calculatePayroll.employeeInsurance": "Bảo hiểm nhân viên",
    "calculatePayroll.attendanceInfo": "Chấm công:",
    "calculatePayroll.bonusSetup": "Thiết lập các khoản thưởng cho nhân viên được chọn trong tháng này",
    "calculatePayroll.searchEmployee": "Tìm kiếm nhân viên...",
    "calculatePayroll.noEmployeeFound": "Không tìm thấy nhân viên nào với từ khóa \"{searchTerm}\"",
    "calculatePayroll.selectedCount": "/ {count} nhân viên",
    "calculatePayroll.overwriteWarning": "Một số nhân viên đã được tính lương cho tháng/năm này trước đó. Bạn có muốn ghi đè kết quả mới không?",

    // Salary Regulations
    "salaryRegulations.employeeContributions": "Tỷ lệ đóng của Nhân viên",

    // Leave Requests
    "leaveRequests.title": "Quản lý nghỉ phép",
    "leaveRequests.description": "Tạo đơn xin nghỉ phép và theo dõi trạng thái phê duyệt",
    "leaveRequests.createRequest": "Tạo đơn nghỉ phép",
    "leaveRequests.pending": "Chờ duyệt",
    "leaveRequests.approved": "Đã duyệt",
    "leaveRequests.rejected": "Từ chối",
    "leaveRequests.all": "Tất cả",
    "leaveRequests.employee": "Nhân viên",
    "leaveRequests.type": "Loại",
    "leaveRequests.startDate": "Ngày bắt đầu",
    "leaveRequests.endDate": "Ngày kết thúc",
    "leaveRequests.days": "Số ngày",
    "leaveRequests.reason": "Lý do",
    "leaveRequests.approve": "Duyệt",
    "leaveRequests.reject": "Từ chối",
    "leaveRequests.annualLeave": "Nghỉ phép năm",
    "leaveRequests.sickLeave": "Nghỉ ốm",
    "leaveRequests.personalLeave": "Nghỉ việc riêng",
    "leaveRequests.maternityLeave": "Nghỉ thai sản",
    "leaveRequests.unpaidLeave": "Nghỉ không lương",
    "leaveRequests.other": "Khác",

    // Profile
    "profile.title": "Hồ sơ của tôi",
    "profile.description": "Xem và quản lý thông tin cá nhân của bạn",
    "profile.jobInformation": "Thông tin công việc",
    "profile.salaryDetails": "Chi tiết lương",
    "profile.monthlyNetSalary": "Lương thực nhận hàng tháng",

    // Common
    "common.search": "Tìm kiếm",
    "common.filter": "Lọc",
    "common.view": "Xem",
    "common.edit": "Sửa",
    "common.delete": "Xóa",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.close": "Đóng",
    "common.loading": "Đang tải...",
    "common.noData": "Không có dữ liệu",
    "common.total": "Tổng",
    "common.status": "Trạng thái",
    "common.success": "Thành công",
    "common.error": "Lỗi",

    // Messages
    "messages.tryAgain": "Thử lại",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.employees": "Employees",
    "nav.attendance": "Attendance",
    "nav.payroll": "Payroll",
    "nav.payrollTable": "Payroll Table",
    "nav.calculatePayroll": "Calculate Payroll",
    "nav.salaryRegulations": "Salary Regulations",
    "nav.leaveRequests": "Leave Requests",
    "nav.settings": "Settings",
    "nav.profile": "My Profile",
    "nav.myAttendance": "My Attendance",
    "nav.myPayroll": "My Payroll",

    // Dashboard
    "dashboard.title": "System Overview",
    "dashboard.description": "Monitor overall HR and payroll metrics",
    "dashboard.hrOverview": "HR Overview",
    "dashboard.totalEmployees": "Total Employees",
    "dashboard.totalSalary": "Monthly Salary",
    "dashboard.avgAttendance": "Avg Attendance",
    "dashboard.pendingRequests": "Pending Requests",
    "dashboard.recentActivities": "Recent Activities",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.viewEmployees": "View Employees",
    "dashboard.calculatePayroll": "Calculate Payroll",
    "dashboard.viewReports": "View Reports",
    "dashboard.manageLeave": "Manage Leave",
    "dashboard.activeEmployees": "Active Employees",
    "dashboard.employeeCount": "Employee Count",
    "dashboard.personalOverview": "This is your personal overview page.",

    // Employees
    "employees.title": "Employee Management",
    "employees.description": "Manage employee information and profiles",
    "employees.managementDescription": "Add, edit, delete, and view employee information.",
    "employees.addEmployee": "Add Employee",
    "employees.addNewEmployee": "Add New Employee",
    "employees.search": "Search employees...",
    "employees.filterDepartment": "Filter by department",
    "employees.allDepartments": "All Departments",
    "employees.allEmployees": "All Employees",
    "employees.name": "Name",
    "employees.id": "Employee ID",
    "employees.employeeCode": "Employee Code",
    "employees.employeeCodeRequired": "Employee code is required",
    "employees.department": "Department",
    "employees.position": "Position",
    "employees.salary": "Salary",
    "employees.status": "Status",
    "employees.actions": "Actions",
    "employees.active": "Active",
    "employees.inactive": "Inactive",
    "employees.view": "View",
    "employees.edit": "Edit",
    "employees.delete": "Delete",
    "employees.manager": "Manager",
    "employees.directManager": "Direct Manager",
    "employees.noManager": "No Manager",
    "employees.employeeList": "Employee List",
    "employees.totalCount": "Total {count} employees",
    "employees.editInfo": "Edit Information",
    "employees.employeeDetails": "Employee Details",
    "employees.createSuccess": "New employee created successfully.",
    "employees.updateSuccess": "Employee updated successfully.",
    "employees.deleteSuccess": "Employee deleted.",
    "employees.deleteConfirm": "This action will permanently delete the employee and their login account. This cannot be undone.",
    "employees.notFound": "Employee information not found",
    "employees.updateProfile": "Updating profile for {name}.",
    "employees.createProfile": "Enter detailed information to create a new employee.",

    // Employee Details
    "employee.details": "Employee Details",
    "employee.personalInfo": "Personal Information",
    "employee.jobInfo": "Job Information",
    "employee.salaryDetails": "Salary Details",
    "employee.fullName": "Full Name",
    "employee.email": "Email",
    "employee.phone": "Phone",
    "employee.address": "Address",
    "employee.birthDate": "Birth Date",
    "employee.employeeId": "Employee ID",
    "employee.startDate": "Start Date",
    "employee.baseSalary": "Base Salary",
    "employee.allowances": "Allowances",
    "employee.deductions": "Deductions",
    "employee.netSalary": "Net Salary",
    "employee.housingAllowance": "Housing Allowance",
    "employee.transportAllowance": "Transport Allowance",
    "employee.mealAllowance": "Meal Allowance",
    "employee.personalIncomeTax": "Personal Income Tax",
    "employee.socialInsurance": "Social Insurance",
    "employee.healthInsurance": "Health Insurance",
    "employee.role": "Employee",

    // Add Employee Form
    "addEmployee.title": "Add New Employee",
    "addEmployee.personal": "Personal Information",
    "addEmployee.job": "Job Information",
    "addEmployee.salary": "Salary Information",
    "addEmployee.save": "Save",
    "addEmployee.cancel": "Cancel",

    // Attendance
    "attendance.title": "Attendance",
    "attendance.myTitle": "My Attendance",
    "attendance.description": "View attendance history, leave days, and overtime of your employees",
    "attendance.thisMonth": "This Month",
    "attendance.attendanceRate": "Attendance Rate",
    "attendance.daysPresent": "Days Present",
    "attendance.daysAbsent": "Days Absent",
    "attendance.yearToDate": "Year to Date Summary",
    "attendance.overallRate": "Overall Attendance Rate",
    "attendance.history": "Attendance History",
    "attendance.monthlyAnalysis": "Monthly Attendance Analysis",
    "attendance.monthlyData": "Attendance records for month {year}",
    "attendance.noData": "No attendance data available. Please contact HR for more information.",
    "attendance.noDataForYear": "No attendance data for year {year}",
    "attendance.loadError": "Error loading attendance data: {error}",
    "attendance.yearlyStats": "Attendance statistics for year {year}",
    "attendance.saveSuccess": "Attendance saved.",
    "attendance.saveError": "Could not save attendance.",
    "attendance.monthlyTitle": "Attendance for month {month}/{year}",
    "attendance.clickToChange": "Click on the cell to change attendance status.",
    "attendance.editRecord": "Edit attendance record",
    "attendance.detailRecord": "Attendance Details",
    "attendance.noDataThisMonth": "No attendance data for this month.",
    "attendance.totalPresentDays": "Total Present Days",
    "attendance.totalWorkingDays": "Total Working Days",
    "attendance.totalLeaveDays": "Total Leave Days",
    "attendance.totalLateDays": "Total Late Days",
    "attendance.totalAbsentDays": "Total Absent Days",
    "attendance.totalOvertimeHours": "Total Overtime Hours",
    "attendance.evaluation": "Evaluation",
    "attendance.month": "Month",
    "attendance.workingDays": "Working Days",
    "attendance.leaveDays": "Leave Days",
    "attendance.lateDays": "Late Days",
    "attendance.absentDays": "Absent Days",
    "attendance.overtimeHours": "Overtime Hours",
    "attendance.leaveType": "Leave Type",

    // Payroll
    "payroll.title": "Payroll",
    "payroll.employee": "Employee",
    "payroll.payrollSlip": "EMPLOYEE PAYSLIP",
    "payroll.basicSalaryAndAttendance": "Basic Salary & Attendance",
    "payroll.attendanceInfo": "Attendance",
    "payroll.attendanceRate": "Attendance Rate:",
    "payroll.employeeInsurance": "Employee contributions",
    "payroll.totalEmployeeInsurance": "Total Employee Contributions:",
    "payroll.companyContributions": "Company contributions on behalf of employees",
    "payroll.manageSalary": "Manage detailed salary information of employees",
    "payroll.filterData": "Filter data by employee, month, and year",
    "payroll.searchEmployee": "Search employees...",
    "payroll.selectEmployee": "Select employee",
    "payroll.allEmployees": "All employees",
    "payroll.employeeName": "Employee Name",
    "payroll.attendanceAndSalary": "Attendance & Salary",
    "payroll.displayCount": "Displaying {count} employees",

    // Settings
    "settings.employeeRole": "Employee",
    "settings.manageEmployees": "Manage Employees",
    "settings.newEmployeeNotification": "New Employee Notification",
    "settings.newEmployeeNotificationDesc": "Send welcome notification for new employees",
    "settings.attendanceAlert": "Attendance Alert",
    "settings.attendanceAlertDesc": "Notify when there is an unusual attendance pattern",
    "settings.attendanceNotifications": "Attendance",

    // Notifications
    "notifications.sendToEmployees": "Send notification to employees by role",
    "notifications.attendanceCategory": "Attendance",
    "notifications.employeeRole": "Employee",

    // Expenses
    "expenses.title": "Request Expense",
    "expenses.overview": "Overview",
    "expenses.manageFromEmployees": "Manage expense requests from employees",

    // Financials
    "financials.overview": "Overview",
    "financials.overviewStats": "Main Overview Statistics",

    // Calculate Payroll
    "calculatePayroll.errorNoData": "Error creating new payroll for employees with no data",
    "calculatePayroll.employeeInsurance": "Employee Insurance",
    "calculatePayroll.attendanceInfo": "Attendance:",
    "calculatePayroll.bonusSetup": "Set up bonuses for selected employees for this month",
    "calculatePayroll.searchEmployee": "Search employees...",
    "calculatePayroll.noEmployeeFound": "No employee found with keyword \"{searchTerm}\"",
    "calculatePayroll.selectedCount": "/ {count} employees",
    "calculatePayroll.overwriteWarning": "Some employees have already been paid for this month/year. Do you want to overwrite the new results?",

    // Salary Regulations
    "salaryRegulations.employeeContributions": "Employee Contributions Rate",

    // Leave Requests
    "leaveRequests.title": "Leave Request Management",
    "leaveRequests.description": "Create leave requests and track approval status",
    "leaveRequests.createRequest": "Create Leave Request",
    "leaveRequests.pending": "Pending",
    "leaveRequests.approved": "Approved",
    "leaveRequests.rejected": "Rejected",
    "leaveRequests.all": "All",
    "leaveRequests.employee": "Employee",
    "leaveRequests.type": "Type",
    "leaveRequests.startDate": "Start Date",
    "leaveRequests.endDate": "End Date",
    "leaveRequests.days": "Days",
    "leaveRequests.reason": "Reason",
    "leaveRequests.approve": "Approve",
    "leaveRequests.reject": "Reject",
    "leaveRequests.annualLeave": "Annual Leave",
    "leaveRequests.sickLeave": "Sick Leave",
    "leaveRequests.personalLeave": "Personal Leave",
    "leaveRequests.maternityLeave": "Maternity Leave",
    "leaveRequests.unpaidLeave": "Unpaid Leave",
    "leaveRequests.other": "Other",

    // Profile
    "profile.title": "My Profile",
    "profile.description": "View and manage your personal information",
    "profile.jobInformation": "Job Information",
    "profile.salaryDetails": "Salary Details",
    "profile.monthlyNetSalary": "Monthly Net Salary",

    // Common
    "common.search": "Search",
    "common.filter": "Filter",
    "common.view": "View",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.noData": "No data available",
    "common.total": "Total",
    "common.status": "Status",
    "common.success": "Success",
    "common.error": "Error",

    // Messages
    "messages.tryAgain": "Try again",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("vi")

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  const formatCurrency = (amount: number): string => {
    if (language === "vi") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    } else {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }
  }

  const formatCurrencyShort = (amount: number): string => {
    if (amount >= 1000000000) {
      return language === "vi" ? `${(amount / 1000000000).toFixed(1)}B VNĐ` : `VNĐ ${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return language === "vi" ? `${(amount / 1000000).toFixed(1)}M VNĐ` : `VNĐ ${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return language === "vi" ? `${(amount / 1000).toFixed(0)}K VNĐ` : `VNĐ ${(amount / 1000).toFixed(0)}K`
    } else {
      return formatCurrency(amount)
    }
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCurrency,
        formatCurrencyShort,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
