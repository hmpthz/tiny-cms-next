# Payload Email Packages Analysis

## Overview

Payload CMS provides a pluggable email adapter system with two official adapters: `email-nodemailer` and `email-resend`. The core package defines the email adapter interface and provides a console-based fallback adapter for development.

**Note**: Better-auth already includes email functionality (verification, password reset, etc.), so we will not need these Payload email packages for authentication flows in tiny-cms-next.

---

## 1. Core Email System (`packages/payload/src/email`)

### Directory Structure

```
payload/src/email/
├── types.ts                    # Email adapter interface
├── defaults.ts                 # Default from address/name
├── consoleEmailAdapter.ts      # Development fallback adapter
└── getStringifiedToAddress.ts  # Helper to format recipient addresses
```

### Email Adapter Interface

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/payload/src/email/types.ts`

```typescript
// Lines 27-32
export type EmailAdapter<TSendEmailResponse = unknown> = ({ payload }: { payload: Payload }) => {
  defaultFromAddress: string
  defaultFromName: string
  name: string
  sendEmail: (message: SendEmailOptions) => Promise<TSendEmailResponse>
}
```

**Key aspects**:
- Generic type `TSendEmailResponse` allows adapters to return provider-specific responses
- Adapter is a factory function that receives Payload instance
- `SendEmailOptions` is based on Nodemailer's `SendMailOptions` (line 12)
- Returns initialized adapter with `sendEmail` method

### Console Email Adapter (Development)

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/payload/src/email/consoleEmailAdapter.ts`

```typescript
// Lines 6-16
export const consoleEmailAdapter: EmailAdapter<void> = ({ payload }) => ({
  name: 'console',
  defaultFromAddress: emailDefaults.defaultFromAddress,
  defaultFromName: emailDefaults.defaultFromName,
  sendEmail: async (message) => {
    const stringifiedTo = getStringifiedToAddress(message)
    const res = `Email attempted without being configured. To: '${stringifiedTo}', Subject: '${message.subject}'`
    payload.logger.info({ msg: res })
    return Promise.resolve()
  },
})
```

Used as fallback when no email adapter is configured.

### Config Integration

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/payload/src/config/types.ts`

```typescript
// Line 1070
email?: EmailAdapter | Promise<EmailAdapter>
```

Email adapter is an optional config property that can be synchronous or async.

---

## 2. Email Nodemailer (`@payloadcms/email-nodemailer`)

### Package Summary

- **Version**: 3.59.1
- **Dependencies**: `nodemailer@7.0.9`
- **Purpose**: Full-featured SMTP email adapter using Nodemailer

### Directory Structure

```
email-nodemailer/
├── package.json
├── tsconfig.json
├── .swcrc
├── README.md
├── LICENSE.md
└── src/
    ├── index.ts              # Main adapter implementation
    └── plugin.spec.ts        # Unit tests
```

### Implementation

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/email-nodemailer/src/index.ts`

```typescript
// Lines 9-15
export type NodemailerAdapterArgs = {
  defaultFromAddress: string
  defaultFromName: string
  skipVerify?: boolean
  transport?: Transporter
  transportOptions?: SMTPConnection.Options
}

// Lines 24-41
export const nodemailerAdapter = async (
  args?: NodemailerAdapterArgs,
): Promise<NodemailerAdapter> => {
  const { defaultFromAddress, defaultFromName, transport } = await buildEmail(args)

  const adapter: NodemailerAdapter = () => ({
    name: 'nodemailer',
    defaultFromAddress,
    defaultFromName,
    sendEmail: async (message) => {
      return await transport.sendMail({
        from: `${defaultFromName} <${defaultFromAddress}>`,
        ...message,
      })
    },
  })
  return adapter
}
```

**Key features**:
- Async factory function (builds transport before returning adapter)
- Supports custom Nodemailer transport or transport options
- Auto-creates Ethereal test account if no config provided (lines 93-126)
- Optional transport verification (line 71-73, can skip with `skipVerify: true`)
- Returns full Nodemailer response

