# 🚀 Headless WooCommerce Admin ERP - Installation & Setup Guide

Welcome to **Headless WooCommerce Admin ERP**! This modern Next.js 16 application connects to your existing WooCommerce store to provide a lightning-fast (sub-second) admin dashboard for order processing, inventory sync, sales team management, and customer messaging.

---

## 📋 System Requirements
- **Node.js**: v18.18.0, v20.x, or v22.x+
- **WordPress**: v5.8+ with **WooCommerce** v5.0+ installed
- **Hosting / Cloud**: Vercel (Recommended), AWS Amplify, Netlify, or any Node.js VPS / Docker.

---

## ⚡ Step 1: Generate WooCommerce REST API Keys
1. Log in to your WordPress Dashboard (`https://yourstore.com/wp-admin`).
2. Navigate to **WooCommerce** -> **Settings** -> **Advanced** tab -> **REST API**.
3. Click **Add Key**:
   - **Description**: `Headless Admin ERP`
   - **User**: Select an Administrator account
   - **Permissions**: **Read/Write**
4. Click **Generate API Key**.
5. Copy the **Consumer Key** (`ck_...`) and **Consumer Secret** (`cs_...`).

---

## ⚡ Step 2: Configure Environment Variables
1. Copy the sample configuration file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and fill in your store details:
   ```env
   WOOCOMMERCE_API_URL="https://yourstore.com/wp-json/wc/v3"
   WOOCOMMERCE_CONSUMER_KEY="ck_your_consumer_key_here"
   WOOCOMMERCE_CONSUMER_SECRET="cs_your_consumer_secret_here"
   JWT_SECRET="your_custom_32_character_secret_key"
   ```

---

## ⚡ Step 3: Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Step 4: 1-Click Deploy to Vercel (Production)
1. Push your repository to **GitHub**.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, paste the keys from your `.env.local`.
5. Click **Deploy**.
6. (Optional) Assign your custom subdomain (e.g., `admin.yourstore.com`) in **Vercel -> Settings -> Domains**.

---

## 🛡️ Support & Inquiries
For technical assistance, bug reports, or customization inquiries, feel free to contact us via your marketplace profile.
