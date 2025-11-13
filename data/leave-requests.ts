import type { LeaveRequest, LeaveBalance } from "@/types/leave-request"

export const leaveRequests: LeaveRequest[] = [
  {
    id: "LR001",
    employeeId: "NV001",
    employeeName: "Nguyễn Văn An",
    employeeCode: "NV001",
    department: "Kỹ thuật",
    position: "Senior Developer",

    leaveType: "Nghỉ phép năm",
    startDate: "2024-07-15",
    endDate: "2024-07-17",
    totalDays: 3,
    reason: "Nghỉ phép thăm gia đình",

    status: "Đã duyệt",
    submittedAt: "2024-07-01T09:00:00Z",
    submittedBy: "NV001",
    approvedBy: "MGR001",
    approvedAt: "2024-07-01T14:30:00Z",

    approverRole: "Manager",
    approverId: "MGR001",
    approverName: "Trần Văn Quản Lý",

    isUrgent: false,
    notes: "Đã sắp xếp công việc với team",

    remainingLeave: 9,
  },
  {
    id: "LR002",
    employeeId: "NV002",
    employeeName: "Trần Thị Bình",
    employeeCode: "NV002",
    department: "Marketing",
    position: "Marketing Manager",

    leaveType: "Nghỉ ốm",
    startDate: "2024-07-10",
    endDate: "2024-07-11",
    totalDays: 2,
    reason: "Bị cảm cúm, cần nghỉ ngơi",

    status: "Chờ duyệt",
    submittedAt: "2024-07-09T08:30:00Z",
    submittedBy: "NV002",

    approverRole: "HR",
    approverId: "HR001",
    approverName: "Phạm Thị HR",

    isUrgent: true,
    notes: "Có giấy chứng nhận bác sĩ",
    attachments: ["medical-certificate.pdf"],

    remainingLeave: 8,
  },
  {
    id: "LR003",
    employeeId: "NV003",
    employeeName: "Lê Văn Cường",
    employeeCode: "NV003",
    department: "Kinh doanh",
    position: "Sales Representative",

    leaveType: "Nghỉ việc riêng",
    startDate: "2024-07-20",
    endDate: "2024-07-20",
    totalDays: 1,
    reason: "Đi làm thủ tục hành chính",

    status: "Từ chối",
    submittedAt: "2024-07-05T10:15:00Z",
    submittedBy: "NV003",
    rejectedBy: "MGR002",
    rejectedAt: "2024-07-05T16:45:00Z",
    rejectionReason: "Trùng với thời gian họp khách hàng quan trọng",

    approverRole: "Manager",
    approverId: "MGR002",
    approverName: "Nguyễn Văn Quản Lý 2",

    isUrgent: false,

    remainingLeave: 7,
  },
]

export const leaveBalances: LeaveBalance[] = [
  {
    employeeId: "NV001",
    year: 2024,
    annual: {
      total: 12,
      used: 3,
      remaining: 9,
    },
    sick: {
      total: 30,
      used: 2,
      remaining: 28,
    },
    personal: {
      total: 3,
      used: 0,
      remaining: 3,
    },
    maternity: {
      total: 0,
      used: 0,
      remaining: 0,
    },
  },
  {
    employeeId: "NV002",
    year: 2024,
    annual: {
      total: 12,
      used: 4,
      remaining: 8,
    },
    sick: {
      total: 30,
      used: 5,
      remaining: 25,
    },
    personal: {
      total: 3,
      used: 1,
      remaining: 2,
    },
    maternity: {
      total: 180,
      used: 0,
      remaining: 180,
    },
  },
]
