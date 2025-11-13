import { AuthGuard } from "@/components/auth-guard"

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedDbRoles={["admin","accountant"]} redirectTo="/forbidden">
      {children}
    </AuthGuard>
  )
}


