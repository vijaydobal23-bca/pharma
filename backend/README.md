# Backend Authentication API

Full-featured authentication service built with **Express.js**, **MongoDB (Mongoose)**, **JSON Web Tokens (JWT)**, and **bcryptjs**.

---

## Features

- **Access Token & Refresh Token Pattern**:
  - Short-lived Access Token (`15m` by default) sent in response body.
  - Long-lived Refresh Token (`7d` by default) stored securely in `httpOnly` cookie and persisted in MongoDB.
  - Refresh Token Rotation upon token refresh for enhanced security.
- **Explicit Password Hashing in Controllers**:
  - Salting and hashing performed using `bcryptjs` directly inside controller functions.
- **Protected Routes**:
  - Custom `authenticateToken` middleware verifying JWT bearer tokens and attaching `req.user`.
- **Utils Module**:
  - Token generator and verification helpers in `src/utils/token.utils.js`.

---

## Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   └── auth.controller.js    # Register, Login, Refresh, Logout, Profile
│   ├── middlewares/
│   │   └── auth.middleware.js    # JWT verification middleware
│   ├── models/
│   │   └── user.model.js         # Mongoose User schema
│   ├── routes/
│   │   └── auth.routes.js        # Auth endpoint router
│   ├── utils/
│   │   └── token.utils.js        # JWT generation & cookie helpers
│   └── app.js                    # Express app configuration & middleware
├── .env                          # Environment variables
├── .env.example                  # Environment configuration template
├── package.json
└── server.js                     # Server entrypoint
```

---

## Environment Variables (`.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/pharma_db

ACCESS_TOKEN_SECRET=pharma_access_token_super_secret_jwt_key_2026_secure
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=pharma_refresh_token_super_secret_jwt_key_2026_secure
REFRESH_TOKEN_EXPIRY=7d
```

---

## API Endpoints

### 1. Register User
- **Method / URL**: `POST /api/auth/register`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secretPassword123"
  }
  ```
- **Response**: `201 Created`
  - Returns user details & `accessToken`. Sets `refreshToken` in `httpOnly` cookie.

### 2. Login User
- **Method / URL**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "secretPassword123"
  }
  ```
- **Response**: `200 OK`
  - Verifies bcrypt hash, returns `accessToken`, and sets `refreshToken` in cookie.

### 3. Refresh Access Token
- **Method / URL**: `POST /api/auth/refresh-token`
- **Headers / Cookie**: Automatically sends `refreshToken` cookie, or optional JSON `{ "refreshToken": "<token>" }`.
- **Response**: `200 OK`
  - Rotates refresh token in DB & cookie, returns new `accessToken`.

### 4. Logout User (Protected)
- **Method / URL**: `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`
  - Clears refresh token in MongoDB and clears cookie.

### 5. Get User Profile (Protected)
- **Method / URL**: `GET /api/auth/profile`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`
  - Returns authenticated user object without password.

---

## Running the Application

1. Make sure MongoDB is running locally or specify your remote URI in `.env`.
2. Start development server with auto-reload:
   ```bash
   npm run dev
   ```
3. Or start standard production server:
   ```bash
   npm start
   ```

