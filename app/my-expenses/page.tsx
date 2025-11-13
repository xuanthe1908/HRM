import { AuthGuard } from "@/components/auth-guard";
import ExpensesPage from "../expenses/page";

export default function MyExpensesRoute() {
  return (
    <AuthGuard>
      <ExpensesPage />
    </AuthGuard>
  )
}
