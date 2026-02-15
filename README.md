# 🚀 CRAFT Platform

A powerful no-code platform that enables users to deploy customized DeFi applications on the Stellar blockchain in minutes. Choose from pre-built templates, customize your branding and features, and deploy automatically to production.

![CRAFT Platform](https://img.shields.io/badge/Status-In%20Development-yellow)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Stellar](https://img.shields.io/badge/Stellar-Blockchain-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

## ✨ Features

- 🎨 **Visual Customization**: Customize branding, colors, and features through an intuitive interface
- 🔗 **Stellar Integration**: Built-in support for Stellar mainnet and testnet
- 🤖 **Automated Deployment**: One-click deployment to Vercel with GitHub integration
- 💳 **Payment Processing**: Integrated Stripe subscriptions with multiple tiers
- 📊 **Template Marketplace**: Choose from DEX, lending, payment gateway, and asset issuance templates
- 🔐 **Secure Authentication**: Supabase Auth with row-level security
- 📱 **Responsive Design**: Mobile-first templates with TailwindCSS

## 🏗️ Architecture

```
craft-platform/
├── apps/
│   ├── web/                      # Main Next.js application
│   │   ├── src/
│   │   │   ├── app/             # Next.js 14 App Router
│   │   │   │   ├── api/         # API routes
│   │   │   │   │   ├── auth/    # Authentication endpoints
│   │   │   │   │   ├── payments/ # Stripe integration
│   │   │   │   │   ├── templates/ # Template management
│   │   │   │   │   └── webhooks/ # Webhook handlers
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── payment.service.ts
│   │   │   │   └── template.service.ts
│   │   │   └── lib/             # Utilities
│   │   │       ├── supabase/    # Database client
│   │   │       └── stripe/      # Payment client
│   └── generator/                # Template generation service (coming soon)
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   │   ├── user.ts
│   │   ├── template.ts
│   │   ├── deployment.ts
│   │   ├── customization.ts
│   │   ├── stellar.ts
│   │   └── payment.ts
│   ├── ui/                       # Shared UI components
│   ├── stellar/                  # Stellar SDK wrapper
│   └── config/                   # Shared configuration
│
├── templates/                    # Base template repositories
│   ├── stellar-dex/             # DEX template
│   ├── soroban-defi/            # Soroban smart contracts
│   ├── payment-gateway/         # Payment processing
│   └── asset-issuance/          # Asset management
│
└── supabase/
    ├── migrations/              # Database migrations
    │   ├── 001_initial_schema.sql
    │   ├── 002_row_level_security.sql
    │   └── 003_seed_templates.sql
    └── config.toml              # Supabase configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 10.0 or higher
- **Supabase** account (for database)
- **Stripe** account (for payments)
- **GitHub** account (for repository management)
- **Vercel** account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/temma02/Craft.git
   cd Craft
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure your `.env.local` file**
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # GitHub
   GITHUB_TOKEN=your-github-token
   GITHUB_ORG=craft-templates

   # Vercel
   VERCEL_TOKEN=your-vercel-token
   VERCEL_TEAM_ID=your-team-id

   # Stripe
   STRIPE_PUBLIC_KEY=your-stripe-public-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-webhook-secret

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Set up Supabase database**
   ```bash
   # Run migrations
   npx supabase db push
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Templates

### 1. Stellar DEX
A decentralized exchange for trading Stellar assets with real-time price feeds and transaction history.

**Features:**
- Token swapping
- Price charts
- Transaction history
- Wallet integration
- Customizable asset pairs

### 2. Soroban DeFi
A DeFi platform built on Stellar's Soroban smart contract platform with liquidity pools and yield farming.

**Features:**
- Smart contract interactions
- Liquidity pools
- Yield farming
- Soroban RPC integration

### 3. Payment Gateway
Accept Stellar payments with multi-currency support, payment tracking, and invoice generation.

**Features:**
- Multi-currency support
- Payment tracking
- Invoice generation
- Transaction history

### 4. Asset Issuance
Create and manage custom Stellar assets with distribution management and trustline configuration.

**Features:**
- Custom asset creation
- Distribution management
- Trustline configuration
- Asset analytics

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Shadcn/ui** - UI components (coming soon)

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase** - PostgreSQL database with Auth
- **Zod** - Schema validation

### Blockchain
- **Stellar SDK** - Blockchain integration
- **Soroban** - Smart contract platform

### Infrastructure
- **Turborepo** - Monorepo management
- **Vercel** - Deployment platform
- **GitHub** - Version control and repository hosting
- **Stripe** - Payment processing

### Development
- **Vitest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in existing user
- `POST /api/auth/signout` - Sign out current user
- `GET /api/auth/user` - Get current user
- `PATCH /api/auth/profile` - Update user profile

### Templates
- `GET /api/templates` - List all templates (with filters)
- `GET /api/templates/[id]` - Get template details
- `GET /api/templates/[id]/metadata` - Get template metadata

### Payments
- `POST /api/payments/checkout` - Create Stripe checkout session
- `GET /api/payments/subscription` - Get subscription status
- `POST /api/payments/cancel` - Cancel subscription
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## 🗄️ Database Schema

### Tables
- **profiles** - User profiles with subscription info
- **templates** - Available DeFi templates
- **deployments** - User deployments
- **deployment_logs** - Deployment logs and status
- **customization_drafts** - Saved customizations
- **deployment_analytics** - Usage analytics

### Row-Level Security
All tables implement RLS policies to ensure users can only access their own data.

## 🔐 Security Features

- ✅ Row-Level Security (RLS) on all tables
- ✅ Encrypted sensitive data (API keys, tokens)
- ✅ Authentication token validation
- ✅ Rate limiting on API endpoints
- ✅ CSRF protection
- ✅ Input sanitization

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Testing
npm run test         # Run tests
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🙏 Acknowledgments

- [Stellar Development Foundation](https://stellar.org) - Blockchain infrastructure
- [Supabase](https://supabase.com) - Backend as a Service
- [Vercel](https://vercel.com) - Deployment platform
- [Stripe](https://stripe.com) - Payment processing

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for the Stellar ecosystem
