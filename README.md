# 🔥 Campfire

A digital badge platform for managing and showcasing achievement badges. Built with Next.js, Tailwind CSS, and Supabase.

**Powered by Group 5 Scouts**

## Features

- **Badge Templates**: Organizers can create reusable badge templates with custom criteria
- **Badge Awards**: Issue badges to users and track achievements
- **User Profiles**: Showcase earned badges and influence networks
- **Influence Tracking**: See who influenced whom in earning badges
- **Browse & Search**: Discover all available badges with filtering

## Getting Started

### 1. Database Setup

Run the SQL scripts in order to set up your Supabase database:

1. **Create Schema**: Run `scripts/01-create-schema.sql`
   - Creates 5 tables: users, organizers, badge_templates, awards, influences
   - Sets up proper relationships and indexes

2. **Seed Data**: Run `scripts/02-seed-data.sql`
   - Populates the database with mock data for testing

### 2. Start the Development Server

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit `http://localhost:3000` to see the app.

## Seed Data Overview

The seed data includes:

### Mock Users (8 total)
- **alice.eth** - User role
- **bob.eth** - User role  
- **charlie.eth** - User role
- **diana.eth** - User role
- **eve.eth** - User role
- **frank.eth** - Organizer role
- **grace.eth** - Organizer role
- **henry.eth** - Organizer role

### Organizers (3 total)
- **Tech Academy** (frank.eth) - Technology education badges
- **Creative Guild** (grace.eth) - Arts and design badges
- **Fitness League** (henry.eth) - Health and fitness badges

### Badge Templates (6 total)
- **Code Master** - Complete 10 coding challenges
- **Design Pro** - Create 5 professional designs
- **Marathon Runner** - Complete a full marathon
- **Team Player** - Collaborate on 3 team projects
- **Innovation Award** - Develop an innovative solution
- **Community Leader** - Lead 5 community events

### Awards (8 issued badges)
Various users have earned different badges with influence relationships tracked.

## Testing the App

### Landing Page
Visit `/` to see:
- Hero section with app overview
- Feature highlights
- Quick access links to test different roles

### Organizer Dashboards

Test organizer functionality by visiting:

- **Tech Academy**: `/organizer/frank.eth`
- **Creative Guild**: `/organizer/grace.eth`
- **Fitness League**: `/organizer/henry.eth`

**Features to test:**
- View organization stats and badge templates
- Create new badge templates (click "Create Badge Template")
- Award badges to users (click "Award Badge" on any template)
- See recent awards issued by the organization

### User Profiles

Test user profiles by visiting:

- `/profile/alice.eth`
- `/profile/bob.eth`
- `/profile/charlie.eth`
- `/profile/diana.eth`
- `/profile/eve.eth`

**Features to test:**
- View earned badges with award dates
- See influence networks (who influenced this user)
- See who this user influenced
- View profile stats (total badges, influences)

### Browse & Search

Visit `/browse` to:
- See all available badge templates
- Search by badge name or description
- Filter by criteria or organizer
- View award counts for each badge
- Click through to organizer pages

## App Structure

\`\`\`
campfire/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── browse/
│   │   └── page.tsx                # Browse and search badges
│   ├── organizer/
│   │   └── [wallet]/
│   │       └── page.tsx            # Organizer dashboard
│   └── profile/
│       └── [wallet]/
│           └── page.tsx            # User profile
├── components/
│   ├── create-badge-dialog.tsx     # Create badge template form
│   ├── award-badge-dialog.tsx      # Award badge form
│   └── search-filters.tsx          # Search and filter UI
├── lib/
│   └── supabase.ts                 # Supabase client setup
└── scripts/
    ├── 01-create-schema.sql        # Database schema
    └── 02-seed-data.sql            # Seed data
\`\`\`

## Database Schema

### Tables

1. **users** - All platform users with roles (user, organizer, viewer)
2. **organizers** - Additional info for users with organizer role
3. **badge_templates** - Reusable badge definitions created by organizers
4. **awards** - Issued badges linking users to badge templates
5. **influences** - Tracks who influenced whom in earning badges

### Key Relationships

- Organizers are users with `role = 'organizer'` and additional org details
- Badge templates belong to organizers
- Awards link users to badge templates
- Influences track user-to-user relationships for specific awards

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## Environment Variables

The following Supabase environment variables are automatically configured:

- `SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY_ANON_KEY`

## Notes

- **No Authentication**: This is a demo app using mock data. Users are identified by wallet addresses in URLs.
- **Wallet Addresses**: Used as unique identifiers (e.g., "alice.eth", "bob.eth")
- **Role Switching**: Navigate between different roles by visiting different URLs
- **Placeholder Images**: Badge images use placeholder URLs

## Quick Test Flow

1. **Start at Landing**: Visit `/` to see the overview
2. **Browse Badges**: Go to `/browse` and search for badges
3. **View Organizer**: Click on an organizer or visit `/organizer/frank.eth`
4. **Create Badge**: Try creating a new badge template
5. **Award Badge**: Award a badge to a user
6. **View Profile**: Visit `/profile/alice.eth` to see earned badges
7. **Check Influences**: See the influence network on user profiles

---

Built with ❤️ by Group 5 Scouts
