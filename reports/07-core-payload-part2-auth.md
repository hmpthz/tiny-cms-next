# Payload Auth System Analysis

**Location:** `payload-main/packages/payload/src/auth/`

**Report Purpose**: Understand Payload's authentication system architecture to guide migration to better-auth.

---

## 1. Auth Directory Structure

```
auth/
├── baseFields/         (Auth-related database fields: email, username, apiKey, sessions, verification, accountLock)
├── operations/         (Core auth operations: login, logout, forgotPassword, resetPassword, verifyEmail, refresh, registerFirstUser, me, auth, access)
├── strategies/         (Authentication strategies: jwt, apiKey, local password verification)
├── endpoints/          (HTTP route handlers: login, logout, forgotPassword, resetPassword, verifyEmail, refresh, registerFirstUser, me, unlock)
├── jwt.ts              (JWT signing with jose library, HS256)
├── sessions.ts         (Session management utilities)
├── cookies.ts          (Cookie generation and parsing)
├── executeAuthStrategies.ts  (Strategy execution loop)
├── executeAccess.ts    (Access control checks)
├── getAuthFields.ts    (Dynamic field injection)
├── getFieldsToSign.ts  (JWT payload builder)
├── extractJWT.ts       (Extract JWT from cookies/headers)
├── types.ts            (Auth type definitions)
└── crypto.ts           (Encryption utilities)
```

---

## 2. Key Auth Operations

### 2.1 Login (`operations/login.ts`)

**Flow**:
1. **Validation**: Sanitize email/username, validate password presence
2. **User Lookup**: Query database with email OR username (based on config)
3. **Lock Check**: Verify user isn't locked from failed attempts
4. **Password Verify**: Use pbkdf2 (25000 iterations, SHA256) to compare hash
5. **Login Attempts**: Increment on failure, reset on success
6. **Email Verification**: Check `_verified` field if verification enabled
7. **Session Creation**: Generate session ID (uuid v4), store in user.sessions array
8. **JWT Generation**: Sign JWT with user fields + session ID (HS256)
9. **Hooks**: Run beforeLogin/afterLogin collection hooks
10. **Field Processing**: Run afterRead hooks for field transformations
11. **Cookie Setting**: Generate httpOnly cookie with JWT

**Critical Details**:
- Supports email-only, username-only, or both (configurable)
- Max login attempts with account locking (lockUntil timestamp)
- JWT expires in 2 hours default (`tokenExpiration: 7200`)
- Sessions stored as array in user document
- Strategy marked as `local-jwt` on user object

### 2.2 Logout (`operations/logout.ts`)

**Flow**:
1. **User Check**: Verify req.user exists and collection matches
2. **Session Removal**: Filter out current session ID from user.sessions array
3. **All Sessions**: Optional flag to clear all sessions
4. **Database Update**: Update user document with filtered sessions
5. **Hook**: Run afterLogout hook
6. **Cookie Clear**: Endpoint sets expired cookie

**Critical Details**:
- Only removes session if `useSessions: true`
- Uses session ID (`req.user._sid`) from JWT payload
- Updates `updatedAt` timestamp on user document

### 2.3 Register (`strategies/local/register.ts` + `operations/registerFirstUser.ts`)

**Flow**:
1. **First User Check**: Query if any user exists (registerFirstUser only)
2. **Validation**: Ensure email or username provided based on config
3. **Password Hash**: Generate salt (32 random bytes), hash with pbkdf2
4. **User Creation**: Call payload.create with auth fields
5. **Verification**: Generate `_verificationToken` if verify enabled
6. **Auto-verify**: First user auto-verified
7. **Email Send**: Send verification email with token
8. **Auto Login**: Call login operation to return JWT

**Critical Details**:
- Uses crypto.pbkdf2 with 25000 iterations, 512 byte key length
- Salt stored as hex string in user.salt field
- Password validation enforces minimum length

### 2.4 Forgot Password (`operations/forgotPassword.ts`)

**Flow**:
1. **User Lookup**: Find by email or username
2. **Silent Failure**: Return null if user not found (security)
3. **Token Generation**: 20 random bytes as hex string
4. **Token Storage**: Update user with resetPasswordToken + resetPasswordExpiration
5. **Expiration**: Default 1 hour (3600000 ms)
6. **Email Send**: Send reset URL with token in query param
7. **Custom HTML**: Support generateEmailHTML hook

