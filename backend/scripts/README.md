# Seed Scripts

## Admin Seed Script

Creates a default admin user for local development and demo purposes.

### Usage

```bash
npm run seed:admin
```

### What it does

1. Checks if an admin user with email `admin@campus.edu` already exists
2. If admin exists, skips creation (idempotent)
3. If admin doesn't exist, creates one with:
   - Email: `admin@campus.edu`
   - Password: `Admin@1234`
   - Full Name: `Campus Admin`
   - Role: `admin`

### Security Notes

⚠️ **WARNING**: This script is for **LOCAL DEVELOPMENT and DEMO use only**.

- Do NOT run this in production
- The default credentials are intentionally simple for demo purposes
- In production, create admin users through proper authentication flows
- Change the default password after first login in any environment

### Prerequisites

- Database must be running and accessible
- Environment variables in `.env` must be configured correctly
- Database schema must be initialized (run `database/schema.sql`)

### Troubleshooting

**Error: Connection refused**
- Ensure PostgreSQL is running
- Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env`

**Error: Admin already exists**
- This is normal if you've run the script before
- The script is idempotent and safe to run multiple times

**Error: Table 'users' does not exist**
- Run the database schema: `psql campussync -f ../database/schema.sql`

