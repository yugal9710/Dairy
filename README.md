# 🥛 Dairy ERP 2.0 - Smart Cooperative & Milk Management System

> Advanced Multi-Tenant Milk Cooperative & Dairy Management Platform converted to the **Node.js Express + React 19 / Vite + Tailwind CSS** architecture (identically structured like `Dental`), while preserving **100% of the business logic, calculations, workflows, and operations** from `Dairy-dev`.

---

## 🌟 Key Features & Core Business Logic

### 1. 🥛 Milk Collection & Automated FAT/SNF Testing (दूध संकलन)
- **Morning (बिहानी) & Evening (बेलुकी) Shift Tracking**
- **Farmer Auto-Lookup by Code (#1, #2, etc.) or Name** with instant pre-population of last recorded FAT and SNF
- **Rate Calculation Engine**:
  $$\text{Rate} = (\text{FatRate} \times \text{FAT \%}) + (\text{SnfRate} \times \text{SNF \%})$$
  $$\text{Total Price} = \text{Rate} \times \text{Quantity (Liters)}$$
- **Printable Thermal Milk Collection Slip** with Dairy letterhead, farmer code, shift, FAT, SNF, Rate, and Net Total
- Real-time raw milk stock update and procurement cost ledger logging

### 2. ⚙️ FAT & SNF Rate Configuration (फ्याट र एस.एन.एफ. दर निर्धारण)
- **Buying FAT & SNF Rates** (कृषकबाट खरिद दर): Configurable per unit point
- **Selling Rates** (बिक्री दर): Selling FAT, Selling SNF, and Flat Rate per Liter

### 3. 💵 Farmer Payments & Payout Vouchers (कृषक भुक्तानी)
- **4 KPI Farmer Account Balances**:
  1. Total Milk Supplied (Liters)
  2. Total Milk Bill Amount (Rs.)
  3. Total Amount Paid to date (Rs.)
  4. Remaining Due Balance with alert status (**Due** vs **Settled**)
- **Payment Disbursement Modal** (Cash, Bank Transfer, Cheque, Online/Fonepay)
- **Printable Farmer Statement & Payment Vouchers**

### 4. 🛒 Instant Sales POS Counter (काउन्टर खुद्रा बिक्री)
- **Fast POS Counter Interface** with interactive product catalog, live stock availability, and image cards
- Line-item quantity adjusters, discount application, walk-in or registered customer lookup
- **Flexible Payment Modes**: Cash, Fonepay QR, Bank Transfer, and Credit/Due
- **Automatic Inventory Deduction & Sales Receipt Printing**

### 5. 📦 Orders & Scheduled Deliveries (अग्रिम अर्डर तथा डेलिभरी)
- Institutional & Wholesale future orders (Hotels, Restaurants, Caterers)
- Status Workflow: `Pending` $\rightarrow$ `Confirmed` $\rightarrow$ `InPreparation` $\rightarrow$ `Dispatched` $\rightarrow$ `Delivered` $\rightarrow$ `Cancelled`
- Delivery recording and immutable audit changelog history

### 6. 🧀 Finished Products & Inventory Stock POS (उत्पादन तथा मौज्दात)
- Product master with Nepali/English names, measurement units, reorder warning levels
- Batch / Lot tracking with expiry dates
- **Audit Stock Movements**: In (खरिद), Out (प्रशोधन/बिक्री), Damage (खराब), Wastage (खेर गएको), Adjustment (मिलान)

### 7. 🥣 Production Batches (दूध प्रशोधन प्रक्रिया)
- Process raw milk into value-added dairy products: **Paneer (पनिर)**, **Curd (दही)**, **Ghee (घिउ)**, **Butter (नौनी)**, **Cream (क्रिम)**
- Automatic raw milk deduction and finished products stock increment upon batch completion

### 8. 🚚 Supplier Purchases & Procurement (कच्चा पदार्थ खरिद)
- Raw milk bulk procurement, packaging pouches, feeds, culture, bottles, machinery parts
- Supplier invoices, payment status (Paid, Partial, Credit), and Cash/Bank expense entries

### 9. 💰 Finance, Operational Expenses & General Ledger (वित्त तथा खाता)
- **Liquid Funds Overview**: Cash in Hand balance + Bank balance + Total Liquidity
- **Operational Expenses**: Electricity (NEA), Rent, Transport/Freight, Packaging, Staff Salaries, Maintenance, Misc
- **Double-Entry Cash & Bank Ledger** with running balance calculations

### 10. 📊 Profit & Loss Statement (P&L) & Analytics (नाफा-नोक्सान)
- **Operating Revenue**: Instant Sales + Wholesale Sales Turnover
- **Cost of Goods Sold (COGS)**: Raw Milk Procurement Costs + Supplier Procurement Costs
- **Gross Profit** = $\text{Total Revenue} - \text{COGS}$
- **Net Operating Profit** = $\text{Gross Profit} - \text{Operating Expenses}$

### 11. 👥 Customers & Farmers Directory (खाता सूची)
- Comprehensive directory of Farmers, Wholesale Buyers, and Combined accounts
- Customer Details Page with the **4 Core Summary KPI Cards**, delivery history, and payment logs

### 12. 🏢 Multi-Tenant Platform & Subscription Engine (सहकारी संस्था)
- Multi-tenant architecture supporting independent cooperative databases
- Subscription expiration monitoring with warning alert banner and 1-click renewal modal

### 13. 📅 Nepali Bikram Sambat (BS) Calendar (नेपाली पात्रो)
- Live BS date pill in header with accurate Gregorian $\leftrightarrow$ Bikram Sambat conversion
- Interactive BS calendar modal with Nepali month/day names and holiday markers

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### 1-Click Startup (Windows)
Double-click `start-dairy-app.bat` or run:
```bash
node run.js
```

### Manual Commands
```bash
# Start backend server (Port 5000)
npm run server

# Start frontend application (Port 3000)
npm run client

# Or start both simultaneously
npm run dev
```

The Web App opens at **http://localhost:3000**, with the API running on **http://localhost:5000**.

---

## 🔑 Demo & Test Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **SuperAdmin** | `bipin.paul@dairy.local` | `Admin@123` |
| **Admin** | `admin@dairy.local` | `Admin@123` |
| **Manager** | `manager@dairy.local` | `Manager@123` |
| **Staff / Operator** | `staff@dairy.local` | `Staff@123` |
| **Counter Staff** | `sita.sharma@dairy.local` | `Admin@123` |
