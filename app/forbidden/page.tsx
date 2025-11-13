export default function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="text-muted-foreground">Vui lòng quay lại trang trước hoặc liên hệ quản trị viên nếu cần hỗ trợ.</p>
      </div>
    </div>
  )
}
