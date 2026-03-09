'use client'

import { Navigation } from '@/components/navigation'
import { TomorrowReminders } from '@/components/tomorrow-reminders'
import { TodayAttendance } from '@/components/today-attendance'
import { LowBalanceAlert } from '@/components/low-balance-alert'

export default function TodayPage() {
  return (
    <div className="min-h-screen bg-gray-50/30">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-2xl space-y-4">
        <TomorrowReminders />
        <TodayAttendance />
        <LowBalanceAlert />
      </div>
    </div>
  )
}
