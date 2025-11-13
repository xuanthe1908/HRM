"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import Image from "next/image"

const Header = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"header">
>(({ className, ...props }, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <>
      <header
        ref={ref}
        className={cn(
          "fixed top-0 z-40 w-full border-b bg-background lg:hidden",
          className
        )}
        {...props}
      >
        <div className="flex h-[--header-height-mobile] items-center justify-between px-4">
          <div className="flex items-center">
            <Image
              src="/logo.png" 
              alt="Logo"
              width={32}
              height={32}
              className="h-10 w-auto"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpenMobile(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-[--header-height-mobile] lg:h-0" />
    </>
  )
})
Header.displayName = "Header"

export { Header }