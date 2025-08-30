'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="h-7 w-7 sm:h-8 sm:w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">S</span>
            </div>
            <span className="font-bold text-base sm:text-lg">Student Class Tracking</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button
                variant={pathname === '/' ? 'secondary' : 'ghost'}
                size="sm"
                className="px-4"
              >
                Home
              </Button>
            </Link>
            <Link href="/notifications">
              <Button
                variant={pathname === '/notifications' ? 'secondary' : 'ghost'}
                size="sm"
                className="px-4"
              >
                Course Notifications
              </Button>
            </Link>
            <Link href="/attendance">
              <Button
                variant={pathname === '/attendance' ? 'secondary' : 'ghost'}
                size="sm"
                className="px-4"
              >
                Class Management
              </Button>
            </Link>
            <Link href="/line-users">
              <Button
                variant={pathname === '/line-users' ? 'secondary' : 'ghost'}
                size="sm"
                className="px-4"
              >
                LINE Followers
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2">

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-gray-50">
            <div className="py-4 space-y-1">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start px-4"
                >
                  Home
                </Button>
              </Link>
              <Link href="/notifications" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/notifications' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start px-4"
                >
                  Course Notifications
                </Button>
              </Link>
              <Link href="/attendance" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/attendance' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start px-4"
                >
                  Class Management
                </Button>
              </Link>
              <Link href="/line-users" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/line-users' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start px-4"
                >
                  LINE Followers
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link href="/" className="hover:text-foreground">Home</Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}