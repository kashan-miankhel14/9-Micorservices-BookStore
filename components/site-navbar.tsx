"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </Link>
  )
}

export default function SiteNavbar({ initialMe }: { initialMe?: any }) {
  const router = useRouter()
  const me = initialMe
  const onSearch = (formData: FormData) => {
    const q = String(formData.get("q") || "")
    router.push(q ? `/books?q=${encodeURIComponent(q)}` : "/books")
  }
  const initials = (me?.user?.name?.slice(0, 1) || me?.user?.email?.slice(0, 1) || "U").toUpperCase()

  return (
    <nav className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-semibold">
          Bookstore
        </Link>
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/books">Books</NavLink>
          <NavLink href="/cart">Cart</NavLink>
          <NavLink href="/orders">Orders</NavLink>
        </div>
      </div>

      <form action={onSearch} className="hidden md:flex items-center gap-2 w-full max-w-md">
        <Input name="q" placeholder="Search books, authors, ISBN..." />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex items-center gap-2">
        {!me?.user ? (
          <>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="User menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{me.user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/orders">My Orders</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
                  router.refresh()
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
