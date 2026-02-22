# Image to Video Generator

An AI-powered web application that transforms static images into dynamic videos using cutting-edge AI technology.

## Features

- **Image to Video Conversion**: Upload any image and generate a video using AI
- **Real-time Progress Tracking**: Monitor video generation progress in real-time
- **Drag & Drop Upload**: Easy image upload with drag and drop support
- **Promo Code System**: Flexible access control with bonus videos and unlimited access codes
- **User Authentication**: Secure authentication powered by Clerk
- **Admin Panel**: Manage promo codes and view usage statistics
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: Clerk
- **AI**: AI-powered video generation API

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Clerk account for authentication
- (Optional) A PostgreSQL database for production

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/image-to-video-generator.git
cd image-to-video-generator
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your values:
```env
DATABASE_URL="file:./db/custom.db"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
ADMIN_PASSWORD="your_admin_password"
```

5. Initialize the database:
```bash
bun run db:push
bun run db:seed
```

6. Start the development server:
```bash
bun run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import your repository in [Vercel](https://vercel.com)

3. Set environment variables (see below)

4. Deploy!

### Required Environment Variables for Vercel

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `ADMIN_PASSWORD` | Password for admin panel | Yes |

### Database Setup for Production

For production, use PostgreSQL instead of SQLite:

1. Create a PostgreSQL database (Vercel Postgres, Supabase, Neon, etc.)

2. Set `DATABASE_URL` to your PostgreSQL connection string

3. Run migrations:
```bash
bun run db:push
bun run db:seed
```

## Promo Code System

### Default Limits

- Non-logged-in users: 3 videos per day
- Promo codes can grant bonus videos or unlimited access

### Built-in Promo Codes

| Code | Access | Uses |
|------|--------|------|
| `JIMENEZ_2025_OWNER#` | Unlimited (Owner) | Single use, protected |
| `ASJVIP` | +10 bonus videos | Unlimited redemptions |
| `ASJ_TESTER#` | Unlimited | Unlimited redemptions |

### Admin Panel

Access the admin panel at `/admin` with your `ADMIN_PASSWORD` to:
- Create new promo codes
- View redemption statistics
- Deactivate codes
- View user usage

## API Endpoints

### Video Generation
- `POST /api/video/generate` - Generate video from image

### Promo Codes
- `POST /api/promo/redeem` - Redeem a promo code
- `GET /api/promo/usage` - Get current usage stats

### Admin
- `GET /api/admin/codes` - List all promo codes
- `POST /api/admin/codes` - Create new promo code
- `DELETE /api/admin/codes` - Delete a promo code

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script for promo codes
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── admin/         # Admin panel
│   │   └── page.tsx       # Homepage
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
├── .env.example           # Environment template
├── vercel.json            # Vercel configuration
└── package.json
```

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and feature requests, please open a GitHub issue.