**Mock Account Creation** (lines 93-126):
```typescript
async function createMockAccount(emailConfig?: NodemailerAdapterArgs) {
  const etherealAccount = await nodemailer.createTestAccount()
  // Creates test SMTP account at smtp.ethereal.email:587
  // Logs credentials and web URL for viewing sent emails
}
```

### Tests

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/email-nodemailer/src/plugin.spec.ts`

Tests verify:
- Transport verification is invoked when `skipVerify = false` (line 34)
- Transport verification is invoked when `skipVerify` is undefined (line 44)
- Transport verification is skipped when `skipVerify = true` (line 54)

---

## 3. Email Resend (`@payloadcms/email-resend`)

### Package Summary

- **Version**: 3.59.1
- **Dependencies**: None (uses native `fetch`)
- **Purpose**: Lightweight email adapter for Resend REST API

### Directory Structure

```
email-resend/
├── package.json
├── tsconfig.json
├── jest.config.js
├── .swcrc
├── .swcrc-build
├── README.md
├── LICENSE.md
└── src/
    ├── index.ts                # Main adapter implementation
    └── email-resend.spec.ts    # Jest tests
```

### Implementation

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/email-resend/src/index.ts`

```typescript
// Lines 5-9
export type ResendAdapterArgs = {
  apiKey: string
  defaultFromAddress: string
  defaultFromName: string
}

// Lines 24-65
export const resendAdapter = (args: ResendAdapterArgs): ResendAdapter => {
  const { apiKey, defaultFromAddress, defaultFromName } = args

  const adapter: ResendAdapter = () => ({
    name: 'resend-rest',
    defaultFromAddress,
    defaultFromName,
    sendEmail: async (message) => {
      const sendEmailOptions = mapPayloadEmailToResendEmail(
        message,
        defaultFromAddress,
        defaultFromName,
      )

      const res = await fetch('https://api.resend.com/emails', {
        body: JSON.stringify(sendEmailOptions),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      const data = (await res.json()) as ResendResponse

      if ('id' in data) {
        return data  // Returns { id: string }
      } else {
        throw new APIError(`Error sending email: ${statusCode} ...`, statusCode)
      }
    },
  })

  return adapter
}
```

**Key features**:
- Synchronous factory (no async initialization needed)
- Uses native `fetch` API (no external dependencies)
- Maps Payload email format to Resend API format (lines 67-88)
- Handles attachments by converting to Buffer (lines 122-150)
- Returns Resend response `{ id: string }` on success
- Throws `APIError` on failure with status code

**Field Mapping** (lines 67-88):
```typescript
function mapPayloadEmailToResendEmail(message, defaultFromAddress, defaultFromName) {
  return {
    from: mapFromAddress(message.from, defaultFromName, defaultFromAddress),
    subject: message.subject ?? '',
    to: mapAddresses(message.to),
    bcc: mapAddresses(message.bcc),
    cc: mapAddresses(message.cc),
    reply_to: mapAddresses(message.replyTo),
    attachments: mapAttachments(message.attachments),
    html: message.html?.toString() || '',
    text: message.text?.toString() || '',
  }
}
```

### Tests

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/email-resend/src/email-resend.spec.ts`

Tests verify:
- Successful email sending with mocked fetch (lines 22-57)
- Error handling for failed API calls (lines 59-89)
- Request format includes proper authorization header
- Response parsing and error throwing

---

## 4. Integration with Payload Auth System

### Verification Email Flow

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/payload/src/auth/sendVerificationEmail.ts`

```typescript
// Lines 20-75
export async function sendVerificationEmail(args: Args): Promise<void> {
  if (!disableEmail) {
    const verificationURL = `${serverURL}${config.routes.admin}/${collectionConfig.slug}/verify/${token}`

    let html = req.t('authentication:newAccountCreated', {
      serverURL: config.serverURL,
      verificationURL,
    })

    // Allow config to override email content
    if (typeof verify.generateEmailHTML === 'function') {
      html = await verify.generateEmailHTML({ req, token, user })
    }

    let subject = req.t('authentication:verifyYourEmail')

    // Allow config to override email subject
    if (typeof verify.generateEmailSubject === 'function') {
      subject = await verify.generateEmailSubject({ req, token, user })
    }

    await email.sendEmail({
      from: `"${email.defaultFromName}" <${email.defaultFromAddress}>`,
      html,
      subject,
      to: user.email,
    })
  }
}
```

