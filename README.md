# Coach Management System

A Next.js application that integrates Google Calendar events with LINE notifications to track student attendance and manage class records.

## What it does

```
Google Calendar Events --> Fetch event data --> Create class records
                     |                               |
                     v                               v
               Extract summary                 Store in database
                     |                               |
                     v                               v
            Match student by name --> Send LINE notification
                     |                               
                     v                               
              (LINE notification sent)              
                                                     
                                                     
Admin dashboard --> Mark actual attendance --> Update class_records --> Deduct class count
```

**Key constraint**: Google Calendar event summary must match student name in database for proper LINE notification matching.

## Prerequisites

### Required Services
1. **LINE Developer Account** - Create at https://developers.line.biz
2. **LINE Business Account** - Set up LINE Official Account
3. **Google Calendar** - With calendar containing your coaching events
4. **Supabase Account** - For database hosting (free tier available)

### Technical Setup
- Node.js 18+ installed
- Basic understanding of environment variables
- Access to your server/hosting platform

### Environment Variables
Create a `.env` file with the following configuration:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Calendar API
GOOGLE_CALENDAR_ID=your_calendar_id@gmail.com
GOOGLE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your_google_project_id

# LINE Messaging API
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
```

## Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. **Database setup**: 
   - Import `migrations/latest.sql` to your Supabase SQL Editor
   - Add several students to the `students` table
   - **Critical**: Student names must exactly match Google Calendar event summaries for notification matching
4. **Google Calendar setup**:
   - Create some coaching events in your Google Calendar
   - Event summary must match student names in your database (this is the matching constraint)
5. Configure your LINE webhook endpoint  
6. Start the development server: `npm run dev`

## How it works

The system follows this workflow:
1. Google Calendar API fetches your coaching events
2. System creates class records for each event
3. LINE notifications are sent to students before classes (no confirmation required)
4. Admin uses dashboard to mark actual attendance after class
5. Remaining class counts are automatically updated when attendance is marked


## Need Help?

This system requires setting up multiple API integrations. If you're not familiar with API configuration, consider asking AI assistants for step-by-step guidance on:
- Setting up LINE Developer Console
- Configuring Google Calendar API
- Managing environment variables securely

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (via Supabase)
- **Integrations**: Google Calendar API, LINE Messaging API


