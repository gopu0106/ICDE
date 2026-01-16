# CampusSync - Integrated Campus Dining Ecosystem

A production-ready, campus-scale digital wallet and dining ecosystem for universities.

## System Overview

CampusSync enables a unified e-wallet system where:
- Students prepay mess fees into a central wallet
- Only consumed meals are charged (consumption-based billing)
- Skipped meals remain as wallet balance
- Balance can be used across all messes and canteens
- Payments via QR code scanning
- Central accounting and vendor settlement

## Architecture

```
CampusSync/
├── backend/          # Node.js + Express backend
├── frontend/         # React/Next.js frontend
├── database/         # PostgreSQL migrations and schema
├── docs/            # API documentation, architecture docs
└── deployment/      # Docker, deployment configs
```

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (primary), Redis (sessions/cache)
- **Auth**: JWT + Refresh Tokens
- **Frontend**: React + TypeScript + Tailwind CSS
- **Real-time**: WebSockets (for balance updates)

## Key Features

1. **Student Wallet System**: Prepaid wallet with real-time balance tracking
2. **Consumption-Based Billing**: Pay only for meals consumed
3. **QR Payment System**: Secure, time-bound QR codes for transactions
4. **Vendor Management**: Unified system for messes and canteens
5. **Admin Dashboard**: Analytics, reporting, and settlement tools
6. **Security**: Encryption, audit logs, fraud prevention

## Getting Started

See individual module READMEs for setup instructions.

## License

Proprietary - CampusSync Platform