### Forgot Password Flow

**File**: `/Users/harrell/Documents/tiny-cms-next/payload-main/packages/payload/src/auth/operations/forgotPassword.ts`

```typescript
// Lines 162-201
if (!disableEmail && user.email) {
  const forgotURL = formatAdminURL({
    adminRoute: config.routes.admin,
    path: `${config.admin.routes.reset}/${token}`,
    serverURL,
  })

  let html = `${req.t('authentication:youAreReceivingResetPassword')}
    <a href="${forgotURL}">${forgotURL}</a>
    ${req.t('authentication:youDidNotRequestPassword')}`

  if (typeof collectionConfig.auth.forgotPassword?.generateEmailHTML === 'function') {
    html = await collectionConfig.auth.forgotPassword.generateEmailHTML({
      req, token, user
    })
  }

  let subject = req.t('authentication:resetYourPassword')

  if (typeof collectionConfig.auth.forgotPassword?.generateEmailSubject === 'function') {
    subject = await collectionConfig.auth.forgotPassword.generateEmailSubject({
      req, token, user
    })
  }

  await email.sendEmail({
    from: `"${email.defaultFromName}" <${email.defaultFromAddress}>`,
    html,
    subject,
    to: user.email,
  })
}
```

**Common patterns**:
1. Generate reset/verification token
2. Store token in user document with expiration
3. Build URL with token
4. Allow custom email HTML/subject via config hooks
5. Use i18n for default messages (`req.t()`)
6. Call `email.sendEmail()` with standard options
7. Can be disabled with `disableEmail` flag

---

## 5. Comparison & Key Differences

| Feature | Nodemailer | Resend |
|---------|-----------|--------|
| **Initialization** | Async (creates transport) | Sync |
| **Dependencies** | `nodemailer@7.0.9` | None (native fetch) |
| **Protocol** | SMTP | REST API |
| **Test mode** | Ethereal.email mock accounts | N/A (requires API key) |
| **Response** | Full Nodemailer response | `{ id: string }` |
| **Transport verification** | Yes (optional skip) | N/A |
| **Flexibility** | Custom SMTP, transport options | Fixed to Resend API |
| **Bundle size** | ~500KB | ~50KB |

---

## 6. Not Needed for tiny-cms-next

**Better-auth already provides**:
- Email verification flow with customizable templates
- Password reset flow with token generation
- Email sending integration (can use Resend, Nodemailer, etc.)
- Built-in rate limiting and security

**What we DON'T need from Payload email system**:
- ✗ Email adapter abstraction (better-auth has its own)
- ✗ Verification email sending (better-auth handles this)
- ✗ Forgot password emails (better-auth handles this)
- ✗ i18n integration for auth emails (better-auth has templates)

**What we DO need to implement**:
- Direct email provider setup (Resend or Nodemailer) for better-auth
- Custom email templates for better-auth flows (optional)
- Any CMS-specific emails (content notifications, etc.) outside auth

---

## Summary

Payload's email system is well-architected with:
- Clean adapter interface with generic return types
- Factory pattern for initialization
- Separation of concerns (core interface, adapter implementations)
- Comprehensive mapping from standard format to provider-specific APIs

However, since better-auth provides its own email functionality for authentication flows (verification, password reset), we should:
1. Configure email directly in better-auth (not through Payload adapters)
2. Use Resend or Nodemailer directly for any non-auth CMS emails
3. Avoid duplicating email logic between Payload and better-auth

The Payload email adapters are mature and production-ready, but they solve a problem we've already solved by choosing better-auth for authentication.
