# Tài Liệu Chi Tiết Hệ Thống HRM

## Mục Lục

1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
3. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
4. [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
5. [Các Tính Năng Chính](#các-tính-năng-chính)
6. [Kiến Trúc Database](#kiến-trúc-database)
7. [API và Routes](#api-và-routes)
8. [Bảo Mật và Phân Quyền](#bảo-mật-và-phân-quyền)
9. [Quy Trình Tính Lương](#quy-trình-tính-lương)
10. [Hướng Dẫn Triển Khai](#hướng-dẫn-triển-khai)

---

## Tổng Quan Hệ Thống

### Giới Thiệu

Hệ thống HRM (Human Resource Management) là một hệ thống quản lý nhân sự và tính lương hiện đại, được phát triển bởi TDSolutionsHN. Hệ thống cung cấp các chức năng quản lý toàn diện cho doanh nghiệp bao gồm:

- Quản lý thông tin nhân viên
- Quản lý chấm công và nghỉ phép
- Tính toán và quản lý lương tự động
- Quản lý chi phí và ngân sách
- Hệ thống thông báo và báo cáo

### Mục Tiêu

- Tự động hóa các quy trình quản lý nhân sự
- Tăng hiệu quả và độ chính xác trong tính lương
- Cung cấp giao diện thân thiện và dễ sử dụng
- Đảm bảo bảo mật và phân quyền chặt chẽ
- Hỗ trợ đa ngôn ngữ (Tiếng Việt và Tiếng Anh)

---

## Công Nghệ Sử Dụng

### Frontend

#### Framework và Library Chính

- **Next.js 14.2.16**: Framework React với Server-Side Rendering (SSR) và Static Site Generation (SSG)
  - App Router architecture
  - Server Components và Client Components
  - API Routes tích hợp

- **React 18.3.1**: Thư viện UI chính
  - Hooks: useState, useEffect, useContext, useMemo, useCallback
  - Context API cho state management

- **TypeScript 5.7.3**: Ngôn ngữ lập trình với type safety
  - Strict mode enabled
  - Type definitions cho tất cả components và services

#### UI Framework và Components

- **Radix UI**: Component library không có style
  - Dialog, Dropdown, Select, Tabs, Toast, Tooltip
  - Accessibility (a11y) built-in
  - Headless components

- **Tailwind CSS 3.4.17**: Utility-first CSS framework
  - Custom theme với Ocean Blue color scheme
  - Dark mode support
  - Responsive design utilities

- **shadcn/ui**: Component system built on Radix UI
  - Pre-built components với Tailwind CSS
  - Customizable và accessible

#### Form Management

- **React Hook Form 7.54.1**: Form state management
- **Zod 3.24.1**: Schema validation
- **@hookform/resolvers**: Integration giữa React Hook Form và Zod

#### Date và Time

- **date-fns 4.1.0**: Date manipulation và formatting
- **react-day-picker 9.7.0**: Date picker component

#### Data Visualization

- **Recharts 2.15.0**: Chart library cho React
  - Line charts, Bar charts, Pie charts
  - Dashboard analytics

#### File Processing

- **xlsx 0.18.5**: Excel file processing
- **csv-parse 6.1.0**: CSV parsing
- **Puppeteer 24.17.0**: PDF generation và web scraping

#### Authentication & Security

- **jose 6.0.11**: JWT handling
- **speakeasy 2.0.0**: Two-Factor Authentication (2FA)
- **qrcode 1.5.4**: QR code generation cho 2FA

### Backend & Database

#### Backend Platform

- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database
  - Authentication service
  - Real-time subscriptions
  - Storage service
  - Row Level Security (RLS)

#### Database

- **PostgreSQL**: Relational database
  - UUID extension cho primary keys
  - JSON support
  - Full-text search
  - Advanced indexing

#### Authentication

- **Supabase Auth**: Authentication service
  - Email/Password authentication
  - JWT tokens
  - Session management
  - Two-Factor Authentication (2FA/TOTP)

#### Storage

- **Supabase Storage**: File storage service
  - Avatar uploads
  - Document attachments
  - Expense receipts
  - Signed URLs cho secure access

### Development Tools

#### Build Tools

- **Next.js Build System**: Tích hợp Webpack và SWC
- **TypeScript Compiler**: Type checking và compilation
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

#### Code Quality

- **ESLint**: Code linting
- **TypeScript**: Static type checking
- **Prettier**: Code formatting (implicit)

#### Package Management

- **npm/yarn/pnpm**: Package managers
- **Yarn 4.9.3**: Primary package manager (theo package.json)

### Utilities

- **clsx**: Conditional class names
- **tailwind-merge**: Merge Tailwind classes
- **class-variance-authority**: Component variants
- **sonner**: Toast notifications
- **cmdk**: Command menu component
- **vaul**: Drawer component
- **embla-carousel-react**: Carousel component

---

## Kiến Trúc Hệ Thống

### Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   React UI   │  │  Next.js App │  │   Context    │  │
│  │  Components  │  │    Router    │  │   Providers  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Next.js Server (Vercel/Server)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API Routes  │  │ Server Comps │  │   Middleware │  │
│  │  /app/api/*  │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    Supabase Platform                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │     Auth     │  │   Storage   │  │
│  │   Database   │  │   Service    │  │   Service   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐                                      │
│  │   Realtime   │                                      │
│  │  Subscriptions│                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

### Luồng Xử Lý Request

1. **Client Request**: User tương tác với UI component
2. **Next.js Router**: Route request đến appropriate handler
3. **API Route Handler**: Xử lý authentication và business logic
4. **Supabase Client**: Giao tiếp với Supabase services
5. **Database/Storage**: Lưu trữ và truy xuất dữ liệu
6. **Response**: Trả về kết quả cho client

### State Management

Hệ thống sử dụng **Context API** cho state management:

- **AuthContext**: Quản lý authentication state
- **LanguageContext**: Quản lý ngôn ngữ và translations

Không sử dụng Redux hoặc Zustand, tập trung vào:
- Server-side state với React Server Components
- Client-side state với useState và useContext
- API caching với Next.js built-in caching

---

## Cấu Trúc Dự Án

### Cấu Trúc Thư Mục

```
HRM/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── employees/            # Employee management
│   │   ├── attendance/          # Attendance management
│   │   ├── payroll/             # Payroll calculation
│   │   ├── leave-requests/      # Leave management
│   │   ├── expense-requests/    # Expense management
│   │   ├── financials/         # Financial transactions
│   │   ├── notifications/       # Notification system
│   │   └── settings/            # System settings
│   ├── employees/               # Employee pages
│   ├── attendance/              # Attendance pages
│   ├── payroll/                 # Payroll pages
│   ├── calculate-payroll/       # Payroll calculation page
│   ├── leave-requests/          # Leave request pages
│   ├── expenses/                # Expense pages
│   ├── financials/             # Financial pages
│   ├── notifications/           # Notification pages
│   ├── settings/               # Settings pages
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Dashboard page
│
├── components/                  # React Components
│   ├── ui/                     # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── app-sidebar.tsx         # Main sidebar navigation
│   ├── auth-guard.tsx          # Route protection
│   ├── employee-form.tsx       # Employee form
│   ├── login-form.tsx          # Login form
│   └── ...
│
├── contexts/                    # React Contexts
│   ├── auth-context.tsx        # Authentication context
│   └── language-context.tsx    # Language context
│
├── lib/                         # Utility Libraries
│   ├── supabase.ts             # Supabase client (client-side)
│   ├── supabase-server.ts      # Supabase client (server-side)
│   ├── api.ts                  # API client wrapper
│   ├── api-auth.ts             # Authentication utilities
│   ├── role-types.ts           # Role definitions
│   ├── services.ts             # Business logic services
│   └── ...
│
├── types/                       # TypeScript Types
│   ├── employee.ts             # Employee types
│   ├── leave-request.ts        # Leave request types
│   ├── notification.ts         # Notification types
│   └── financial.ts            # Financial types
│
├── hooks/                       # Custom React Hooks
│   ├── use-cookies.ts
│   ├── use-local-storage.ts
│   ├── use-notification-count.tsx
│   └── ...
│
├── database/                    # Database Scripts
│   ├── *.sql                   # Migration và setup scripts
│   └── ...
│
├── public/                      # Static Assets
│   ├── images/
│   ├── logo.png
│   └── ...
│
├── styles/                      # Global Styles
│   └── globals.css
│
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind config
├── next.config.mjs             # Next.js config
└── supabase-schema.sql         # Database schema
```

### Các Thư Mục Quan Trọng

#### `/app`
- Chứa tất cả pages và API routes
- Sử dụng Next.js App Router
- Mỗi folder là một route
- `page.tsx` là component hiển thị
- `layout.tsx` là layout wrapper
- `loading.tsx` là loading state

#### `/components`
- Reusable React components
- `/ui`: Base UI components (shadcn/ui)
- Business logic components

#### `/lib`
- Utility functions và services
- API clients
- Business logic helpers

#### `/types`
- TypeScript type definitions
- Interfaces và types cho data models

#### `/contexts`
- React Context providers
- Global state management

#### `/database`
- SQL migration scripts
- Database setup và configuration

---

## Các Tính Năng Chính

### 1. Quản Lý Nhân Viên

#### Chức Năng

- **Quản lý thông tin nhân viên**
  - Thêm, sửa, xóa nhân viên
  - Upload avatar
  - Quản lý thông tin cá nhân (email, phone, address, birth_date)
  - Quản lý thông tin công việc (department, position, manager)
  - Quản lý lương cơ bản và phụ cấp

- **Quản lý phòng ban và chức vụ**
  - CRUD departments
  - CRUD positions (gắn với department)
  - Hierarchical structure

- **Quản lý người phụ thuộc**
  - Thêm người phụ thuộc cho nhân viên
  - Sử dụng cho tính thuế thu nhập cá nhân

#### Quyền Truy Cập

- **Admin/HR**: Full access
- **Employee**: Chỉ xem và chỉnh sửa thông tin của chính mình

### 2. Quản Lý Chấm Công

#### Chức Năng

- **Ghi nhận chấm công**
  - Chấm công theo ngày
  - Nhiều trạng thái:
    - `present_full`: Làm việc cả ngày
    - `present_half`: Làm việc nửa ngày
    - `meeting_full`: Họp nghị, học tập cả ngày
    - `meeting_half`: Họp nghị, học tập nửa ngày
    - `unpaid_leave`: Nghỉ không lương
    - `paid_leave`: Nghỉ phép
    - `sick_leave`: Nghỉ bệnh
    - `overtime`: Tăng ca
    - `absent`: Vắng mặt

- **Import chấm công**
  - Import từ CSV/Excel
  - Batch processing
  - Validation và error handling

- **Xem báo cáo chấm công**
  - Theo nhân viên
  - Theo tháng/năm
  - Tổng hợp và thống kê

#### Tích Hợp với Tính Lương

- Dữ liệu chấm công được sử dụng để tính lương
- Tính số ngày làm việc thực tế
- Tính overtime pay

### 3. Quản Lý Nghỉ Phép

#### Chức Năng

- **Tạo đơn nghỉ phép**
  - Các loại nghỉ phép:
    - `annual_leave`: Nghỉ phép năm
    - `sick_leave`: Nghỉ bệnh
    - `personal_leave`: Nghỉ cá nhân
    - `maternity_leave`: Nghỉ thai sản
    - `unpaid_leave`: Nghỉ không lương
    - `other`: Khác

  - Thông tin đơn:
    - Start date, end date
    - Total days
    - Reason
    - Attachments
    - Urgent flag

- **Duyệt đơn nghỉ phép**
  - HR/Admin có thể approve/reject
  - Gửi notification khi có đơn mới
  - Gửi notification khi đơn được duyệt/từ chối

- **Quản lý số dư nghỉ phép**
  - Theo năm
  - Tự động trừ khi đơn được approve
  - Hiển thị số dư còn lại

#### Quy Trình

1. Employee tạo đơn nghỉ phép
2. System kiểm tra số dư còn lại
3. System kiểm tra overlap với đơn khác
4. HR/Admin review và approve/reject
5. Nếu approve, trừ số dư nghỉ phép
6. Gửi notification cho employee

### 4. Tính Toán và Quản Lý Lương

#### Chức Năng

- **Tính lương tự động**
  - Tính theo tháng/năm
  - Batch calculation cho nhiều nhân viên
  - Real-time preview

- **Các thành phần lương**
  - **Lương cơ bản**: Base salary
  - **Phụ cấp**:
    - Housing allowance (phụ cấp nhà ở)
    - Transport allowance (phụ cấp đi lại)
    - Meal allowance (phụ cấp ăn trưa)
    - Phone allowance (phụ cấp điện thoại)
    - Position allowance (phụ cấp chức vụ)
    - Attendance allowance (phụ cấp chuyên cần)
    - Other allowances (phụ cấp khác)

  - **Tăng ca**:
    - Weekday overtime (tăng ca ngày thường)
    - Weekend overtime (tăng ca cuối tuần)
    - Holiday overtime (tăng ca ngày lễ)

  - **Bảo hiểm** (Employee portion):
    - Social insurance (BHXH): 8%
    - Health insurance (BHYT): 1.5%
    - Unemployment insurance (BHTN): 1%
    - Union fee (Phí công đoàn): 0%

  - **Bảo hiểm** (Company portion):
    - Social insurance: 17.5%
    - Health insurance: 3%
    - Unemployment insurance: 1%

  - **Thuế thu nhập cá nhân**:
    - Tính theo biểu thuế lũy tiến
    - Trừ giảm trừ cá nhân: 11,000,000 VND
    - Trừ giảm trừ người phụ thuộc: 4,400,000 VND/người

- **Công thức tính lương**

```
Gross Income = Actual Base Salary + Total Allowances + Overtime Pay + Bonuses

Income After Insurance = Gross Income - Employee Insurance

Income For Tax = Income After Insurance - Meal Allowance

Taxable Income = Income For Tax - Personal Deduction - Dependent Deductions

Income Tax = Calculate from Tax Brackets (Taxable Income)

Total Deductions = Employee Insurance + Income Tax + Other Deductions

Net Salary = Gross Income - Total Deductions
```

- **Xem bảng lương**
  - Theo nhân viên
  - Theo tháng/năm
  - Export PDF
  - Chi tiết từng khoản

#### Quy Định Lương

- **Salary Regulations** table chứa các quy định:
  - Working days per month (mặc định: 22)
  - Overtime rates
  - Insurance rates
  - Tax deductions
  - Effective date

- Có thể cập nhật quy định theo thời gian
- System tự động sử dụng quy định có hiệu lực tại thời điểm tính lương

### 5. Quản Lý Chi Phí

#### Chức Năng

- **Tạo yêu cầu chi phí**
  - Category
  - Description
  - Amount
  - Date
  - Attachments (receipts, invoices)

- **Duyệt yêu cầu chi phí**
  - HR/Admin review
  - Approve/Reject với lý do
  - Link với financial transactions

- **Tích hợp với ngân sách**
  - Map với budget categories
  - Track spending vs budget
  - Budget alerts

#### Quy Trình

1. Employee tạo expense request
2. Upload attachments
3. HR/Admin review và approve/reject
4. Nếu approve, tạo financial transaction
5. Link với budget category
6. Update budget spent amount

### 6. Quản Lý Tài Chính

#### Chức Năng

- **Quản lý giao dịch tài chính**
  - Income (Thu)
  - Expense (Chi)
  - Categories
  - Approval workflow

- **Quản lý ngân sách**
  - Budget categories (hierarchical)
  - Budget allocations
  - Track spending
  - Budget reports

- **Financial targets**
  - Set targets cho categories
  - Track progress
  - Alerts khi vượt budget

#### Budget Categories

- Hierarchical structure
- Code-based (VD: 100000, 101000, 101001)
- Level-based (1 = top level, 2+ = sub-levels)
- Type: 1 = Expense, 2 = Revenue

### 7. Hệ Thống Thông Báo

#### Chức Năng

- **Tạo thông báo**
  - Types: info, success, warning, error
  - Categories: payroll, attendance, leave, expense, system, announcement
  - Target: role-based hoặc specific users
  - Priority: low, medium, high

- **Hiển thị thông báo**
  - Real-time notifications
  - Notification center
  - Read/unread status
  - Action buttons

- **Tự động gửi thông báo**
  - Khi có đơn nghỉ phép mới
  - Khi đơn được duyệt/từ chối
  - Khi có payroll mới
  - System announcements

### 8. Quản Lý Cài Đặt

#### Chức Năng

- **Company settings**
  - Company information
  - Contact details
  - Tax ID

- **HR settings**
  - Working days per month
  - Overtime rates
  - Tax deductions

- **Security settings**
  - Two-factor authentication
  - Session timeout
  - Audit logging

- **Notification settings**
  - Enable/disable notification types
  - Notification preferences

### 9. Báo Cáo và Thống Kê

#### Dashboard

- **HR Dashboard**:
  - Total employees
  - Monthly salary summary
  - Average attendance
  - Pending requests
  - Recent activities

- **Employee Dashboard**:
  - Personal information
  - Payroll summary
  - Leave balance
  - Recent notifications

#### Reports

- Employee reports
- Attendance reports
- Payroll reports
- Financial reports
- Budget reports

### 10. Đa Ngôn Ngữ

#### Hỗ Trợ Ngôn Ngữ

- **Tiếng Việt** (mặc định)
- **Tiếng Anh**

#### Implementation

- Context-based translation
- `LanguageContext` quản lý ngôn ngữ hiện tại
- Translation object chứa tất cả strings
- Dynamic language switching

---

## Kiến Trúc Database

### Schema Overview

Database sử dụng **PostgreSQL** với các tính năng:

- UUID primary keys
- Foreign key constraints
- Check constraints
- Indexes cho performance
- Triggers cho auto-update timestamps
- Row Level Security (RLS) cho security

### Các Bảng Chính

#### 1. `departments`
Quản lý phòng ban

```sql
- id (UUID, PK)
- name (VARCHAR, UNIQUE)
- description (TEXT)
- created_at, updated_at
```

#### 2. `positions`
Quản lý chức vụ

```sql
- id (UUID, PK)
- name (VARCHAR)
- department_id (UUID, FK -> departments)
- description (TEXT)
- created_at, updated_at
```

#### 3. `employees`
Quản lý nhân viên

```sql
- id (UUID, PK)
- employee_code (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE)
- name (VARCHAR)
- phone, address, birth_date
- department_id (UUID, FK -> departments)
- position_id (UUID, FK -> positions)
- manager_id (UUID, FK -> employees)
- start_date, end_date
- base_salary (DECIMAL)
- status (ENUM: active, inactive, terminated, probation)
- role (ENUM: admin, hr, manager, employee)
- avatar_url (TEXT)
- auth_user_id (UUID, FK -> auth.users)
- created_at, updated_at
```

#### 4. `attendance_records`
Ghi nhận chấm công

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- date (DATE)
- status (ENUM: present_full, present_half, meeting_full, meeting_half, unpaid_leave, paid_leave, sick_leave, overtime, absent)
- check_in_time, check_out_time (TIMESTAMPTZ)
- overtime_hours (DECIMAL)
- work_value (DECIMAL) -- Giá trị công việc (0.5 cho nửa ngày, 1.0 cho cả ngày)
- month, year (INTEGER) -- Denormalized cho query performance
- notes (TEXT)
- created_by (UUID, FK -> employees)
- created_at, updated_at
- UNIQUE(employee_id, date)
```

#### 5. `leave_requests`
Đơn nghỉ phép

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- leave_type (ENUM: annual_leave, sick_leave, personal_leave, maternity_leave, unpaid_leave, other)
- start_date, end_date (DATE)
- total_days (DECIMAL)
- reason (TEXT)
- status (ENUM: pending, approved, rejected, cancelled)
- submitted_at, submitted_by
- approved_by, approved_at
- rejected_by, rejected_at, rejection_reason
- is_urgent (BOOLEAN)
- attachments (TEXT[])
- notes (TEXT)
- created_at, updated_at
```

#### 6. `leave_balances`
Số dư nghỉ phép

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- year (INTEGER)
- annual_leave_total, annual_leave_used (DECIMAL)
- sick_leave_total, sick_leave_used (DECIMAL)
- personal_leave_total, personal_leave_used (DECIMAL)
- maternity_leave_total, maternity_leave_used (DECIMAL)
- created_at, updated_at
- UNIQUE(employee_id, year)
```

#### 7. `payroll_records`
Bảng lương

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- month, year (INTEGER)
- base_salary, working_days, actual_working_days, actual_base_salary
- housing_allowance, transport_allowance, meal_allowance, phone_allowance, position_allowance, attendance_allowance, other_allowances, total_allowances
- overtime_hours, overtime_rate, overtime_pay
- social_insurance_employee, health_insurance_employee, unemployment_insurance_employee, union_fee_employee
- social_insurance_company, health_insurance_company, unemployment_insurance_company, union_fee_company
- gross_income, income_after_insurance, personal_deduction, dependent_deduction, number_of_dependents, taxable_income, income_tax
- total_deductions, net_salary
- status (VARCHAR)
- payment_date, payment_method, bank_account
- created_by, approved_by
- created_at, updated_at
- UNIQUE(employee_id, month, year)
```

#### 8. `salary_regulations`
Quy định lương

```sql
- id (UUID, PK)
- basic_salary, probation_salary_rate
- max_insurance_salary, max_unemployment_salary
- working_days_per_month, working_hours_per_day
- overtime_weekday_rate, overtime_weekend_rate, overtime_holiday_rate, overtime_night_rate
- company_social_insurance_rate, company_health_insurance_rate, company_unemployment_insurance_rate, company_union_fee_rate
- employee_social_insurance_rate, employee_health_insurance_rate, employee_unemployment_insurance_rate, employee_union_fee_rate
- personal_deduction, dependent_deduction, non_resident_tax_rate
- effective_date (DATE)
- created_by
- created_at, updated_at
```

#### 9. `expense_requests`
Yêu cầu chi phí

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- category (VARCHAR)
- description (TEXT)
- amount (DECIMAL)
- date (DATE)
- status (ENUM: pending, approved, rejected)
- submitted_date (DATE)
- attachments (TEXT[])
- notes (TEXT)
- approved_by, approved_date
- rejected_by, rejected_date, rejection_reason
- created_at, updated_at
```

#### 10. `financial_transactions`
Giao dịch tài chính

```sql
- id (UUID, PK)
- type (ENUM: income, expense)
- category_id (UUID, FK -> financial_categories)
- description (TEXT)
- amount (DECIMAL)
- currency (VARCHAR, default: VND)
- date (DATE)
- created_by (UUID, FK -> employees)
- status (ENUM: pending, approved, rejected)
- attachments (TEXT[])
- notes (TEXT)
- account_type (ENUM: company, cash)
- approved_by, approved_at
- rejected_by, rejected_at, rejection_reason
- created_at, updated_at
```

#### 11. `budget_categories`
Danh mục ngân sách

```sql
- id (UUID, PK)
- code (VARCHAR, UNIQUE) -- VD: 100000, 101000
- name (VARCHAR)
- parent_id (UUID, FK -> budget_categories)
- level (INTEGER) -- 1 = top level
- category_type (INTEGER) -- 1 = Expense, 2 = Revenue
- description (TEXT)
- is_active (BOOLEAN)
- sort_order (INTEGER)
- created_at, updated_at
```

#### 12. `budget_allocations`
Phân bổ ngân sách

```sql
- id (UUID, PK)
- budget_id (UUID)
- category_id (UUID, FK -> budget_categories)
- allocated_amount (DECIMAL)
- spent_amount (DECIMAL)
- remaining_amount (DECIMAL, GENERATED)
- notes (TEXT)
- created_at, updated_at
- UNIQUE(budget_id, category_id)
```

#### 13. `notifications`
Thông báo

```sql
- id (UUID, PK)
- title (VARCHAR)
- message (TEXT)
- type (ENUM: info, success, warning, error)
- category (ENUM: payroll, attendance, leave, expense, system, announcement)
- is_read (BOOLEAN)
- created_by (UUID, FK -> employees)
- target_role (ENUM: user_role)
- target_users (UUID[])
- priority (VARCHAR)
- action_url (TEXT)
- action_text (VARCHAR)
- created_at, updated_at
```

#### 14. `employee_dependents`
Người phụ thuộc

```sql
- id (UUID, PK)
- employee_id (UUID, FK -> employees)
- name (VARCHAR)
- relationship (VARCHAR)
- birth_date (DATE)
- id_number (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at
```

#### 15. `company_settings`
Cài đặt công ty

```sql
- id (UUID, PK)
- company_name, company_email, company_phone, company_address, tax_id
- payroll_notifications, onboarding_notifications, attendance_alerts, maintenance_notifications (BOOLEAN)
- two_factor_auth, session_timeout, audit_logging (BOOLEAN)
- session_timeout_minutes (INTEGER)
- working_days_per_month, overtime_rate (INTEGER)
- personal_tax_deduction, dependent_tax_deduction (BIGINT)
- created_at, updated_at, updated_by
```

### Relationships

```
departments (1) ──< (N) positions
departments (1) ──< (N) employees
positions (1) ──< (N) employees
employees (1) ──< (N) employees (manager_id)
employees (1) ──< (N) attendance_records
employees (1) ──< (N) leave_requests
employees (1) ──< (N) leave_balances
employees (1) ──< (N) payroll_records
employees (1) ──< (N) expense_requests
employees (1) ──< (N) employee_dependents
financial_categories (1) ──< (N) financial_transactions
budget_categories (1) ──< (N) budget_categories (parent_id)
budget_categories (1) ──< (N) budget_allocations
```

### Indexes

Các indexes quan trọng:

- `idx_employees_department`: employees(department_id)
- `idx_employees_position`: employees(position_id)
- `idx_employees_status`: employees(status)
- `idx_attendance_employee_date`: attendance_records(employee_id, date)
- `idx_leave_requests_employee`: leave_requests(employee_id)
- `idx_payroll_employee_period`: payroll_records(employee_id, year, month)
- `idx_notifications_target_users`: notifications USING GIN(target_users)

### Row Level Security (RLS)

Tất cả tables đều có RLS enabled với policies:

- **Employees**: Chỉ admin/hr xem tất cả, employee chỉ xem chính mình
- **Attendance**: Tương tự employees
- **Leave Requests**: Employee xem của mình, HR xem tất cả
- **Payroll**: Employee xem của mình, HR/Accountant xem tất cả
- **Expense Requests**: Tương tự leave requests
- **Financial Transactions**: Chỉ admin/hr/accountant
- **Notifications**: User chỉ xem notifications gửi cho mình

---

## API và Routes

### API Structure

Tất cả API routes nằm trong `/app/api` và sử dụng Next.js Route Handlers.

### Authentication APIs

#### `POST /api/auth/session`
Tạo session từ Supabase token

#### `DELETE /api/auth/session`
Xóa session (logout)

#### `GET /api/auth/me`
Lấy thông tin user hiện tại

#### `POST /api/auth/2fa`
Setup 2FA

#### `POST /api/auth/2fa/verify`
Verify 2FA code

#### `POST /api/auth/2fa/challenge`
Challenge 2FA

#### `POST /api/auth/change-password`
Đổi mật khẩu

#### `POST /api/auth/password-recovery`
Khôi phục mật khẩu

### Employee APIs

#### `GET /api/employees`
Lấy danh sách employees (với filters)

#### `POST /api/employees`
Tạo employee mới

#### `GET /api/employees/[id]`
Lấy thông tin employee

#### `PUT /api/employees/[id]`
Cập nhật employee

#### `DELETE /api/employees/[id]`
Xóa employee

#### `POST /api/employees/[id]/avatar`
Upload avatar

#### `GET /api/employees/[id]/leave-balance`
Lấy số dư nghỉ phép

### Attendance APIs

#### `GET /api/attendance`
Lấy danh sách attendance records

#### `POST /api/attendance`
Tạo attendance record

#### `GET /api/attendance/[id]`
Lấy attendance record

#### `PUT /api/attendance/[id]`
Cập nhật attendance record

#### `POST /api/attendance/import`
Import attendance từ CSV/Excel

#### `GET /api/attendance/summary`
Tổng hợp attendance

#### `GET /api/attendance/employee/[id]`
Lấy attendance của employee

### Payroll APIs

#### `GET /api/payroll`
Lấy danh sách payroll records

#### `POST /api/payroll`
Tạo payroll record

#### `GET /api/payroll/[id]`
Lấy payroll record

#### `PUT /api/payroll/[id]`
Cập nhật payroll record

#### `POST /api/payroll/batch`
Batch create/update payroll

#### `POST /api/payroll/bulk-update`
Bulk update payroll

#### `GET /api/payroll/export-pdf`
Export payroll PDF

#### `GET /api/employee/payroll`
Lấy payroll của employee hiện tại

### Leave Request APIs

#### `GET /api/leave-requests`
Lấy danh sách leave requests

#### `POST /api/leave-requests`
Tạo leave request

#### `GET /api/leave-requests/[id]`
Lấy leave request

#### `PUT /api/leave-requests/[id]`
Cập nhật leave request (approve/reject)

#### `POST /api/leave-requests/check-overlap`
Kiểm tra overlap với đơn khác

### Expense Request APIs

#### `GET /api/expense-requests`
Lấy danh sách expense requests

#### `POST /api/expense-requests`
Tạo expense request

#### `GET /api/expense-requests/[id]`
Lấy expense request

#### `PUT /api/expense-requests/[id]`
Cập nhật expense request (approve/reject)

#### `POST /api/expense-requests/upload`
Upload attachments

#### `POST /api/expense-requests/link-financial`
Link với financial transaction

### Financial APIs

#### `GET /api/financials`
Lấy danh sách financial transactions

#### `POST /api/financials`
Tạo financial transaction

#### `GET /api/financials/[id]`
Lấy financial transaction

#### `PUT /api/financials/[id]`
Cập nhật financial transaction

### Budget APIs

#### `GET /api/budget-categories`
Lấy danh sách budget categories

#### `POST /api/budget-categories`
Tạo budget category

#### `GET /api/budget-allocations`
Lấy budget allocations

#### `POST /api/budget-allocations`
Tạo budget allocation

### Notification APIs

#### `GET /api/notifications`
Lấy danh sách notifications

#### `POST /api/notifications`
Tạo notification

#### `PUT /api/notifications/[id]`
Đánh dấu đã đọc

#### `GET /api/notifications/triggers`
Lấy notification triggers

### Settings APIs

#### `GET /api/settings`
Lấy settings

#### `PUT /api/settings`
Cập nhật settings

#### `GET /api/settings/logs`
Lấy audit logs

### API Authentication

Tất cả API routes (trừ auth routes) đều yêu cầu authentication:

1. Extract JWT token từ:
   - Cookie: `sb-access-token`
   - Authorization header: `Bearer <token>`

2. Verify token với Supabase JWT secret

3. Get user từ `auth.users` table

4. Get employee record từ `employees` table

5. Check permissions dựa trên role

### Error Handling

Tất cả API routes sử dụng `handleError` utility:

```typescript
try {
  // API logic
} catch (error) {
  return handleError(error, 'Default error message', 'table_name');
}
```

Returns:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Bảo Mật và Phân Quyền

### Authentication

#### Supabase Auth

- Email/Password authentication
- JWT tokens với expiration
- Session management
- Password hashing (bcrypt)

#### Two-Factor Authentication (2FA)

- TOTP (Time-based One-Time Password)
- QR code generation
- Backup codes
- Optional nhưng khuyến khích cho admin/hr

#### Session Management

- HttpOnly cookies
- Secure cookies (HTTPS only)
- Session timeout (configurable)
- JWT expiry notification

### Authorization

#### Role-Based Access Control (RBAC)

Hệ thống có 5 roles:

1. **admin**
   - Full system access
   - Manage all settings
   - Manage roles
   - Access audit logs

2. **hr**
   - Manage employees
   - Approve leave/expense requests
   - View all employee data
   - Manage payroll
   - Access financials

3. **accountant**
   - Manage payroll
   - Manage budgets
   - Access financials
   - View financial reports

4. **employee**
   - View own data
   - Create leave/expense requests
   - View own payroll
   - View own attendance

5. **lead**
   - Similar to employee
   - Can view team data (future feature)

#### Permission Functions

Trong `lib/role-types.ts`:

- `hasAdminAccess(role)`
- `hasHRAccess(role)`
- `canManageEmployees(role)`
- `canApproveLeaveRequests(role)`
- `canApproveExpenseRequests(role)`
- `canManagePayroll(role)`
- `canManageBudgets(role)`
- `hasFinanceManagementAccess(role)`
- `canManageSystemSettings(role)`
- `canAccessAuditLogs(role)`

### Row Level Security (RLS)

Tất cả tables có RLS policies:

#### Example: Employees Table

```sql
-- Policy: Employees can view their own data
CREATE POLICY "Employees can view own data" ON employees
FOR SELECT USING (auth_user_id = auth.uid());

-- Policy: HR/Admin can view all employees
CREATE POLICY "HR can view all employees" ON employees
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.role IN ('admin', 'hr')
  )
);
```

### Data Validation

#### Client-Side

- React Hook Form với Zod validation
- Real-time validation
- Error messages

#### Server-Side

- API route validation
- Database constraints
- Type checking với TypeScript

### Security Best Practices

1. **Never expose service_role key** trong client code
2. **Use RLS** cho tất cả database queries
3. **Validate inputs** ở cả client và server
4. **Sanitize user inputs** trước khi lưu database
5. **Use HTTPS** trong production
6. **Rate limiting** (có thể implement với middleware)
7. **Audit logging** cho sensitive operations
8. **Regular security updates** cho dependencies

---

## Quy Trình Tính Lương

### Tổng Quan

Hệ thống tính lương tự động dựa trên:
- Thông tin nhân viên (base salary, allowances)
- Dữ liệu chấm công (attendance records)
- Quy định lương (salary regulations)
- Người phụ thuộc (dependents)

### Các Bước Tính Lương

#### 1. Chuẩn Bị Dữ Liệu

- Lấy thông tin nhân viên:
  - Base salary
  - Allowances (housing, transport, meal, phone, position, attendance, other)
  - Department và position
  - Start date (để tính probation)

- Lấy dữ liệu chấm công:
  - Attendance records trong tháng
  - Tính số ngày làm việc thực tế
  - Tính overtime hours

- Lấy quy định lương:
  - Working days per month
  - Overtime rates
  - Insurance rates
  - Tax deductions
  - Effective date

- Lấy thông tin người phụ thuộc:
  - Số người phụ thuộc
  - Dependent deductions

#### 2. Tính Lương Cơ Bản

```typescript
// Xác định nhân viên thử việc
const isProbation = position.toLowerCase().includes('thử việc');
const salaryMultiplier = isProbation ? 0.85 : 1.0;

// Tính lương theo ngày
const salaryPerDay = baseSalary / workingDaysPerMonth;

// Tính số ngày làm việc thực tế
const standardWorkStatuses = ['present_full', 'present_half', 'paid_leave'];
const actualWorkingDays = attendanceRecords
  .filter(att => standardWorkStatuses.includes(att.status))
  .reduce((sum, att) => sum + att.work_value, 0);

// Tính lương cơ bản thực tế
const actualBaseSalary = salaryPerDay * actualWorkingDays * salaryMultiplier;
```

#### 3. Tính Phụ Cấp

```typescript
// Phụ cấp từ thông tin nhân viên (tỷ lệ theo số ngày làm việc)
const attendanceRatio = actualWorkingDays / workingDaysPerMonth;
const employeeAllowances = {
  meal: employee.meal_allowance || 0,
  transport: employee.transport_allowance || 0,
  phone: employee.phone_allowance || 0,
  attendance: employee.attendance_allowance || 0,
};
const adjustedEmployeeAllowances = 
  Object.values(employeeAllowances).reduce((sum, val) => sum + val, 0) * attendanceRatio;

// Phụ cấp từ form (không tỷ lệ)
const formAllowances = {
  housing: housingAllowance || 0,
  position: positionAllowance || 0,
  other: otherAllowances || 0,
};
const formAllowancesTotal = 
  Object.values(formAllowances).reduce((sum, val) => sum + val, 0);

const totalAllowances = adjustedEmployeeAllowances + formAllowancesTotal;
```

#### 4. Tính Tăng Ca

```typescript
// Tăng ca ngày thường
const weekdayOvertimeDays = attendanceRecords
  .filter(att => att.status === 'overtime')
  .reduce((sum, att) => sum + att.work_value, 0);
const weekdayOvertimePay = 
  salaryPerDay * salaryMultiplier * weekdayOvertimeDays * (overtimeWeekdayRate / 100);

// Tăng ca cuối tuần
const weekendOvertimeDays = attendanceRecords
  .filter(att => att.status === 'weekend_overtime')
  .reduce((sum, att) => sum + att.work_value, 0);
const weekendOvertimePay = 
  salaryPerDay * salaryMultiplier * weekendOvertimeDays * (overtimeWeekendRate / 100);

const totalOvertimePay = weekdayOvertimePay + weekendOvertimePay;
```

#### 5. Tính Tổng Thu Nhập

```typescript
const bonuses = {
  // Các khoản thưởng khác
};

const totalBonuses = Object.values(bonuses).reduce((sum, val) => sum + val, 0);

const grossIncome = 
  actualBaseSalary + 
  totalAllowances + 
  totalOvertimePay + 
  totalBonuses;
```

#### 6. Tính Bảo Hiểm

```typescript
// Cơ sở tính bảo hiểm (có giới hạn)
const insuranceBaseSalary = Math.min(baseSalary, maxInsuranceSalary);
const unemploymentInsuranceBase = Math.min(baseSalary, maxUnemploymentSalary);

// Bảo hiểm nhân viên đóng
const socialInsuranceEmployee = 
  insuranceBaseSalary * (employeeSocialInsuranceRate / 100);
const healthInsuranceEmployee = 
  insuranceBaseSalary * (employeeHealthInsuranceRate / 100);
const unemploymentInsuranceEmployee = 
  unemploymentInsuranceBase * (employeeUnemploymentInsuranceRate / 100);
const unionFeeEmployee = 
  insuranceBaseSalary * (employeeUnionFeeRate / 100);

const totalEmployeeInsurance = 
  socialInsuranceEmployee + 
  healthInsuranceEmployee + 
  unemploymentInsuranceEmployee + 
  unionFeeEmployee;

// Bảo hiểm công ty đóng (chỉ lưu, không trừ vào lương)
const socialInsuranceCompany = 
  insuranceBaseSalary * (companySocialInsuranceRate / 100);
const healthInsuranceCompany = 
  insuranceBaseSalary * (companyHealthInsuranceRate / 100);
const unemploymentInsuranceCompany = 
  unemploymentInsuranceBase * (companyUnemploymentInsuranceRate / 100);
```

#### 7. Tính Thuế Thu Nhập Cá Nhân

```typescript
// Thu nhập sau bảo hiểm
const incomeAfterInsurance = grossIncome - totalEmployeeInsurance;

// Thu nhập tính thuế (trừ phụ cấp ăn trưa)
const incomeForTax = incomeAfterInsurance - mealAllowance;

// Giảm trừ
const personalDeduction = 11000000; // 11 triệu VND
const dependentDeduction = numberOfDependents * 4400000; // 4.4 triệu/người phụ thuộc

// Thu nhập chịu thuế
const taxableIncome = Math.max(0, incomeForTax - personalDeduction - dependentDeduction);

// Tính thuế theo biểu thuế lũy tiến
const incomeTax = calculateProgressiveTax(taxableIncome);
```

#### Biểu Thuế Lũy Tiến (2024)

```
Bậc 1: 0 - 5 triệu: 5%
Bậc 2: 5 - 10 triệu: 10%
Bậc 3: 10 - 18 triệu: 15%
Bậc 4: 18 - 32 triệu: 20%
Bậc 5: 32 - 52 triệu: 25%
Bậc 6: 52 - 80 triệu: 30%
Bậc 7: Trên 80 triệu: 35%
```

```typescript
function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  let tax = 0;
  let remaining = taxableIncome;
  
  // Bậc 1: 0 - 5 triệu
  if (remaining > 5000000) {
    tax += 5000000 * 0.05;
    remaining -= 5000000;
  } else {
    return remaining * 0.05;
  }
  
  // Bậc 2: 5 - 10 triệu
  if (remaining > 5000000) {
    tax += 5000000 * 0.10;
    remaining -= 5000000;
  } else {
    return tax + remaining * 0.10;
  }
  
  // Bậc 3: 10 - 18 triệu
  if (remaining > 8000000) {
    tax += 8000000 * 0.15;
    remaining -= 8000000;
  } else {
    return tax + remaining * 0.15;
  }
  
  // Bậc 4: 18 - 32 triệu
  if (remaining > 14000000) {
    tax += 14000000 * 0.20;
    remaining -= 14000000;
  } else {
    return tax + remaining * 0.20;
  }
  
  // Bậc 5: 32 - 52 triệu
  if (remaining > 20000000) {
    tax += 20000000 * 0.25;
    remaining -= 20000000;
  } else {
    return tax + remaining * 0.25;
  }
  
  // Bậc 6: 52 - 80 triệu
  if (remaining > 28000000) {
    tax += 28000000 * 0.30;
    remaining -= 28000000;
  } else {
    return tax + remaining * 0.30;
  }
  
  // Bậc 7: Trên 80 triệu
  tax += remaining * 0.35;
  
  return tax;
}
```

#### 8. Tính Lương Thực Lĩnh

```typescript
const totalDeductions = totalEmployeeInsurance + incomeTax + otherDeductions;
const netSalary = grossIncome - totalDeductions;
```

### Lưu Payroll Record

Sau khi tính toán, lưu vào `payroll_records` table:

```typescript
const payrollRecord = {
  employee_id: employeeId,
  month: month,
  year: year,
  base_salary: baseSalary,
  working_days: workingDaysPerMonth,
  actual_working_days: actualWorkingDays,
  actual_base_salary: actualBaseSalary,
  housing_allowance: housingAllowance,
  transport_allowance: transportAllowance,
  meal_allowance: mealAllowance,
  phone_allowance: phoneAllowance,
  position_allowance: positionAllowance,
  attendance_allowance: attendanceAllowance,
  other_allowances: otherAllowances,
  total_allowances: totalAllowances,
  overtime_hours: totalOvertimeHours,
  overtime_rate: overtimeRate,
  overtime_pay: totalOvertimePay,
  social_insurance_employee: socialInsuranceEmployee,
  health_insurance_employee: healthInsuranceEmployee,
  unemployment_insurance_employee: unemploymentInsuranceEmployee,
  union_fee_employee: unionFeeEmployee,
  social_insurance_company: socialInsuranceCompany,
  health_insurance_company: healthInsuranceCompany,
  unemployment_insurance_company: unemploymentInsuranceCompany,
  gross_income: grossIncome,
  income_after_insurance: incomeAfterInsurance,
  personal_deduction: personalDeduction,
  dependent_deduction: dependentDeduction,
  number_of_dependents: numberOfDependents,
  taxable_income: taxableIncome,
  income_tax: incomeTax,
  total_deductions: totalDeductions,
  net_salary: netSalary,
  status: 'pending',
  created_by: currentUserId,
};
```

### Batch Calculation

Có thể tính lương cho nhiều nhân viên cùng lúc:

1. Lấy danh sách employees
2. Loop qua từng employee
3. Tính lương cho mỗi employee
4. Lưu payroll records
5. Hiển thị progress

---

## Hướng Dẫn Triển Khai

### Yêu Cầu Hệ Thống

#### Development

- Node.js >= 18.17.0
- npm >= 9.0.0 hoặc yarn >= 4.9.3
- Git
- Code editor (VS Code recommended)

#### Production

- Node.js >= 18.17.0
- Supabase account
- Hosting platform (Vercel recommended)

### Cài Đặt Development

#### 1. Clone Repository

```bash
git clone https://github.com/TDSolutionsHN/HRM.git
cd HRM
```

#### 2. Install Dependencies

```bash
npm install
# hoặc
yarn install
# hoặc
pnpm install
```

#### 3. Setup Supabase

1. Tạo Supabase project tại https://app.supabase.com
2. Lấy credentials:
   - Project URL
   - `anon` public key
   - `service_role` key (secret)
   - JWT secret

#### 4. Setup Database

1. Chạy schema script trong Supabase SQL Editor:
   ```bash
   # Copy nội dung từ supabase-schema.sql
   # Paste vào Supabase SQL Editor
   # Execute
   ```

2. Setup RLS policies (đã có trong schema)

3. Setup Storage buckets:
   - `avatars`: Cho avatar uploads
   - `expense-attachments`: Cho expense receipts
   - `documents`: Cho documents

#### 5. Configure Environment Variables

Tạo file `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Application
NEXT_PUBLIC_APP_NAME=HRM System
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
NODE_ENV=development
```

#### 6. Run Development Server

```bash
npm run dev
# hoặc
yarn dev
# hoặc
pnpm dev
```

Mở browser tại http://localhost:3000

### Cài Đặt Production

#### 1. Build Application

```bash
npm run build
```

#### 2. Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Configure environment variables trong Vercel dashboard

#### 3. Deploy to Other Platforms

- **Netlify**: Drag and drop `out` folder
- **AWS Amplify**: Connect GitHub repository
- **DigitalOcean App Platform**: Connect GitHub repository
- **Traditional hosting**: Upload `out` folder và run `npm start`

### Database Migration

Khi có thay đổi schema:

1. Tạo migration script trong `/database`
2. Chạy script trong Supabase SQL Editor
3. Test thoroughly
4. Document changes

### Backup và Recovery

#### Backup

1. **Database**: Supabase tự động backup hàng ngày
2. **Manual backup**: Export từ Supabase dashboard
3. **Code**: Git repository

#### Recovery

1. Restore từ Supabase backup
2. Redeploy code từ Git

### Monitoring và Logging

#### Supabase Dashboard

- Monitor database performance
- View query logs
- Check error logs

#### Application Logs

- Console logs (development)
- Server logs (production)
- Error tracking (có thể tích hợp Sentry)

### Performance Optimization

1. **Database**:
   - Indexes cho các queries thường dùng
   - Query optimization
   - Connection pooling

2. **Frontend**:
   - Code splitting
   - Image optimization
   - Lazy loading
   - Caching

3. **API**:
   - Response caching
   - Batch operations
   - Pagination

### Security Checklist

- [ ] Environment variables không commit vào Git
- [ ] RLS policies đã setup đúng
- [ ] HTTPS enabled trong production
- [ ] 2FA enabled cho admin accounts
- [ ] Regular security updates
- [ ] Audit logging enabled
- [ ] Rate limiting (nếu cần)
- [ ] CORS configured correctly

---

## Kết Luận

Hệ thống HRM là một giải pháp quản lý nhân sự và tính lương toàn diện, được xây dựng với các công nghệ hiện đại và best practices. Tài liệu này cung cấp overview chi tiết về:

- Công nghệ và kiến trúc
- Cấu trúc và tổ chức code
- Các tính năng chính
- Database schema
- API endpoints
- Bảo mật và phân quyền
- Quy trình tính lương
- Hướng dẫn triển khai

Để biết thêm chi tiết, vui lòng tham khảo:
- Code comments trong source code
- API documentation (có thể generate từ code)
- Database schema comments
- README.md

---

**Tài liệu được cập nhật lần cuối**: 2024
**Phiên bản**: 1.0
**Tác giả**: TDSolutionsHN

