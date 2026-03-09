import { google } from 'googleapis'

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
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })

  return auth
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getGoogleAuth() })
}

// Taipei Time
function formatDateTime(date: Date): string {
  return date.toISOString().replace('Z', '+08:00')
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

