# ✨ Gen-Z Skincare Mobile Application Backend

A modular, production-ready Node.js & TypeScript REST API backend engineered for a modern Gen-Z skincare mobile application. Built with high performance, strict validation, secure authentication, Cloudinary media processing, and an extensible architecture designed for frictionless future AI integration (skin scanning, routine recommendations, AI chatbot).

---

## 🌟 Table of Contents
- [Tech Stack](#-tech-stack)
- [Architecture & Folder Structure](#-architecture--folder-structure)
- [Getting Started & Installation](#-getting-started--installation)
- [Environment Variables Setup](#-environment-variables-setup)
- [Database & Cloudinary Setup](#-database--cloudinary-setup)
- [Running the Project](#-running-the-project)
- [Automated Testing](#-automated-testing)
- [API Documentation & Endpoints](#-api-documentation--endpoints)
  - [Authentication Flow](#1-authentication)
  - [User Profile](#2-user-profile)
  - [Skin Profile](#3-skin-profile)
  - [Skin Progress Photos](#4-skin-progress-photos)
  - [Routines & Step Completion Tracking](#5-skincare-routines--streak-tracking)
  - [Product Catalog & Search](#6-product-catalog)
  - [Notifications](#7-notifications)
  - [Mobile Dashboard](#8-aggregated-mobile-dashboard)
- [Future AI Integration Architecture](#-future-ai-integration-architecture)
- [Security & Best Practices](#-security--best-practices)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v20+) |
| **Language** | TypeScript (ES2022) |
| **Framework** | Express.js 5 |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | JWT (Dual token: Access + Refresh) & BcryptJS |
| **Media Storage** | Multer (Memory Storage) & Cloudinary v2 |
| **Validation** | Express-Validator (Server-side defense) |
| **Security** | Helmet, CORS, Express-Rate-Limit (Brute-force protection) |
| **Development** | `tsx` (zero-overhead hot reload) & `typescript` compiler |

---

## 📁 Architecture & Folder Structure

The project employs a **Modular Monolith** using **Controller-Service-Model** layers. Business logic lives cleanly in services, ensuring future AI microservices or scripts can invoke the same methods without HTTP overhead.

```
AISkinCareBackend/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection & disconnect handlers
│   │   ├── cloudinary.ts       # Cloudinary stream uploader with test/dev fallback
│   │   └── environment.ts      # Strongly-typed environment variables
│   │
│   ├── controllers/            # Thin HTTP controllers & express-validator rules
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── skinProfile.controller.ts
│   │   ├── skinProgress.controller.ts
│   │   ├── routine.controller.ts
│   │   ├── product.controller.ts
│   │   ├── notification.controller.ts
│   │   └── dashboard.controller.ts
│   │
│   ├── models/                 # Strongly typed Mongoose models with indexes
│   │   ├── User.ts             # User credentials, avatar, refreshToken
│   │   ├── SkinProfile.ts      # Skin type, concerns, lifestyle
│   │   ├── SkinProgress.ts     # Front, left, right photos & notes
│   │   ├── Routine.ts          # Morning/night/custom routines & steps
│   │   ├── RoutineCompletion.ts# Historical date-based completion records
│   │   ├── Product.ts          # Skincare catalog with categories & concerns
│   │   └── Notification.ts     # Push/in-app notifications
│   │
│   ├── routes/                 # Versioned Express routes (/api/v1/*)
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── skinProfile.routes.ts
│   │   ├── skinProgress.routes.ts
│   │   ├── routine.routes.ts
│   │   ├── product.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── index.ts            # Route aggregator
│   │
│   ├── middleware/             # Interceptors & security gates
│   │   ├── auth.ts             # JWT Bearer verification & user hydration
│   │   ├── validation.ts       # Request validation formatter
│   │   ├── upload.ts           # Multer memory storage (5MB, JPEG/PNG/WEBP)
│   │   └── errorHandler.ts     # Centralized error handler
│   │
│   ├── services/               # Pure business logic layer
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── skinProfile.service.ts
│   │   ├── skinProgress.service.ts
│   │   ├── routine.service.ts
│   │   ├── product.service.ts
│   │   ├── notification.service.ts
│   │   └── dashboard.service.ts
│   │
│   ├── seeds/
│   │   └── productSeed.ts      # 10+ real Gen-Z skincare products seed script
│   │
│   ├── utils/
│   │   ├── apiResponse.ts      # Standardized JSON response envelope
│   │   ├── apiError.ts         # Operational error classes
│   │   ├── asyncHandler.ts     # Promise error boundary wrapper
│   │   ├── jwt.ts              # Token signers & verifiers
│   │   └── logger.ts           # Formatted logger
│   │
│   ├── app.ts                  # Express application setup & middleware stack
│   └── server.ts               # Server startup & graceful shutdown
│
├── tests/
│   └── api.test.ts             # 11 end-to-end integration test suites
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or higher
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Cloudinary](https://cloudinary.com/) account (optional for local mock mode)

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd AISkinCareBackend
npm install
```

---

## ⚙️ Environment Variables Setup

Copy the template configuration file:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/aiskincare

# JWT Secrets
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

> **Note:** If Cloudinary credentials are not configured in local development, the backend automatically uses a safe mock upload mode so image endpoints remain fully functional without external network dependencies.

---

## 🍃 Database & Cloudinary Setup

### MongoDB Indexing Strategy
The database uses specialized indexes for query performance:
- `User`: Unique index on `email`
- `SkinProfile`: Unique index on `userId` (enforces 1 active profile per user)
- `SkinProgress`: Compound index on `{ userId: 1, createdAt: -1 }` (fast photo timeline)
- `Routine`: Compound index on `{ userId: 1, type: 1 }`
- `RoutineCompletion`: Unique compound index on `{ userId: 1, routineId: 1, stepId: 1, date: 1 }` (idempotent daily step tracking)
- `Product`: Text index on `{ name: "text", brand: "text", description: "text" }` and compound indexes on `{ category: 1, price: 1 }` & `{ skinTypes: 1, concerns: 1 }`
- `Notification`: Compound index on `{ userId: 1, isRead: 1, createdAt: -1 }`

### Seeding the Product Catalog
Run the seed script to populate popular Gen-Z skincare products (CeraVe, The Ordinary, Paula's Choice, COSRX, Beauty of Joseon, etc.):
```bash
npm run seed
```

---

## 💻 Running the Project

### Development Mode (with hot reload via `tsx`):
```bash
npm run dev
```

### Production Build & Execution:
```bash
# 1. Compile TypeScript to dist/
npm run build

# 2. Run compiled production build
npm start
```

---

## 🧪 Automated Testing

The repository includes a comprehensive 11-suite integration test verifying:
1. Health check
2. Authentication (Register, Login, Token Refresh, Password Reset)
3. User profile updates & protection
4. Skin profile creation & enum validation
5. Skin progress multipart photo upload & pagination
6. Routine creation, step addition, daily completion toggle & streaks
7. Product catalog search, category filter, and skinType/concern queries
8. Notifications listing, read markers, and bulk read
9. Composite mobile dashboard endpoint
10. Multi-user isolation & cross-account privacy enforcement
11. Centralized error handling (400, 401, 403, 404)

Run tests (uses an embedded `MongoMemoryServer` with real MongoDB queries):
```bash
npm test
```

---

## 📡 API Documentation & Endpoints

Base URL: `http://localhost:5000/api/v1`

All responses follow the unified envelope:
```json
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } // (When applicable)
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Please enter a valid email address" }]
}
```

---

### 1. Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login with email & password | No |
| `POST` | `/auth/refresh` | Refresh access token using refresh token | No |
| `POST` | `/auth/logout` | Revoke user session | **Yes** |
| `POST` | `/auth/forgot-password`| Request password reset token | No |
| `POST` | `/auth/reset-password` | Reset password using reset token | No |

#### Example: Register User
`POST /api/v1/auth/register`
```json
{
  "name": "Kaven Patel",
  "email": "kaven@example.com",
  "password": "Password123!",
  "gender": "male"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6aa3974de29dbfd1337d7776",
      "name": "Kaven Patel",
      "email": "kaven@example.com",
      "gender": "male",
      "isPremium": false,
      "isActive": true,
      "createdAt": "2026-09-11T11:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. User Profile

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/users/profile` | Get logged-in user profile | **Yes** |
| `PUT` | `/users/profile` | Update profile (name, age, gender) | **Yes** |
| `POST` | `/users/avatar` | Upload avatar image (`multipart/form-data`) | **Yes** |

---

### 3. Skin Profile

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/skin-profile` | Get current user's skin profile | **Yes** |
| `POST` | `/skin-profile` | Create skin profile (one per user) | **Yes** |
| `PUT` | `/skin-profile` | Update skin profile & lifestyle | **Yes** |
| `DELETE`| `/skin-profile` | Delete skin profile | **Yes** |

**Supported Skin Types:** `oily`, `dry`, `combination`, `normal`, `sensitive`  
**Supported Concerns:** `acne`, `pimples`, `dark-spots`, `pigmentation`, `redness`, `dryness`, `large-pores`, `blackheads`, `whiteheads`, `dull-skin`, `uneven-skin-tone`, `wrinkles`, `fine-lines`, `dark-circles`, `sun-tan`

#### Example: Create Skin Profile
`POST /api/v1/skin-profile`
```json
{
  "skinType": "combination",
  "concerns": ["acne", "large-pores", "dark-spots"],
  "lifestyle": {
    "waterIntakeLiters": 2.5,
    "sleepHours": 8,
    "sunscreenUsage": "always",
    "smokingStatus": "non-smoker",
    "stressLevel": "low"
  }
}
```

---

### 4. Skin Progress Photos

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/skin-progress` | Upload progress photos (`front` required, `left`, `right` optional) | **Yes** |
| `GET` | `/skin-progress` | Paginated progress history (`?page=1&limit=10`) | **Yes** |
| `GET` | `/skin-progress/:id` | Get progress record by ID | **Yes** |
| `DELETE`| `/skin-progress/:id`| Delete progress record and Cloudinary images | **Yes** |

---

### 5. Skincare Routines & Streak Tracking

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/routines` | Get all user routines | **Yes** |
| `POST` | `/routines` | Create routine (morning/night/custom) | **Yes** |
| `GET` | `/routines/today` | Today's routines with step completion status | **Yes** |
| `GET` | `/routines/stats` | Today's %, daily streak, weekly breakdown | **Yes** |
| `GET` | `/routines/:id` | Get routine details | **Yes** |
| `PUT` | `/routines/:id` | Update routine info | **Yes** |
| `DELETE`| `/routines/:id` | Delete routine | **Yes** |
| `POST` | `/routines/:id/steps` | Add new step to routine | **Yes** |
| `PUT` | `/routines/:id/steps/:stepId` | Update step | **Yes** |
| `DELETE`| `/routines/:id/steps/:stepId` | Delete step | **Yes** |
| `POST` | `/routines/:id/complete` | Toggle completion of a step for a date | **Yes** |

#### Example: Toggle Step Completion
`POST /api/v1/routines/:id/complete`
```json
{
  "stepId": "6aa3974de29dbfd1337d777a",
  "date": "2026-09-11" // Optional, defaults to today
}
```

---

### 6. Product Catalog

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/products` | List & filter products (`?skinType=oily&concern=acne&category=cleanser&page=1&limit=20`) | No |
| `GET` | `/products/search?q=serum`| Full-text search across name, brand, description | No |
| `GET` | `/products/category/:category`| Filter by specific category | No |
| `GET` | `/products/:id` | Get product details | No |
| `POST` | `/products` | Add product to catalog (Admin) | **Yes** |

---

### 7. Notifications

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/notifications` | Get notifications with unread count (`?page=1&limit=20&isRead=false`) | **Yes** |
| `PATCH` | `/notifications/:id/read` | Mark single notification as read | **Yes** |
| `PATCH` | `/notifications/read-all` | Mark all unread notifications as read | **Yes** |
| `DELETE`| `/notifications/:id` | Delete notification | **Yes** |

---

### 8. Aggregated Mobile Dashboard

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/dashboard` | Consolidated data payload for React Native home screen | **Yes** |

#### Example Response: `GET /api/v1/dashboard`
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "user": {
      "_id": "6aa3974de29dbfd1337d7776",
      "name": "Kaven Patel",
      "email": "kaven@example.com",
      "profileImage": "",
      "gender": "male",
      "isPremium": false
    },
    "skinProfile": {
      "_id": "6aa3974de29dbfd1337d7777",
      "skinType": "combination",
      "concerns": ["acne", "pigmentation", "dark-spots"],
      "lifestyle": {
        "waterIntakeLiters": 3,
        "sleepHours": 8,
        "sunscreenUsage": "always",
        "smokingStatus": "non-smoker",
        "stressLevel": "low"
      }
    },
    "todayRoutine": [
      {
        "_id": "6aa3974de29dbfd1337d7779",
        "name": "Morning Glow Routine",
        "type": "morning",
        "totalSteps": 5,
        "completedSteps": 2,
        "completionPercentage": 40,
        "steps": [
          { "title": "Gentle Cleanser", "category": "cleanser", "isCompleted": true },
          { "title": "Vitamin C Serum", "category": "serum", "isCompleted": true },
          { "title": "Hydrating Moisturizer", "category": "moisturizer", "isCompleted": false },
          { "title": "SPF 50+ Sunscreen", "category": "sunscreen", "isCompleted": false },
          { "title": "Eye Cream", "category": "eye-cream", "isCompleted": false }
        ]
      }
    ],
    "routineCompletion": {
      "todayPercentage": 40,
      "completedStepsToday": 2,
      "totalStepsToday": 5,
      "streakDays": 1
    },
    "latestProgress": {
      "_id": "6aa3974de29dbfd1337d7778",
      "images": {
        "front": { "url": "https://res.cloudinary.com/...", "publicId": "..." },
        "left": { "url": "https://res.cloudinary.com/...", "publicId": "..." }
      },
      "notes": "Day 1 starting new niacinamide serum",
      "createdAt": "2026-09-11T11:05:00.000Z"
    },
    "unreadNotifications": {
      "count": 0,
      "recent": []
    }
  }
}
```

---

## 🧠 Future AI Integration Architecture

This backend was purposefully built to allow another developer or team to integrate AI models (e.g., Computer Vision skin condition analysis, acne segmentation, personalized LLM routines, ingredient safety scoring) without refactoring the foundational backend.

```
                    ┌─────────────────────────┐
                    │ React Native Mobile App │
                    └───────────┬─────────────┘
                                │
                        REST API Calls
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      Backend Monolith                        │
 │                                                              │
 │  ┌────────────────────────────────────────────────────────┐  │
 │  │ Controllers & Routes (/api/v1/*)                       │  │
 │  └───────────────────────────┬────────────────────────────┘  │
 │                              │                               │
 │  ┌───────────────────────────▼────────────────────────────┐  │
 │  │ Services Layer (Business Logic)                        │  │
 │  │  • AuthService        • SkinProfileService             │  │
 │  │  • RoutineService     • SkinProgressService            │  │
 │  │  • ProductService     • DashboardService               │  │
 │  └─────────────┬───────────────────────────┬──────────────┘  │
 └────────────────┼───────────────────────────┼─────────────────┘
                  │                           │
                  ▼                           ▼
        ┌───────────────────┐       ┌──────────────────────┐
        │   MongoDB Data    │       │ Cloudinary Media CDN │
        └───────────────────┘       └──────────────────────┘
                  ▲                           ▲
                  │ (Read Profile/History)    │ (Read Photo URLs)
                  │                           │
  ════════════════╪═══════════════════════════╪═══════════════════
                  │                           │
        ┌─────────┴───────────────────────────┴──────────┐
        │       FUTURE AI MODULE / MICROSERVICE          │
        │  • Skin Progress Image Analyzer (CNN/Vision)   │
        │  • Personalized Routine Generator (LLM)        │
        │  • Skincare Chatbot & Ingredient Matcher       │
        └────────────────────────────────────────────────┘
```

The future AI service can directly consume:
1. **User Skin Profile & Lifestyle**: Via `SkinProfileService.getProfileByUserId(userId)`
2. **Progress Photos**: Via `SkinProgressService.getProgressHistory(userId)` (retrieves Cloudinary high-res images)
3. **Current Routines**: Via `RoutineService.getUserRoutines(userId)`
4. **Product Catalog**: Via `ProductService.getProducts(filters)`

---

---

## 🤖 Google Gemini AI Skin Analysis (GlowMaxx Vision AI)

GlowMaxx features an advanced, privacy-conscious **AI Skin Analysis system** powered by the official **Google Gemini API** (`@google/genai`). It converts facial selfies into structured, non-medical skin observations and computes a deterministic Glow Score.

### 🌟 Key AI Capabilities
1. **Facial Image Validation & Quality Gate**: Assesses lighting, focus/blur, angle, obstructions (masks/sunglasses/hair), and filters before running deep analysis. Unusable photos receive controlled rejection responses without hallucinating results.
2. **Controlled Visual Metrics**: Visual-only estimation of skin type (`oily`, `dry`, `combination`, `normal`, `sensitive`, `uncertain`), controlled skin concerns (`acne`, `pimples`, `dark_spots`, `pigmentation`, `redness`, `dryness`, `large_pores`, `blackheads`, `whiteheads`, `dull_skin`, `uneven_skin_tone`, `wrinkles`, `fine_lines`, `dark_circles`, `sun_tan`), and normalized intensity scores (0–100 or null).
3. **Deterministic Backend Glow Score**: Gemini **never** calculates the final user score. Our backend `SkinScoreService` calculates the final Glow Score and Potential Score using a transparent, deterministic mathematical formula.
4. **Cost & Duplicate Protection**: Calculates SHA-256 hash of submitted images. Duplicate submissions return cached analyses to avoid unnecessary Gemini API expenses.
5. **AI Rate Limiting**: User-keyed rate limiting protects against API quota exhaustion and abuse.
6. **Safety & Non-Medical Boundary**: Strictly cosmetic wellness assessment. Never claims to diagnose diseases (acne disease, rosacea, melasma, eczema, skin cancer).

---

### ⚙️ Environment Variables Setup

Configure the following variables in your `.env` file:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=30000
GEMINI_MAX_RETRIES=2

# AI Optimization & Protection
AI_RATE_LIMIT_WINDOW_MS=900000
AI_RATE_LIMIT_MAX=10
AI_ANALYSIS_VERSION=1.0
AI_PROMPT_VERSION=1.0
AI_CACHE_DUPLICATES=true
```

> [!NOTE]
> **How to Change the Gemini Model**: Update `GEMINI_MODEL` in `.env` (e.g. `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-2.0-flash`). No application code changes are needed!
>
> **How to Update the Prompt Version**: The prompt is version-controlled in `src/modules/ai/skin-analysis/ai.prompt.ts` (`PROMPT_VERSION = "1.0"`). When modifying the prompt guidelines, update `PROMPT_VERSION` and `AI_PROMPT_VERSION` so historical analyses preserve their exact lineage.

---

### 📐 Deterministic Glow Score Formula

The Glow Score (0–100) is calculated in `src/modules/skinScore/skinScore.service.ts`:

$$\text{Glow Score} = \text{clamp}_{20}^{98}\left(100 - (\text{Observation Deductions} + \text{Effective Concern Deductions})\right)$$

1. **Observation Deductions** (Max ~41 pts):
   - Redness: $(\text{redness} / 100) \times 8.0$
   - Dryness: $(\text{dryness} / 100) \times 6.0$
   - Visible Pores: $(\text{visiblePores} / 100) \times 6.0$
   - Texture: $(\text{texture} / 100) \times 6.0$
   - Uneven Tone: $(\text{unevenTone} / 100) \times 6.0$
   - Dark Circles: $(\text{darkCircles} / 100) \times 4.0$
   - Sebum Balance: Excess oiliness above 55 or deficit below 20 incurs up to $5.0$ pts.
   - Any unobservable metric (`null`) receives $0$ penalty.
2. **Concern Deductions with Diminishing Returns** (Max ~38 pts):
   - Raw deduction = $\sum (\text{SeverityFactor} \times \text{ConcernWeight} \times \text{Confidence})$
   - Effective deduction = $40 \times (1 - e^{-\text{RawDeduction} / 25})$
3. **Score Range**: Clamped strictly between **20** (floor) and **98** (ceiling).
4. **Potential Score**: Realistic achievable score through targeted daily routine, calculated from addressable factors like surface dehydration and sebum balancing.

---

### 📡 AI Skin Analysis API Endpoints

All endpoints require JWT Bearer authentication (`Authorization: Bearer <accessToken>`).

#### 1. Analyze Facial Photos
- **Endpoint**: `POST /api/v1/ai/skin-analysis`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `front`: Facial photo file (**required**; JPEG, JPG, PNG, WEBP, max 5MB)
  - `left`: Left angle photo file (*optional*)
  - `right`: Right angle photo file (*optional*)

**Example cURL Request**:
```bash
curl -X POST http://localhost:5000/api/v1/ai/skin-analysis \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "front=@/path/to/selfie_front.jpg" \
  -F "left=@/path/to/selfie_left.jpg"
```

**Example Successful Response (201 Created)**:
```json
{
  "success": true,
  "message": "Skin analysis completed successfully",
  "data": {
    "_id": "6aa3b0198ed09f0151447dd0",
    "userId": "6aa3b0198ed09f0151447dce",
    "images": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/v1/aiskincare/ai-analysis/analysis_front.webp",
        "publicId": "aiskincare/ai-analysis/analysis_front",
        "angle": "front"
      }
    ],
    "status": "completed",
    "analysisVersion": "1.0",
    "promptVersion": "1.0",
    "model": "gemini-2.5-flash",
    "skinType": {
      "value": "combination",
      "confidence": 0.84
    },
    "concerns": [
      {
        "type": "acne",
        "severity": "mild",
        "confidence": 0.81
      },
      {
        "type": "redness",
        "severity": "mild",
        "confidence": 0.72
      }
    ],
    "observations": {
      "oiliness": 58,
      "dryness": 25,
      "redness": 30,
      "visiblePores": 40,
      "unevenTone": 35,
      "texture": 30,
      "darkCircles": 25
    },
    "glowScore": 83,
    "potentialScore": 91,
    "aiSummary": "Visible signs of combination skin with mild active breakouts on the T-zone.",
    "processingTime": 1420,
    "createdAt": "2026-09-11T13:00:00.000Z"
  }
}
```

**Example Rejection Response (422 Unprocessable Entity)**:
```json
{
  "success": false,
  "code": "IMAGE_QUALITY_INSUFFICIENT",
  "message": "Please upload a clear, well-lit facial photo.",
  "data": {
    "_id": "6aa3b0198ed09f0151447dd1",
    "status": "rejected",
    "rejectionReason": "IMAGE_QUALITY_INSUFFICIENT",
    "rejectionMessage": "Please upload a clear, well-lit facial photo."
  }
}
```

---

#### 2. Get Analysis by ID
- **Endpoint**: `GET /api/v1/ai/skin-analysis/:id`
- **Access**: Private (Owner only; returns `403 UNAUTHORIZED_ANALYSIS_ACCESS` if attempted by another user).

---

#### 3. Get Analysis History
- **Endpoint**: `GET /api/v1/ai/skin-analysis?page=1&limit=10`
- **Access**: Private (Current user's history, sorted newest first).

---

### 🚨 Error Codes Reference

| Error Code | HTTP Status | Description |
|---|---|---|
| `IMAGE_INVALID` | 400 | Missing required front photo or invalid MIME type/size |
| `IMAGE_QUALITY_INSUFFICIENT` | 422 | Photo is blurry, too dark/bright, obstructed by masks/sunglasses |
| `AI_PROVIDER_ERROR` | 502 | Upstream Gemini API temporary failure after all retries |
| `AI_TIMEOUT` | 504 | Gemini API call exceeded `GEMINI_TIMEOUT_MS` threshold |
| `AI_RATE_LIMITED` | 429 | User exceeded allowed analyses in `AI_RATE_LIMIT_WINDOW_MS` |
| `AI_RESPONSE_INVALID` | 502 | Gemini output failed server-side schema or business validation |
| `ANALYSIS_NOT_FOUND` | 404 | No skin analysis document matches the provided MongoDB ID |
| `UNAUTHORIZED_ANALYSIS_ACCESS` | 403 | User attempted to view another user's skin analysis |

---

## 🛡️ Security & Best Practices

- **Zero Plaintext Passwords**: Automatic 10-round Bcrypt salting on pre-save.
- **Hidden Credentials**: Password hash and refresh tokens have `select: false` on Mongoose schema and are deleted during `toJSON` transforms.
- **Gemini Key Confidentiality**: The `GEMINI_API_KEY` exists exclusively in the backend `.env`. It is never returned in API payloads, never sent to React Native, and never logged.
- **No PII/Image Data Leakage in Logs**: Error logs record request ID, user ID, latency, and status code, but never raw photo buffers or API keys.
- **Brute Force Defense**: `express-rate-limit` throttles auth endpoints to 30 requests / 15 minutes, and AI skin analysis endpoints to 10 requests / 15 minutes.
- **HTTP Hardening**: `helmet` sets secure HTTP response headers (HSTS, X-Content-Type-Options, DNS prefetch control, etc.).
- **Data Isolation**: All user-specific operations verify document ownership (`userId === req.user._id`), returning 403 Forbidden for unauthorized access.
- **Safe Error Handling**: Internal server errors do not expose stack traces in production mode.
- **Git Security**: `.env` and `dist/` are strictly ignored via `.gitignore`.
