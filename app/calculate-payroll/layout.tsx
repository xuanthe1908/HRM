import { AuthGuard } from "@/components/auth-guard"

export default function CalculatePayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedDbRoles={["admin","accountant"]} redirectTo="/forbidden">
      {children}
    </AuthGuard>
  )
}


