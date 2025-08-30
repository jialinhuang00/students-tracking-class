import { google, calendar_v3 } from 'googleapis'

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const projectId = process.env.GOOGLE_PROJECT_ID

  if (!clientEmail || !privateKey || !projectId) {
    throw new Error(`Missing Google Calendar credentials:
      GOOGLE_CLIENT_EMAIL: ${clientEmail ? 'OK' : 'MISSING'}
      GOOGLE_PRIVATE_KEY: ${privateKey ? 'OK' : 'MISSING'}
      GOOGLE_PROJECT_ID: ${projectId ? 'OK' : 'MISSING'}
    `)
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
      project_id: projectId,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  return auth
}

export function getCalendar() {
  return google.calendar({ version: 'v3', auth: getGoogleAuth() })
}

// Taipei Time
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('Z', '+08:00')
}

export interface CreateEventData {
  summary: string
  startDateTime: Date
  endDateTime: Date
  coachEmail: string
  description?: string
}

export async function createCalendarEvent(eventData: CreateEventData) {
  const { summary, startDateTime, endDateTime, coachEmail, description } = eventData

  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID environment variable is missing')
  }

  const event: calendar_v3.Schema$Event = {
    summary,
    description: description || `Class：${summary}`,
    start: {
      dateTime: formatDateTime(startDateTime),
      timeZone: 'Asia/Taipei',
    },
    end: {
      dateTime: formatDateTime(endDateTime),
      timeZone: 'Asia/Taipei',
    },
    // TODO: need add coach?
    // attendees: [
    //   { email: coachEmail },
    // ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 24 * 60 }, // 24小時前
      ],
    },
  }

  try {
    console.log(`Creating event: ${summary} at ${startDateTime} in calendar: ${calendarId}`)

    const calendar = getCalendar()
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    })

    return {
      success: true,
      eventId: response.data.id,
      event: response.data,
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getCalendarEvents(startDate: Date, endDate: Date) {
  try {
    const calendar = getCalendar()
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      timeMin: formatDateTime(startDate),
      timeMax: formatDateTime(endDate),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    })

    return {
      success: true,
      events: response.data.items || [],
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      events: [],
    }
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const calendar = getCalendar()
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId,
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function clearCalendar() {
  try {

    const now = new Date()
    const pastDate = new Date(now)
    pastDate.setFullYear(pastDate.getFullYear() - 1)
    const futureDate = new Date(now)
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const eventsResult = await getCalendarEvents(pastDate, futureDate)

    if (!eventsResult.success || eventsResult.events.length === 0) {
      return { success: true, method: 'batch_delete', deletedCount: 0 }
    }

    let deletedCount = 0
    const events = eventsResult.events
    console.log(`Found ${events.length} events, start batching removing...`)

    // 使用 batch requests 來提高效率
    const batchSize = 10
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (event) => {
          if (event.id) {
            try {
              const deleteResult = await deleteCalendarEvent(event.id)
              if (deleteResult.success) {
                deletedCount++
                console.log(`✅ Already deleted: ${event.summary || event.id}`)
              }
            } catch (error) {
              console.log(`❌ Delete Failed: ${event.summary || event.id}`)
            }
          }
        })
      )

      // 避免 API 限制
      if (i + batchSize < events.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return { success: true, method: 'batch_delete', deletedCount }

  } catch (error) {
    console.error('Error clearing calendar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}