# CampusSync API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "studentId": "STU001",
  "email": "student@university.edu",
  "password": "securepassword123",
  "fullName": "John Doe",
  "phone": "9876543210",
  "role": "student"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "studentId": "STU001",
    "email": "student@university.edu",
    "fullName": "John Doe",
    "role": "student"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "securepassword123"
}
```

**Response:** Same as register

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_jwt_token"
}
```

### POST /auth/logout
Logout user.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

---

## Wallet Endpoints

### GET /wallet/balance
Get current wallet balance.

**Response:**
```json
{
  "balance": 5000.00,
  "currency": "INR"
}
```

### GET /wallet/summary
Get wallet summary with statistics.

**Response:**
```json
{
  "wallet": {
    "id": "uuid",
    "balance": 5000.00,
    "currency": "INR"
  },
  "statistics": {
    "totalCredits": 10000.00,
    "totalDebits": 5000.00,
    "totalSpent": 5000.00,
    "totalCredited": 10000.00,
    "todaySpent": 150.00,
    "todayDebits": 3
  }
}
```

### GET /wallet/transactions
Get transaction history.

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "walletId": "uuid",
      "transactionType": "debit",
      "amount": 50.00,
      "balanceBefore": 5000.00,
      "balanceAfter": 4950.00,
      "referenceType": "meal_purchase",
      "referenceId": "uuid",
      "description": "Meal purchase: Breakfast at Mess 1",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

### POST /wallet/topup
Top up wallet.

**Request Body:**
```json
{
  "amount": 1000.00,
  "paymentMethod": "online",
  "paymentReference": "TXN123456"
}
```

**Response:**
```json
{
  "message": "Wallet topped up successfully",
  "transaction": { ... },
  "topupId": "uuid"
}
```

### POST /wallet/mess-fee
Pay mess fee (initial wallet funding).

**Request Body:**
```json
{
  "amount": 10000.00,
  "academicYear": "2024-2025",
  "semester": "Fall"
}
```

**Response:**
```json
{
  "message": "Mess fee paid successfully",
  "transaction": { ... },
  "messFeeId": "uuid"
}
```

---

## QR Code Endpoints

### GET /qr/student
Generate student QR code (for student to show at counter).

**Response:**
```json
{
  "qrCode": "signed_qr_payload",
  "qrDataUrl": "data:image/png;base64,...",
  "expiresIn": 300
}
```

### GET /qr/counter/:vendorId
Generate counter QR code (for vendor counter, student scans this).

**Response:** Same as student QR

### POST /qr/validate
Validate QR code (internal use).

**Request Body:**
```json
{
  "qrCode": "signed_qr_payload",
  "expectedType": "student"
}
```

**Response:**
```json
{
  "valid": true,
  "payload": {
    "userId": "uuid",
    "qrType": "student",
    "timestamp": 1234567890,
    "nonce": "uuid"
  }
}
```

---

## Meal Endpoints

### POST /meals/process
Process meal transaction (vendor scans student QR).

**Request Body:**
```json
{
  "studentQR": "signed_qr_payload",
  "vendorId": "uuid",
  "menuItemId": "uuid",
  "amount": 50.00
}
```

