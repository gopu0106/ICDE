# CampusSync Frontend

Production-ready frontend for the Integrated Campus Dining Ecosystem.

## Features

### Student App (Mobile-First)
- ✅ Wallet Dashboard with real-time balance
- ✅ QR Code Scanner (scan counter QR)
- ✅ Transaction History with filters
- ✅ Spending Analytics with charts
- ✅ Top-up functionality

### Vendor POS Dashboard (Tablet-Optimized)
- ✅ Vendor Login
- ✅ Scan Student QR for payments
- ✅ Transaction Management
- ✅ Daily Summary with charts
- ✅ Performance Metrics

### Admin Dashboard (Desktop)
- ✅ System Overview (KPIs)
- ✅ Analytics & Consumption Trends
- ✅ Vendor Settlements Management
- ✅ Audit Log Viewer

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts
- **QR Scanner**: html5-qrcode
- **Date Utils**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── student/            # Student app pages
│   │   ├── vendor/             # Vendor dashboard pages
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (redirects)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── shared/            # Reusable components
│   │   └── student/            # Student-specific components
│   └── lib/
│       ├── api.ts              # API client
│       └── store/              # Zustand stores
├── public/                     # Static assets
└── package.json
```

## Key Components

### Shared Components
- `Button` - Primary, secondary, danger, success variants
- `Card` - Container component
- `Input` - Form input with validation
- `Loading` - Loading spinner
- `EmptyState` - Empty state display
- `Badge` - Status badges

### Student Components
- `WalletBalance` - Prominent balance display

## API Integration

All API calls go through `src/lib/api.ts` which:
- Handles authentication tokens
- Automatically refreshes expired tokens
- Provides typed methods for all endpoints

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Design Principles

1. **Mobile-First**: Student app optimized for mobile devices
2. **High Contrast**: Clear, readable UI with good contrast
3. **Fast Interactions**: Minimal taps/clicks for common actions
4. **Clear Feedback**: Loading states, success/error messages
5. **Accessible**: Semantic HTML, proper ARIA labels

## Routes

### Student Routes
- `/student/login` - Student login
- `/student/dashboard` - Main dashboard
- `/student/scan` - QR code scanner
- `/student/history` - Transaction history
- `/student/analytics` - Spending analytics
- `/student/topup` - Wallet top-up

### Vendor Routes
- `/vendor/login` - Vendor login
- `/vendor/dashboard` - Vendor dashboard
- `/vendor/scan` - Scan student QR
- `/vendor/transactions` - Transaction list
- `/vendor/summary` - Daily summary

### Admin Routes
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/analytics` - Detailed analytics
- `/admin/settlements` - Vendor settlements
- `/admin/audit` - Audit logs

## Notes

- All pages are protected by authentication checks
- QR scanning requires camera permissions
- Charts use Recharts for responsive visualizations
- State is persisted using Zustand with localStorage



