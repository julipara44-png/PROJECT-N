<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy to production.

View your app in AI Studio: https://ai.studio/apps/48a9cc3a-862c-4a00-b5d9-f06426d81cb2

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set your environment variables in `.env` based on `.env.example`
3. Run the app:
   `npm run dev`

## Custom Domain Configuration

To map a custom domain to this application, follow these integration steps across your connected services:

### 1. Render Deployment
1. Go to your Render Dashboard and select your **Static Site** service.
2. In the **Settings** menu, scroll down to **Custom Domains**.
3. Click **Add Custom Domain** and enter your desired domain (e.g., `app.yourdomain.com`).
4. Update your domain's DNS provider (e.g., Cloudflare, GoDaddy) to add a `CNAME` record pointing to the provided `.onrender.com` URL.
5. Render will automatically provision SSL certificates once the DNS propagation is complete.

### 2. Supabase Authentication
To ensure users can log in from your new custom domain:
1. Open the **Supabase Dashboard** and go to **Authentication** > **URL Configuration**.
2. Under **Site URL**, change it to your new domain (e.g., `https://app.yourdomain.com`).
3. Under **Redirect URLs**, click **Add URL** and add your new domain (e.g., `https://app.yourdomain.com/*`). This ensures OAuth and Magic Links redirect back correctly.

### 3. Backend CORS (If applicable)
*Note: This project is currently a frontend Vite application without a dedicated Express backend. If an Express API is added later, ensure your `cors` middleware is configured:*
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://app.yourdomain.com', 'http://localhost:3000'],
  credentials: true
}));
```