**Response:**
```json
{
  "message": "Meal transaction processed successfully",
  "transaction": {
    "id": "uuid",
    "studentId": "uuid",
    "vendorId": "uuid",
    "menuItemId": "uuid",
    "amount": 50.00,
    "mealType": "breakfast",
    "itemName": "Breakfast Combo",
    "transactionStatus": "completed",
    "paymentStatus": "paid",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /meals/process-scan
Process meal transaction (student scans counter QR).

**Request Body:**
```json
{
  "counterQR": "signed_qr_payload",
  "vendorId": "uuid",
  "menuItemId": "uuid",
  "amount": 50.00
}
```

**Response:** Same as /meals/process

### GET /meals/history
Get student meal history.

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "vendorId": "uuid",
      "menuItemId": "uuid",
      "amount": 50.00,
      "mealType": "breakfast",
      "itemName": "Breakfast Combo",
      "transactionStatus": "completed",
      "paymentStatus": "paid",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

## Vendor Endpoints

### GET /vendors/me
Get current vendor's information.

**Response:**
```json
{
  "id": "uuid",
  "vendorCode": "MESS001",
  "name": "Hostel Mess 1",
  "vendorType": "mess",
  "location": "Block A",
  "contactPhone": "9876543210",
  "contactEmail": "mess1@university.edu",
  "isActive": true
}
```

### GET /vendors/:vendorId
Get vendor by ID.

**Response:** Same as /vendors/me

### GET /vendors/:vendorId/performance
Get vendor performance metrics.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response:**
```json
{
  "summary": {
    "totalTransactions": 1500,
    "totalRevenue": 75000.00,
    "uniqueCustomers": 200,
    "activeDays": 30
  },
  "dailyStats": [
    {
      "date": "2024-01-15",
      "totalTransactions": 50,
      "totalRevenue": 2500.00,
      "uniqueCustomers": 45,
      "averageTransactionValue": 50.00
    }
  ]
}
```

### GET /vendors/:vendorId/menu
Get vendor menu items.

**Query Parameters:**
- `available` (optional): Filter by availability (true/false)

**Response:**
```json
{
  "menuItems": [
    {
      "id": "uuid",
      "vendorId": "uuid",
      "itemCode": "BF001",
      "name": "Breakfast Combo",
      "description": "Idli, Dosa, Sambar",
      "price": 50.00,
      "category": "breakfast",
      "mealType": "breakfast",
      "isAvailable": true
    }
  ]
}
```

### GET /vendors/:vendorId/settlements
Get vendor settlements.

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "settlements": [
    {
      "id": "uuid",
      "vendorId": "uuid",
      "settlementPeriodStart": "2024-01-01",
      "settlementPeriodEnd": "2024-01-31",
      "totalTransactions": 1500,
      "totalAmount": 75000.00,
      "commissionRate": 5.00,
      "commissionAmount": 3750.00,
      "settlementAmount": 71250.00,
      "status": "paid",
      "paidAt": "2024-02-01T10:00:00Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

## Admin Endpoints

### GET /admin/analytics/overview
Get system overview analytics.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response:**
```json
{
  "overview": {
    "totalStudents": 10000,
    "totalVendors": 80,
    "totalWalletBalance": 5000000.00,
    "totalRevenue": 2500000.00
  },
  "mealStatistics": [
    {
      "date": "2024-01-15",
      "mealType": "breakfast",
      "totalMeals": 5000,
      "uniqueStudents": 4500,
      "uniqueVendors": 40,
      "totalRevenue": 250000.00
    }
  ]
}
```

### GET /admin/analytics/consumption
Get meal consumption trends.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `mealType` (optional): Filter by meal type

**Response:**
```json
{
  "consumptionTrends": [
    {
      "date": "2024-01-15",
      "mealType": "breakfast",
      "totalMeals": 5000,
      "uniqueStudents": 4500,
      "uniqueVendors": 40,
      "totalRevenue": 250000.00
    }
  ]
}
```

### POST /admin/settlements/create
Create vendor settlement.

**Request Body:**
```json
{
  "vendorId": "uuid",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "commissionRate": 5.00
}
```

**Response:**
```json
{
  "message": "Settlement created successfully",
  "settlement": { ... }
}
```

### POST /admin/settlements/:settlementId/mark-paid
Mark settlement as paid.

**Request Body:**
```json
{
  "paymentReference": "BANK_TXN_123456"
}
```

**Response:**
```json
{
  "message": "Settlement marked as paid"
}
```

### GET /admin/audit-logs
Get audit logs.

**Query Parameters:**
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `entityType` (optional): Filter by entity type
- `entityId` (optional): Filter by entity ID

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "entityType": "wallet",
      "entityId": "uuid",
      "action": "update",
      "userId": "uuid",
      "oldValues": { ... },
      "newValues": { ... },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error



