'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/today', label: 'Today' },
  { href: '/line-users', label: 'Students' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/attendance', label: 'Attendance' },
]

export function Navigation() {
  const pathname = usePathname()

  const currentPage = links.find(l => l.href === pathname) || links[0]

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto flex h-12 items-center justify-between px-4 sm:px-6 max-w-6xl">
        {/* Desktop: breadcrumb with all pages */}
        <Breadcrumb className="hidden md:block">
          <BreadcrumbList>
            {links.map((link, i) => (
              <span key={link.href} className="contents">
                <BreadcrumbItem>
                  {link.href === pathname ? (
                    <BreadcrumbPage>{link.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={link.href}>{link.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {i < links.length - 1 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile: current page + sheet menu */}
        <Breadcrumb className="md:hidden">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" className="px-2 h-8">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 pt-10">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav className="flex flex-col gap-1">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    pathname === link.href
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
