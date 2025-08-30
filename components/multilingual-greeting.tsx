'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import dayjs from 'dayjs'

interface Greeting {
  language: string
  country: string
  flag: string
  morning: string
  afternoon: string
  evening: string
}

const greetings: Greeting[] = [
  {
    language: '中文',
    country: 'Taiwan',
    flag: '🇹🇼',
    morning: '早安',
    afternoon: '午安',
    evening: '晚安'
  },
  {
    language: 'English',
    country: 'USA',
    flag: '🇺🇸',
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening'
  },
  {
    language: '日本語',
    country: 'Japan',
    flag: '🇯🇵',
    morning: 'おはよう',
    afternoon: 'こんにちは',
    evening: 'こんばんは'
  },
  {
    language: '한국어',
    country: 'South Korea',
    flag: '🇰🇷',
    morning: '좋은 아침',
    afternoon: '좋은 오후',
    evening: '좋은 저녁'
  },
  {
    language: 'Français',
    country: 'France',
    flag: '🇫🇷',
    morning: 'Bonjour',
    afternoon: 'Bon après-midi',
    evening: 'Bonsoir'
  },
  {
    language: 'Español',
    country: 'Spain',
    flag: '🇪🇸',
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches'
  },
  {
    language: 'Deutsch',
    country: 'Germany',
    flag: '🇩🇪',
    morning: 'Guten Morgen',
    afternoon: 'Guten Tag',
    evening: 'Guten Abend'
  },
  {
    language: 'Italiano',
    country: 'Italy',
    flag: '🇮🇹',
    morning: 'Buongiorno',
    afternoon: 'Buon pomeriggio',
    evening: 'Buonasera'
  },
  {
    language: 'Русский',
    country: 'Russia',
    flag: '🇷🇺',
    morning: 'Доброе утро',
    afternoon: 'Добрый день',
    evening: 'Добрый вечер'
  },
  {
    language: 'العربية',
    country: 'Saudi Arabia',
    flag: '🇸🇦',
    morning: 'صباح الخير',
    afternoon: 'مساء الخير',
    evening: 'مساء الخير'
  }
]

interface MultilingualGreetingProps {
  className?: string
}

export function MultilingualGreeting({ className }: MultilingualGreetingProps) {
  const [currentGreeting, setCurrentGreeting] = useState<Greeting | null>(null)
  const [greetingMessage, setGreetingMessage] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    const updateGreeting = () => {
      // Use random language selection
      const randomIndex = Math.floor(Math.random() * greetings.length)
      const selectedGreeting = greetings[randomIndex]

      // Select greeting based on time
      const hour = dayjs().hour()
      let message = ''

      if (hour < 12) {
        message = selectedGreeting.morning
      } else if (hour < 18) {
        message = selectedGreeting.afternoon
      } else {
        message = selectedGreeting.evening
      }

      setCurrentGreeting(selectedGreeting)
      setGreetingMessage(message)
    }

    updateGreeting()

    // Check every minute in case time period changes
    const greetingInterval = setInterval(updateGreeting, 60000)

    return () => clearInterval(greetingInterval)
  }, [])

  if (!currentGreeting) {
    return (
      <Card className={`shadow-sm ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">{currentGreeting.flag}</span>
          Daily Greeting
        </CardTitle>
        <CardDescription>Greeting from {currentGreeting.country}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <div className="text-3xl font-bold mb-3 text-primary">
            {greetingMessage}
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            {currentGreeting.language} • {currentGreeting.country}
          </div>

          {/* Digital Clock */}
          <div className="border-t pt-4 mt-4">
            <div className="text-2xl font-mono font-bold">
              {currentTime.toLocaleTimeString('zh-TW', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {currentTime.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}