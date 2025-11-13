import { AuthGuard } from "@/components/auth-guard"

export default function FinancialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedDbRoles={["admin","accountant"]} redirectTo="/forbidden">
      {children}
    </AuthGuard>
  )
}


