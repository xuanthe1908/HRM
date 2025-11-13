import { AuthGuard } from "@/components/auth-guard"

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedDbRoles={["admin","hr"]} redirectTo="/forbidden">
      {children}
    </AuthGuard>
  )
}


