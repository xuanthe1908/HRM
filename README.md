# HRM (Human Resource Management) System

![HRM System](https://img.shields.io/badge/HRM-System-blue.svg)
![Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Welcome to the HRM repository! This project is a modern Human Resource Management (HRM) system powered by [Supabase](https://supabase.com/) as the backend. It is maintained by [TDSolutionsHN](https://github.com/TDSolutionsHN).

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

## Features

### Core Features
- 👥 **Employee Profile Management** - Complete employee information system
- 📊 **Attendance & Leave Tracking** - Real-time attendance monitoring and leave management
- 💰 **Payroll & Salary Management** - Automated payroll processing and salary calculations
- 🔐 **Role-based Access Control** - Multi-level access (Admin, HR, Employee)
- 📈 **Reports & Analytics** - Comprehensive reporting dashboard
- 🔄 **Real-time Updates** - Live data synchronization with Supabase
- ⚙️ **Customizable Settings** - Flexible system configuration

### Advanced Features
- 📱 Responsive design for mobile and desktop
- 🔔 Real-time notifications
- 📋 Document management
- 🎯 Performance tracking
- 📅 Calendar integration
- 🔍 Advanced search and filtering

## Tech Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS / Material-UI
- **State Management:** Redux Toolkit / Zustand
- **Routing:** React Router v6

### Backend & Database
- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, RESTful API)
- **Database:** PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth with JWT
- **Real-time:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage for file uploads

### Development Tools
- **Package Manager:** npm / yarn / pnpm
- **Build Tool:** Vite / Create React App
- **Code Quality:** ESLint, Prettier
- **Type Checking:** TypeScript
- **Testing:** Jest, React Testing Library

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16.0.0 or higher)
- [npm](https://www.npmjs.com/) (version 8.0.0 or higher) or [yarn](https://yarnpkg.com/) (version 1.22.0 or higher)
- [Git](https://git-scm.com/)
- [Supabase](https://supabase.com/) account (free tier is sufficient)

### Setup Supabase Project

1. **Create a new Supabase project:**
   - Go to [Supabase](https://app.supabase.com/)
   - Click "New Project"
   - Fill in your project details
   - Wait for the project to be ready

2. **Get your project credentials:**
   - Navigate to Settings → API
   - Copy your Project URL and `anon` public API key
   - Note down your `service_role` key (for admin operations)

3. **Set up database schema:**
   ```sql
   -- Run the schema file in your Supabase SQL editor
   -- File location: /supabase/migrations/001_initial_schema.sql
   ```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TDSolutionsHN/HRM.git
   cd HRM
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   # Supabase Configuration
   REACT_APP_SUPABASE_URL=your-supabase-project-url
   REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
   REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Application Configuration
   REACT_APP_APP_NAME=HRM System
   REACT_APP_API_URL=https://your-api-domain.com
   REACT_APP_ENVIRONMENT=development
   ```

4. **Run database migrations:**
   ```bash
   # If using Supabase CLI
   npx supabase db push
   
   # Or run the SQL files manually in Supabase Dashboard
   ```

5. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

6. **Start the development server:**
   ```bash
   npm start
   # or
   yarn dev
   # or
   pnpm dev
   ```

7. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - The app should be running successfully!

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL | Yes |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `REACT_APP_SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | No |
| `REACT_APP_APP_NAME` | Application display name | No |
| `REACT_APP_ENVIRONMENT` | Environment (development/staging/production) | No |

### Supabase Configuration

Ensure your Supabase project has:
- ✅ Authentication enabled
- ✅ Row Level Security (RLS) policies configured
- ✅ Required tables and relationships set up
- ✅ Storage buckets for file uploads

## Project Structure

```
HRM/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Application pages/routes
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services and Supabase client
│   ├── store/            # State management
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── styles/           # Global styles and themes
├── supabase/
│   ├── migrations/       # Database migration files
│   ├── functions/        # Edge functions
│   └── seed/            # Database seed files
├── docs/                 # Documentation
├── tests/               # Test files
└── package.json
```

## Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Database operations
npm run db:reset        # Reset database
npm run db:seed         # Seed with sample data
npm run db:migrate      # Run migrations
```

### Development Guidelines

1. **Code Style:** Follow the established ESLint and Prettier configurations
2. **Commits:** Use conventional commit messages
3. **Testing:** Write tests for new features and bug fixes
4. **Documentation:** Update documentation for significant changes

## API Documentation

### Authentication Endpoints
```typescript
// Login
POST /auth/login
Body: { email: string, password: string }

// Register
POST /auth/register
Body: { email: string, password: string, full_name: string }

// Logout
POST /auth/logout
```

### Employee Endpoints
```typescript
// Get all employees
GET /employees

// Get employee by ID
GET /employees/:id

// Create employee
POST /employees
Body: EmployeeCreateData

// Update employee
PUT /employees/:id
Body: EmployeeUpdateData
```

For complete API documentation, visit `/docs/api.md`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- --testPathPattern=components/Employee
```

### Testing Strategy
- **Unit Tests:** Component logic and utilities
- **Integration Tests:** API interactions and workflows
- **E2E Tests:** Critical user journeys

## Deployment

### Production Build

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Deployment Options

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Netlify**
   ```bash
   npm run build
   # Drag and drop the build folder to Netlify
   ```

3. **Traditional Hosting**
   - Build the project: `npm run build`
   - Upload the `build` folder to your hosting provider

### Environment Setup

Ensure production environment variables are properly configured in your hosting platform.

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Project**
2. **Create your Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## Troubleshooting

### Common Issues

**Issue: Supabase connection errors**
- ✅ Check your environment variables
- ✅ Verify your Supabase project is active
- ✅ Ensure your API keys are correct

**Issue: Authentication not working**
- ✅ Check if authentication is enabled in Supabase
- ✅ Verify your redirect URLs are configured
- ✅ Check browser console for errors

**Issue: Database queries failing**
- ✅ Check Row Level Security (RLS) policies
- ✅ Verify table permissions
- ✅ Check if tables exist and have correct structure

### Getting Help
- 📚 Check our [documentation](./docs/)
- 🐛 [Report bugs](https://github.com/TDSolutionsHN/HRM/issues)
- 💬 [Join discussions](https://github.com/TDSolutionsHN/HRM/discussions)

## License

Distributed under the MIT License. See `LICENSE` for more information.
