import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Coach {
  id: number
  name: string
  phone?: string
  email?: string
  google_calendar_id?: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: number
  name: string
  phone?: string
  line_user_id?: string
  total_classes: number
  remaining_classes: number
  created_at: string
  updated_at: string
}

export interface ClassRecord {
  id: number
  student_id: number
  coach_id: number
  class_date: string
  event_id?: string
  attended: boolean | null
  created_at: string
  updated_at: string
  student?: Student
  coach?: Coach
}