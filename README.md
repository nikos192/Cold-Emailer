# Velory Outreach

Internal cold email outreach tool for Velory Web Design. Sends personalised cold emails to local tradespeople via Outlook SMTP.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Email**: Nodemailer via Outlook SMTP (smtp.office365.com:587)
- **Storage**: Vercel KV
- **Auth**: Single hardcoded password (cookie-based session)
- **Deployment**: Vercel

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/nikos192/cold-emailer.git
cd cold-emailer
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password to log in to the app |
| `OUTLOOK_EMAIL` | Your Outlook email address |
| `OUTLOOK_APP_PASSWORD` | App password from Microsoft account security settings |
| `OUTLOOK_FROM_NAME` | Display name for sent emails |
| `UPSTASH_REDIS_REST_URL` | From Upstash Redis dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash Redis dashboard |

### 3. Set up Upstash Redis (for local dev)

- Go to [console.upstash.com](https://console.upstash.com) → **Create Database** → choose a region
- Under **REST API**, copy the **REST URL** and **REST Token**
- Add them to `.env.local` as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your `ADMIN_PASSWORD`.

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel

- Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo
- Vercel auto-detects Next.js — no build config needed

### 3. Add environment variables

In Vercel project settings → **Environment Variables**, add all variables from `.env.example`.

### 4. Add Upstash Redis to Vercel

- Go to [Vercel Marketplace → Upstash Redis](https://vercel.com/marketplace?category=storage&search=upstash)
- Install the integration and connect your database to your Vercel project
- Vercel automatically injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 5. Deploy

Push any commit to `main` — Vercel auto-deploys.

---

## Usage

### Leads
- Import leads via CSV paste or file upload
- Expected columns: `name`, `business_name`, `suburb`, `trade`, `email`
- Manually add single leads with the form
- Filter by suburb, trade, or status
- Mark leads as Skip to exclude from future sends
- Bulk delete or bulk skip

### Template
- Edit the subject and body with merge variables
- Click merge variable chips to insert at cursor (↑ = subject, ↓ = body)
- Live preview with any lead's real data
- Save template — persists across deployments via KV

### Send
- Select leads (or auto-select all "not contacted")
- Set delay between emails (15–120 seconds)
- Confirms list of recipients before sending
- Real-time send log via 2-second polling
- ⚠ Vercel Hobby tier: 5-minute function timeout. At 45s delay, max ~6 leads per campaign. Reduce delay or split into batches for larger lists.

### History
- Browse all past campaigns
- See sent/failed counts per campaign
- Expand any campaign to see individual send results

---

## Outlook App Password

To generate an app password for Outlook:
1. Go to [account.microsoft.com/security](https://account.microsoft.com/security)
2. Enable two-step verification if not already on
3. Under **Advanced security options** → **App passwords** → create one
4. Use that as `OUTLOOK_APP_PASSWORD`

---

## Data Schema (Vercel KV)

```
lead:{id}           → Lead object
leads:index         → string[] of lead IDs
template:active     → { subject, body }
campaigns:index     → string[] of campaign IDs (newest first)
campaign:{id}       → Campaign object
campaign:active     → Active campaign (deleted when done)
```
