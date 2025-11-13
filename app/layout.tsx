import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import {Header } from "@/components/ui/header"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/contexts/language-context"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth-guard"
import { JwtExpiryNotification } from "@/components/jwt-expiry-notification"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TDSolution - Modern Payroll Management",
  description: "Internal payroll management system for HR and employees",
  generator: 'v0.dev',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

const MainLayout = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen w-full">
    <AppSidebar />
    <div className="flex-1 overflow-hidden">
      <Header />
      <main className="overflow-auto p-6">
        {children}
      </main>
    </div>
  </div>
))

MainLayout.displayName = 'MainLayout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LanguageProvider>
            <AuthGuard>
              <SidebarProvider>
                <MainLayout>{children}</MainLayout>
                <Toaster />
                <JwtExpiryNotification />
              </SidebarProvider>
            </AuthGuard>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}