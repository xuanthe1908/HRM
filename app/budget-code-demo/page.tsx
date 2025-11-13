import BudgetCodeDemo from "@/components/budget-code-demo"

export default function BudgetCodeDemoPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Demo Sinh Mã Ngân sách</h2>
          <p className="text-muted-foreground">
            Test và demo logic tự động sinh mã danh mục ngân sách
          </p>
        </div>
      </div>
      
      <BudgetCodeDemo />
    </div>
  )
}
