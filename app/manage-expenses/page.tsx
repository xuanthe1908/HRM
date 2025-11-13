import { AuthGuard } from "@/components/auth-guard";
import ExpensesPage from "../expenses/page";

export default function ManageExpensesRoute() {
  return (
    <AuthGuard allowedDbRoles={["admin","accountant"]} redirectTo="/my-expenses">
      <ExpensesPage />
    </AuthGuard>
  )
}