**Critical Details**:
- Token stored in plaintext in database
- Default expiration: 1 hour
- Excludes trashed users from lookup
- Email send optional via `disableEmail` flag

### 2.5 Verify Email (`operations/verifyEmail.ts`)

**Flow**:
1. **Token Lookup**: Find user by `_verificationToken`
2. **Update User**: Set `_verified: true`, clear `_verificationToken`
3. **Error**: Throw forbidden if token invalid

**Critical Details**:
- Simple boolean flag toggle
- No expiration on verification tokens
- Verification can be manually set in admin panel

### 2.6 Refresh (`operations/refresh.ts`)

**Flow**:
1. **User Check**: Verify req.user exists (already authenticated)
2. **Session Check**: Find session in user.sessions by session ID
3. **Session Update**: Extend session expiration by tokenExpiration
4. **Remove Expired**: Clean up expired sessions
5. **User Fetch**: Re-fetch user with current depth
6. **New JWT**: Sign new JWT with updated expiration
7. **Hook**: Run afterRefresh hook

**Critical Details**:
- Requires valid JWT to refresh
- Extends both JWT and session expiration
- Can be overridden by refresh hook

---

## 3. JWT vs Session Approach

### 3.1 JWT Implementation

**Library**: `jose` (modern, secure JWT library)

**Signing** (`jwt.ts`):
```typescript
const token = await new SignJWT(fieldsToSign)
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuedAt(issuedAt)
  .setExpirationTime(exp)
  .sign(secretKey)
```

**JWT Payload** (`getFieldsToSign.ts`):
- `id`: User ID
- `email`: User email
- `collection`: Collection slug
- `_strategy`: Auth strategy used (e.g., "local-jwt", "api-key")
- `sid`: Session ID (if useSessions enabled)
- Additional user fields based on config

**Token Storage**:
- **Cookie**: `${cookiePrefix}-token` (httpOnly, secure based on config)
- **Header**: Returned in login/refresh response body
- **Expiration**: 2 hours default (7200 seconds)

### 3.2 Session Implementation

**Session Storage** (`sessions.ts`):
```typescript
type UserSession = {
  id: string;           // UUID v4
  createdAt: Date;
  expiresAt: Date;      // createdAt + tokenExpiration
}
```

**Session Array**:
- Stored in `user.sessions` field (array of session objects)
- Each login creates new session
- Expired sessions cleaned on login/refresh
- Logout removes specific session by ID

**Session Flow**:
1. Login generates session ID (uuid)
2. Session added to user.sessions array
3. Session ID included in JWT payload (`sid`)
4. Refresh verifies session exists and extends expiration
5. Logout removes session from array

**Why Both JWT + Sessions?**:
- **JWT**: Stateless authentication, fast verification
- **Sessions**: Remote revocation capability (delete session = invalidate JWT)
- **Trade-off**: Database query on each request if session validation needed

### 3.3 Configuration

```typescript
interface IncomingAuthType {
  useSessions?: boolean;              // Default: true
  tokenExpiration?: number;           // Default: 7200 (2 hours)
  removeTokenFromResponses?: true;    // Hide token in API responses
}
```

**Session Enabled** (default):
- JWT contains session ID
- Refresh checks session validity
- Logout removes session
- Database query on refresh

**Session Disabled**:
- JWT is only auth mechanism
- No remote revocation
- Faster (no DB query)
- Logout just clears cookie

---

## 4. Password Hashing

### 4.1 Algorithm

**Method**: PBKDF2-HMAC-SHA256

**Implementation** (`strategies/local/generatePasswordSaltHash.ts`):
```typescript
// Salt generation
const saltBuffer = await crypto.randomBytes(32)
const salt = saltBuffer.toString('hex')  // 64 char hex string

// Password hashing
const hashRaw = await crypto.pbkdf2(password, salt, 25000, 512, 'sha256')
const hash = hashRaw.toString('hex')      // 1024 char hex string
```

**Parameters**:
- **Iterations**: 25,000 (fixed)
- **Key Length**: 512 bytes
- **Algorithm**: SHA256
- **Salt Length**: 32 bytes (64 hex chars)
- **Hash Storage**: Hex string (1024 chars)

### 4.2 Verification

**Implementation** (`strategies/local/authenticate.ts`):
```typescript
crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (e, hashBuffer) => {
  if (scmp(hashBuffer, Buffer.from(hash, 'hex'))) {
    resolve(doc)  // Password correct
  } else {
    reject(new Error('Invalid password'))
  }
})
```

