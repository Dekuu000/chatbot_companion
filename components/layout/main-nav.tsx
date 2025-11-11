"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  UserCircle,
  GraduationCap,
  BookOpen
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: Sparkles },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/interview", label: "Interview", icon: GraduationCap },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserCircle },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        if (!Icon) {
          console.warn(`Icon not found for ${item.href}`)
          return null
        }
        
        const isActive = pathname === item.href || 
          (item.href !== "/" && pathname?.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl h-9 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-muted hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

