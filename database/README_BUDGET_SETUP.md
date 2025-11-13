# 🔧 Hướng dẫn Nhanh - Thiết lập Hệ thống Ngân sách

## ⚠️ Khắc phục lỗi "duplicate key"

Bạn gặp lỗi này vì file SQL gốc có mã danh mục trùng lặp. Hãy làm theo các bước sau:

## 📋 Các bước thực hiện

### 1️⃣ Xóa dữ liệu cũ (nếu có)
```sql
-- Copy và chạy đoạn code này trong PostgreSQL:
DELETE FROM expense_budget_mapping;
DELETE FROM budget_allocations;  
DELETE FROM budget_categories;
```

### 2️⃣ Chạy file đã sửa lỗi
```bash
# Trong terminal, thư mục database/:
psql -d your_database -f create_hierarchical_budget_categories_fixed.sql
```

### 3️⃣ Thêm trường reference 
```bash
psql -d your_database -f add_financial_transactions_reference.sql
```

## ✅ Kiểm tra thành công

```sql
SELECT COUNT(*) as total_categories FROM budget_categories;
-- Kết quả mong đợi: khoảng 30+ danh mục

SELECT code, name FROM budget_categories WHERE level = 1;
-- Sẽ hiển thị 6 danh mục chính: 100000, 101000, 102000, 103000, 104000, 200000
```

## 📁 Files quan trọng

- ✅ `create_hierarchical_budget_categories_fixed.sql` - **Chạy file này**
- ❌ `create_hierarchical_budget_categories.sql` - File cũ có lỗi
- 🧹 `cleanup_budget_categories.sql` - Xóa dữ liệu cũ
- 🔗 `add_financial_transactions_reference.sql` - Tích hợp expenses

## 🎯 Sau khi hoàn thành

1. Vào http://localhost:3000/financials
2. Chọn tab "Dự toán - Ngân sách"  
3. Click "Quản lý danh mục" để thấy cây danh mục mới
4. Tạo ngân sách và phân bổ theo danh mục
5. Tại /expenses, duyệt chi phí và tích hợp với ngân sách

## 🆘 Cần hỗ trợ?

Nếu vẫn gặp lỗi, hãy gửi đoạn lỗi cụ thể để được hỗ trợ nhanh hơn!