**Timing-safe Comparison**: Uses `scmp` library to prevent timing attacks

### 4.3 Database Fields

**Required Fields**:
```typescript
{
  salt: string;      // Hex-encoded salt (64 chars)
  hash: string;      // Hex-encoded hash (1024 chars)
}
```

**Field Configuration**:
- Both fields: `type: 'text'`, `hidden: true`
- Never returned in API responses
- Never shown in admin panel

### 4.4 Password Reset

**Reset Flow**:
1. Generate random token (20 bytes hex = 40 chars)
2. Store in `resetPasswordToken` field
3. Set `resetPasswordExpiration` (default 1 hour)
4. Reset operation verifies token not expired
5. Generate new salt + hash
6. Clear token fields

---

## 5. Auth Strategies

### 5.1 Strategy System

**Interface** (`types.ts`):
```typescript
type AuthStrategy = {
  name: string;
  authenticate: AuthStrategyFunction;
}

type AuthStrategyFunction = (args: {
  headers: Request['headers'];
  payload: Payload;
  canSetHeaders?: boolean;
  isGraphQL?: boolean;
  strategyName?: string;
}) => Promise<AuthStrategyResult>;

type AuthStrategyResult = {
  user: TypedUser | null;
  responseHeaders?: Headers;
}
```

**Execution** (`executeAuthStrategies.ts`):
- Loops through all strategies in order
- Returns first successful authentication
- Continues on error (logs but doesn't throw)
- Sets `user._strategy` to strategy name

### 5.2 Local JWT Strategy (`strategies/jwt.ts`)

**Authentication Flow**:
1. Extract JWT from cookie or Authorization header
2. Verify JWT signature using payload.secret
3. Check expiration
4. If sessions enabled: verify session exists in database
5. Extract user ID from JWT
6. Fetch user from database
7. Return user object

**JWT Extraction** (`extractJWT.ts`):
- **Cookie**: `${cookiePrefix}-token`
- **Header**: `Authorization: JWT <token>` or `Bearer <token>`

**Session Validation**:
- If `useSessions: true`: query user.sessions for matching `sid`
- If session not found or expired: authentication fails
- If `useSessions: false`: skip session check

### 5.3 API Key Strategy (`strategies/apiKey.ts`)

**Authentication Flow**:
1. Check Authorization header for: `${collectionSlug} API-Key <key>`
2. Hash API key with HMAC-SHA256 + payload.secret
3. Query users where `apiKeyIndex` matches hash
4. If verify enabled: also check `_verified: true`
5. Return user with `_strategy: 'api-key'`

**API Key Fields**:
```typescript
{
  enableAPIKey: boolean;      // Checkbox to enable
  apiKey: string;             // Encrypted at rest
  apiKeyIndex: string;        // HMAC-SHA256 hash for lookup
}
```

**Security**:
- API keys encrypted at rest (`payload.encrypt()`)
- Index is HMAC hash (one-way)
- Supports both SHA1 (legacy) and SHA256 hashes

### 5.4 Local Strategy (`strategies/local/*`)

**Not a Strategy**: Local auth is implemented as operations (login, register), not as an authentication strategy

**Components**:
- `authenticate.ts`: Password verification
- `generatePasswordSaltHash.ts`: Hash generation
- `register.ts`: User registration with password
- `incrementLoginAttempts.ts`: Failed login tracking
- `resetLoginAttempts.ts`: Clear failed attempts

**Disabled via**:
```typescript
auth: {
  disableLocalStrategy: true | {
    enableFields?: true;       // Keep fields in schema
    optionalPassword?: true;   // Password not required
  }
}
```

### 5.5 Custom Strategies

**Configuration**:
```typescript
auth: {
  strategies: [
    {
      name: 'oauth-google',
      authenticate: async ({ headers, payload }) => {
        // Custom OAuth logic
        return { user: googleUser };
      }
    }
  ]
}
```

**Use Cases**:
- OAuth providers (Google, GitHub, etc.)
- SAML/SSO integration
- Custom token validation
- Multi-factor authentication

---

## 6. Collection Integration

### 6.1 Auth Configuration

**Collection Config**:
```typescript
{
  slug: 'users',
  auth: {
    depth: 0,                          // User population depth in JWT
    tokenExpiration: 7200,             // 2 hours
    verify: true | {                   // Email verification
      generateEmailHTML: () => {},
      generateEmailSubject: () => {}
    },
    forgotPassword: {
      expiration: 3600000,             // 1 hour
      generateEmailHTML: () => {},
      generateEmailSubject: () => {}
    },
    maxLoginAttempts: 5,               // Account locking
    lockTime: 300000,                  // 5 minutes
    useAPIKey: true,                   // Enable API keys
    useSessions: true,                 // Enable sessions
    loginWithUsername: true | {        // Username login
      allowEmailLogin: true,
      requireEmail: false,
      requireUsername: true
    },
    cookies: {
      secure: true,
      sameSite: 'Lax',
      domain: 'example.com'
    },
    strategies: [],                    // Custom strategies
    disableLocalStrategy: false,       // Disable password auth
    removeTokenFromResponses: false    // Hide tokens
  }
}
```

### 6.2 Field Injection

**Auto-injected Fields** (`getAuthFields.ts`):

**Always Added** (if not disabled):
- `email` (unique, required by default)
- `username` (optional, based on loginWithUsername)
- `salt` (hidden)
- `hash` (hidden)
- `resetPasswordToken` (hidden)
- `resetPasswordExpiration` (hidden)

**Conditional Fields**:
- If `verify: true`: `_verified`, `_verificationToken`
- If `maxLoginAttempts > 0`: `loginAttempts`, `lockUntil`
- If `useAPIKey: true`: `enableAPIKey`, `apiKey`, `apiKeyIndex`
- If `useSessions: true`: `sessions` (array)

**Field Hooks**:
- `apiKey`: beforeChange encrypts, afterRead decrypts
- `apiKeyIndex`: beforeValidate generates HMAC hash
- `_verificationToken`: beforeChange auto-clears when verified

### 6.3 Endpoints

**Auto-registered Routes**:
```
POST   /api/{collection}/login
POST   /api/{collection}/logout
POST   /api/{collection}/refresh
POST   /api/{collection}/forgot-password
POST   /api/{collection}/reset-password
POST   /api/{collection}/verify/{token}
POST   /api/{collection}/unlock
POST   /api/{collection}/first-register
GET    /api/{collection}/me
```

**Endpoint Registration**: Happens during collection sanitization

### 6.4 Hooks

**Auth-specific Hooks**:
```typescript
{
  hooks: {
    beforeLogin: async ({ user, req }) => user,
    afterLogin: async ({ user, token, req }) => user,
    afterLogout: async ({ req }) => {},
    afterForgotPassword: async ({ args }) => {},
    afterRefresh: async ({ token, exp, req }) => {}
  }
}
```

**Standard Hooks** (still apply):
- `beforeOperation`: Can modify login/refresh operations
- `afterOperation`: Can modify responses
- `beforeValidate`: Runs before password hashing
- `afterRead`: Transforms user data in responses

---

## 7. Access Control & Middleware

### 7.1 Request Authentication

**Entry Point** (`createPayloadRequest.ts`):
```typescript
// Called on every request
const { user, responseHeaders } = await executeAuthStrategies({
  headers: req.headers,
  payload,
  canSetHeaders,
  isGraphQL
});

req.user = user;  // Null if no auth
req.responseHeaders = responseHeaders;
```

**Strategy Execution**:
1. Loop through all registered strategies
2. Each strategy checks headers/cookies
3. First successful strategy sets user
4. Failed strategies logged but not thrown
5. Result: `req.user` is populated or null

### 7.2 Access Control System

**Access Function Signature**:
```typescript
type Access = (args: {
  req: PayloadRequest;      // Has user attached
  id?: string | number;     // Document ID (if applicable)
  data?: any;               // Document data
}) => boolean | Where;
```

**Return Values**:
- `true`: Full access
- `false`: No access (throws Forbidden)
- `Where` object: Filtered access (query constraint)

**Access Levels** (Collections):
```typescript
{
  access: {
    create: Access,           // Can create new documents
    read: Access,             // Can read documents
    update: Access,           // Can update documents
    delete: Access,           // Can delete documents
    admin: Access,            // Can access admin panel
    readVersions: Access      // Can read version history
  }
}
```

**Access Levels** (Globals):
```typescript
{
  access: {
    read: Access,
    update: Access,
    readVersions: Access
  }
}
```

**Field-level Access**:
```typescript
{
  fields: [
    {
      name: 'salary',
      type: 'number',
      access: {
        create: Access,      // Can set on create
        read: Access,        // Can read value
        update: Access       // Can modify value
      }
    }
  ]
}
```

### 7.3 Access Execution

**executeAccess** (`executeAccess.ts`):
```typescript
const executeAccess = async (
  { req, id, data, disableErrors },
  access: Access
): Promise<boolean | Where> => {
  if (access) {
    const result = await access({ req, id, data });
    if (!result && !disableErrors) {
      throw new Forbidden(req.t);
    }
    return result;
  }

  // Default behavior
  return req.user ? true : false;
};
```

**Default Access** (`defaultAccess.ts`):
```typescript
// If no access function provided
const defaultAccess = ({ req }) => Boolean(req.user);
```

**Access in Operations**:
1. Operation receives PayloadRequest
2. Check if `overrideAccess: true` flag set
3. If not, call access function with req.user
4. If access returns false, throw Forbidden
5. If access returns Where, add to query constraint

### 7.4 Permission Resolution

**getAccessResults** (`getAccessResults.ts`):
- Runs all access functions for all collections/globals
- Returns permissions object for frontend
- Used in `/me` endpoint to show UI capabilities

**Permission Object**:
```typescript
{
  canAccessAdmin: boolean,
  collections: {
    users: {
      create: true,
      read: { id: { equals: req.user.id } },  // Where constraint
      update: true,
      delete: false,
      fields: {
        email: { read: true, create: true, update: true },
        password: { read: false, create: true, update: true }
      }
    }
  },
  globals: {
    settings: {
      read: true,
      update: false,
      fields: { ... }
    }
  }
}
```

### 7.5 Middleware Integration

**No Traditional Middleware**: Payload doesn't use Express-style middleware

**Auth Flow**:
1. **Request Handler** receives HTTP request
2. **createPayloadRequest** wraps request, runs auth strategies
3. **Operation** receives PayloadRequest with user attached
4. **Access Control** checked within operation
5. **Response** returned with any responseHeaders from strategies

**Authentication Points**:
- **REST**: Each route handler calls createPayloadRequest
- **GraphQL**: Context resolver runs executeAuthStrategies
- **Local API**: Can inject user directly or run auth()

---

## 8. Better-Auth Migration Strategy

### 8.1 What Better-Auth Should Replace

**Direct Replacements**:

1. **Password Operations** (`operations/` + `strategies/local/`):
   - Login operation
   - Register/registerFirstUser
   - Forgot password flow
   - Reset password flow
   - Password hashing (replace pbkdf2 with better-auth's bcrypt)

2. **Session Management** (`sessions.ts`):
   - Session creation/storage
   - Session refresh
   - Session revocation (logout)
   - Expired session cleanup

3. **JWT Management** (`jwt.ts`, `cookies.ts`):
   - JWT signing/verification
   - Cookie generation
   - Token extraction from headers/cookies

4. **Email Verification** (`operations/verifyEmail.ts`):
   - Verification token generation
   - Email sending
   - Token validation

5. **Authentication Middleware** (`executeAuthStrategies.ts`, `operations/auth.ts`):
   - Request authentication
   - User attachment to request
   - Strategy execution loop

**Potential Replacements** (Consider carefully):

6. **API Key Strategy** (`strategies/apiKey.ts`):
   - Better-auth may have built-in API key support
   - Or keep Payload's implementation if better

7. **Account Locking** (`strategies/local/incrementLoginAttempts.ts`):
   - Better-auth likely has rate limiting
   - May need custom implementation for compatibility

**Keep from Payload**:

8. **Access Control System** (`executeAccess.ts`, permission types):
   - Payload's granular access control is core feature
   - Better-auth provides auth, not authorization
   - Keep all access functions and permission resolution

9. **Collection Integration** (`getAuthFields.ts`):
   - Field injection logic
   - Auth configuration on collections
   - Hook system

10. **User Hooks** (beforeLogin, afterLogin, etc.):
    - Payload's hook system is powerful
    - Better-auth should trigger these hooks

### 8.2 Integration Architecture

**Recommended Approach**:

```typescript
// New: better-auth instance
const betterAuth = new BetterAuth({
  database: payload.db,          // Share database
  secret: payload.secret,         // Share secret
  session: {
    expiresIn: 7200,             // Match tokenExpiration
  }
});

// Replace: executeAuthStrategies
const executeAuthStrategies = async ({ headers, payload }) => {
  // Try better-auth first
  const session = await betterAuth.api.getSession({ headers });
  if (session?.user) {
    return {
      user: await fetchPayloadUser(session.user.id),
      responseHeaders: new Headers()
    };
  }

  // Fall back to custom strategies (API keys, etc.)
  return await customStrategyExecution({ headers, payload });
};

// Replace: login operation
const loginOperation = async ({ collection, data, req }) => {
  // Use better-auth for password check
  const authResult = await betterAuth.api.signIn.email({
    email: data.email,
    password: data.password
  });

  if (!authResult.success) {
    throw new AuthenticationError();
  }

  // Fetch full user with Payload
  const user = await payload.findByID({
    collection: collection.slug,
    id: authResult.user.id
  });

  // Run Payload hooks
  await runBeforeLoginHooks({ user, req });
  await runAfterLoginHooks({ user, req });

  return {
    user,
    token: authResult.token,
    exp: authResult.expiresAt
  };
};
```

### 8.3 Database Schema Migration

**Current Payload Fields**:
```typescript
{
  email: string,
  username?: string,
  salt: string,              // Remove
  hash: string,              // Remove
  resetPasswordToken: string,         // Remove
  resetPasswordExpiration: Date,      // Remove
  _verified: boolean,                 // Keep or map
  _verificationToken: string,         // Remove
  loginAttempts: number,              // Remove
  lockUntil: Date,                    // Remove
  sessions: UserSession[],            // Remove
  enableAPIKey: boolean,              // Keep
  apiKey: string,                     // Keep
  apiKeyIndex: string                 // Keep
}
```

**Better-Auth Tables**:
```typescript
// better_auth_user table
{
  id: string,
  email: string,
  emailVerified: boolean,      // Map from _verified
  name?: string,
  image?: string,
  createdAt: Date,
  updatedAt: Date
}

// better_auth_session table
{
  id: string,
  userId: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
}

// better_auth_verification table
{
  id: string,
  userId: string,
  code: string,
  expiresAt: Date
}
```

**Migration Strategy**:

**Option A: Parallel Tables**
- Keep Payload user collection as-is
- Add better_auth tables alongside
- Link via user ID
- Better-auth handles auth, Payload handles data
- **Pro**: Clean separation, easier rollback
- **Con**: Data duplication (email, verification status)

**Option B: Shared User Table**
- Configure better-auth to use Payload's user collection
- Remove auth fields from Payload schema
- Better-auth manages auth fields directly
- **Pro**: Single source of truth
- **Con**: Tighter coupling, complex migration

**Option C: Hybrid (Recommended)**
- Better-auth uses separate session/verification tables
- Payload user collection keeps user data
- Share user ID as foreign key
- Keep API key fields in Payload
- Map _verified from better-auth emailVerified
- **Pro**: Clean separation, minimal duplication
- **Con**: Need sync logic for verification status

### 8.4 Migration Steps

**Phase 1: Setup** (Non-breaking)
1. Install better-auth
2. Add better_auth tables to database
3. Create better-auth instance with Payload config
4. Add migration script to sync existing users
5. Hash existing passwords to better-auth format

**Phase 2: Dual-Auth** (Feature flag)
1. Add `useBetterAuth` config flag (default: false)
2. Implement better-auth strategy in executeAuthStrategies
3. Update login endpoint to use better-auth when flag enabled
4. Keep fallback to legacy auth
5. Test thoroughly in staging

**Phase 3: Migration** (Gradual)
1. Enable better-auth for new users
2. Migrate existing users on next login (re-hash password)
3. Both auth systems work in parallel
4. Monitor error rates and performance

**Phase 4: Cutover** (Breaking change)
1. Enable `useBetterAuth` by default
2. Deprecate legacy auth operations
3. Remove legacy auth fields from schema (major version)
4. Update documentation

**Phase 5: Cleanup**
1. Remove legacy auth code
2. Remove migration scripts
3. Remove feature flags

### 8.5 API Compatibility

**Maintain These Endpoints**:
```
POST /api/users/login           -> better-auth signIn
POST /api/users/logout          -> better-auth signOut
POST /api/users/refresh         -> better-auth refresh
POST /api/users/forgot-password -> better-auth forgotPassword
POST /api/users/reset-password  -> better-auth resetPassword
POST /api/users/verify/:token   -> better-auth verifyEmail
GET  /api/users/me              -> Keep (Payload permissions)
```

**Endpoint Wrapper Pattern**:
```typescript
// Maintain backward compatibility
export const loginEndpoint = async (req: PayloadRequest) => {
  // Call better-auth
  const authResult = await betterAuth.api.signIn.email({
    email: req.body.email,
    password: req.body.password
  });

  // Transform response to match Payload format
  return {
    user: await fetchPayloadUser(authResult.user.id),
    token: authResult.token,
    exp: authResult.expiresAt,
    // ...maintain same response shape
  };
};
```

### 8.6 Hook Preservation

**Keep All Hooks**:
```typescript
// Before better-auth call
await runBeforeOperationHooks({ operation: 'login', args });

// Better-auth authentication
const authResult = await betterAuth.api.signIn.email(...);

// After better-auth call
await runBeforeLoginHooks({ user, req });
await runAfterLoginHooks({ user, token, req });
await runAfterOperationHooks({ operation: 'login', result });
```

**Hook Compatibility Layer**:
```typescript
const wrapBetterAuth = (operation: string, authFn) => {
  return async (args) => {
    // Payload before hooks
    const modifiedArgs = await runPayloadHooks.before(operation, args);

    // Better-auth operation
    const result = await authFn(modifiedArgs);

    // Payload after hooks
    const modifiedResult = await runPayloadHooks.after(operation, result);

    return modifiedResult;
  };
};
```

### 8.7 Custom Strategy Support

**Preserve Strategy System**:
```typescript
// Better-auth becomes one strategy
const strategies = [
  betterAuthStrategy,        // Handles password + OAuth
  apiKeyStrategy,            // Keep from Payload
  ...customStrategies        // User-defined
];

// Strategy execution unchanged
const { user } = await executeAuthStrategies({ strategies, headers });
```

**Better-Auth Strategy**:
```typescript
const betterAuthStrategy: AuthStrategy = {
  name: 'better-auth',
  authenticate: async ({ headers, payload }) => {
    const session = await betterAuth.api.getSession({ headers });
    if (!session) return { user: null };

    const user = await payload.findByID({
      collection: 'users',
      id: session.user.id
    });

    user._strategy = 'better-auth';
    return { user };
  }
};
```

### 8.8 Testing Strategy

**Test Coverage Required**:

1. **Unit Tests**:
   - Password hashing migration (pbkdf2 → bcrypt)
   - Session format conversion
   - JWT payload compatibility
   - Cookie format compatibility

2. **Integration Tests**:
   - Login flow (email + username)
   - Logout (single + all sessions)
   - Password reset flow
   - Email verification flow
   - Token refresh
   - API key authentication (unchanged)
   - Custom strategy compatibility

3. **Access Control Tests**:
   - All existing access control tests must pass
   - Permission resolution unchanged
   - Admin panel access unchanged

4. **Hook Tests**:
   - All hooks still fire
   - Hook order preserved
   - Hook arguments unchanged

5. **Migration Tests**:
   - Existing users can login
   - Password migration on login
   - Session migration
   - Rollback capability

**Test Data Migration**:
```typescript
// Create test users in both formats
const legacyUser = {
  email: 'test@example.com',
  salt: '...',
  hash: '...',
  sessions: [...]
};

const betterAuthUser = {
  email: 'test@example.com',
  // better-auth password hash
};

// Verify both can authenticate
await testLogin(legacyUser);  // Should migrate
await testLogin(betterAuthUser);  // Should work
```

### 8.9 Performance Considerations

**Current Performance**:
- JWT verification: ~1ms (jose library)
- Session validation: ~10ms (database query)
- Password verification: ~50ms (pbkdf2 25000 iterations)
- Total login: ~100-200ms

**Better-Auth Performance**:
- Bcrypt hashing: ~100-300ms (rounds=10)
- Session validation: ~10ms (database query)
- JWT verification: ~1ms

**Optimization Strategies**:
1. **Session Caching**: Cache active sessions in Redis
2. **JWT Strategy First**: Skip session check if JWT valid
3. **Parallel Queries**: Fetch user and session in parallel
4. **Lazy Hooks**: Only run necessary hooks based on config
5. **Connection Pooling**: Ensure database connections optimized

### 8.10 Security Considerations

**Security Improvements**:
1. **Better Hashing**: Bcrypt > PBKDF2 for password storage
2. **Token Rotation**: Better-auth's automatic token rotation
3. **Rate Limiting**: Built-in rate limiting vs custom implementation
4. **Session Security**: Better session management (IP tracking, device fingerprinting)
5. **CSRF Protection**: Better-auth's CSRF tokens

**Security Parity**:
1. **API Keys**: Keep Payload's encrypted API key system
2. **Account Locking**: Implement using better-auth rate limiting
3. **Email Verification**: Map to better-auth verification flow
4. **Password Reset**: Use better-auth reset with custom emails

**Security Testing**:
1. Test timing attack resistance
2. Test session fixation prevention
3. Test CSRF token validation
4. Test rate limiting effectiveness
5. Test secure cookie settings

---

## 9. Summary

### Current State

**Payload Auth Architecture**:
- **Hybrid JWT + Session**: JWT for stateless auth, sessions for revocation
- **PBKDF2 Hashing**: 25k iterations, SHA256
- **Multiple Strategies**: Local (password), JWT, API Key, Custom
- **Rich Hook System**: beforeLogin, afterLogin, etc.
- **Granular Access Control**: Collection/field level permissions
- **Email Flows**: Verification, password reset
- **Account Security**: Login attempts, account locking

**Strengths**:
- Flexible strategy system
- Tight CMS integration
- Powerful access control
- Comprehensive hook system
- Well-tested and battle-hardened

**Weaknesses**:
- Custom auth implementation (reinventing wheel)
- PBKDF2 less secure than modern alternatives
- Complex codebase (70+ files)
- No built-in OAuth support
- Manual session management

### Migration Goals

**Why Better-Auth**:
1. **Modern Security**: Bcrypt, better token handling
2. **Built-in OAuth**: Google, GitHub, etc. out of box
3. **Maintained Library**: Security updates, features
4. **Reduced Complexity**: Less custom code to maintain
5. **Better DX**: Modern API, TypeScript-first

**Non-Goals**:
- Keep Payload's access control (it's superior)
- Keep Payload's hook system (it's powerful)
- Keep API key authentication (custom to Payload)
- Maintain backward compatibility (API contracts)

### Key Migration Challenges

1. **Database Schema**: Map Payload auth fields to better-auth tables
2. **Password Migration**: Re-hash existing passwords securely
3. **Session Format**: Convert Payload sessions to better-auth sessions
4. **Hook Integration**: Ensure all hooks still fire correctly
5. **API Compatibility**: Keep REST/GraphQL APIs working
6. **Access Control**: Preserve granular permissions
7. **Testing**: Comprehensive test coverage for all flows
8. **Rollback Plan**: Ability to revert if issues found

### Recommended Approach

**Hybrid Architecture**:
- Better-auth handles authentication (login, password, sessions)
- Payload keeps authorization (access control, permissions)
- Shared user ID links the systems
- Custom strategies (API key) preserved
- Hook system bridges both systems

**Migration Path**:
1. Add better-auth alongside existing auth (non-breaking)
2. Implement better-auth strategy in executeAuthStrategies
3. Migrate users gradually (re-hash on login)
4. Run dual auth systems in parallel (feature flag)
5. Switch default to better-auth
6. Remove legacy auth in major version

**Success Metrics**:
- Zero breaking changes in minor version
- All existing tests pass
- No performance regression
- Successful user migration (100%)
- No security vulnerabilities introduced

---

## 10. File Reference

**Key Files to Study**:
```
/payload-main/packages/payload/src/auth/
├── operations/login.ts              # Login flow (400 lines)
├── operations/logout.ts             # Logout flow (89 lines)
├── operations/refresh.ts            # Token refresh (208 lines)
├── strategies/local/authenticate.ts # Password verification (42 lines)
├── strategies/local/generatePasswordSaltHash.ts  # Hashing (62 lines)
├── strategies/apiKey.ts             # API key strategy (79 lines)
├── executeAuthStrategies.ts         # Strategy runner (39 lines)
├── sessions.ts                      # Session management (71 lines)
├── jwt.ts                           # JWT signing (22 lines)
├── cookies.ts                       # Cookie utilities (234 lines)
├── getAuthFields.ts                 # Field injection (64 lines)
└── types.ts                         # Auth types (325 lines)

/payload-main/packages/payload/src/
├── utilities/createPayloadRequest.ts  # Request auth (123 lines)
└── auth/executeAccess.ts              # Access control (43 lines)
```

**Total Auth Code**: ~2,500 lines across 70+ files

**Estimated Migration Effort**:
- Planning: 2-3 days
- Implementation: 10-15 days
- Testing: 5-7 days
- Documentation: 2-3 days
- **Total**: 3-4 weeks for complete migration

---

**Report End** - Generated for better-auth migration planning
