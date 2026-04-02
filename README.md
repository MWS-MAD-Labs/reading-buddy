# Reading Buddy

> A modern K-12 e-library platform with gamification, AI-powered quizzes, and role-based access for students, teachers, librarians, and administrators.

**Version:** 1.2.0  
**Status:** Production Ready ✓  
**Last Updated:** December 2025

---

## 📚 Overview

Reading Buddy transforms traditional school libraries into interactive digital learning experiences. Students read books, take AI-generated quizzes, earn badges, and track progress—while teachers monitor engagement and librarians manage the catalog.

### Key Features

**For Students 🎓**
- Interactive PDF reader with 3D flip-book experience
- Automatic reading progress tracking
- AI-generated comprehension quizzes
- Checkpoint quizzes at key moments
- Badge and achievement system
- Personalized book recommendations

**For Teachers 👨‍🏫**
- Create and manage classrooms
- Assign books and quizzes to students
- Real-time progress monitoring
- Quiz result analytics
- Student engagement dashboard
- Performance tracking

**For Librarians 📖**
- Upload and manage book catalog
- AI-powered quiz generation from PDFs
- Book metadata management (ISBN, authors, etc.)
- Grade-level access controls
- Bulk upload capabilities
- Text extraction from PDFs

**For Administrators 🛠️**
- User account management
- Role assignment and permissions
- System-wide analytics
- Multi-role dashboard access
- Broadcast announcements

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & Docker Compose
- **PostgreSQL** (included in docker-compose)
- **MinIO** server (self-hosted S3 storage)
- **AI Provider:** Google Gemini API key OR Local RAG/Diffuser setup

### Installation

```bash
# 1. Clone repository
git clone https://github.com/MWS-MAD-Labs/reading-buddy.git
cd reading-buddy

# 2. Configure environment
cp .env.example .env
nano .env  # Add your database, MinIO, and AI credentials

# 3. Start services
docker-compose -f docker-compose.selfhosted.yml up -d

# 4. Set up database
docker exec -i reading-buddy-postgres psql -U reading_buddy -d reading_buddy < sql/self-hosted/schema.sql

# 5. Create admin user
# Sign up via app, then set role to 'ADMIN' in database:
# docker exec -it reading-buddy-postgres psql -U reading_buddy -d reading_buddy
# UPDATE profiles SET role = 'ADMIN' WHERE email = 'your-email@example.com';

# 6. Access application
open http://localhost:3000
```

**📖 Detailed Setup:** See `notes/2024-12-14/deployment/DATABASE_SETUP.md` for self-hosted database provisioning details.

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | PostgreSQL (self-hosted) |
| **Auth** | NextAuth.js |
| **Storage** | MinIO (S3-compatible, self-hosted) |
| **AI** | Google Gemini 2.5 Flash OR Local RAG + Diffuser |
| **PDF** | pdfjs-dist, react-pdf, canvas rendering |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **CI/CD** | GitHub Actions, Docker, Komodo |
| **Monitoring** | Codecov (coverage), Lighthouse CI (performance) |

---

## 📂 Project Structure

```
reading-buddy/
├── web/                      # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & helpers
│   │   └── __tests__/       # Test files
│   ├── e2e/                 # Playwright E2E tests
│   └── public/              # Static assets
├── notes/                   # Documentation (organized by date)
│   └── 2024-12-14/
│       ├── deployment/      # CI/CD, Docker, Database docs
│       ├── development/     # Migration & implementation guides
│       └── roadmap/         # Feature roadmap & changelog
├── .claude/                 # AI assistant guidelines
├── docker-compose.yml       # Production deployment
└── Dockerfile              # Multi-stage build
```

---

## 📦 Version History

### v1.2.0 - December 2025 (Current)
**Complete CI/CD Pipeline & Quality Automation**

✨ **New Features:**
- Full CI/CD pipeline with GitHub Actions
- Automated testing (Unit, E2E, Coverage, Performance)
- Code coverage tracking with Codecov
- Lighthouse CI for performance monitoring
- Auto-deployment via Komodo webhooks
- Image versioning with multiple tags
- Pre-commit hooks for code quality

🔧 **Improvements:**
- Enhanced error handling in Supabase client
- Runtime environment variable support for Docker
- Comprehensive test suite
- Production-ready deployment configuration

📚 **Documentation:**
- Complete CI/CD setup guide
- Image versioning strategy
- Troubleshooting guides
- AI assistant guidelines

### v1.1.0 - November 2025
**Enhanced UX & Analytics**

- Student dashboard with stats cards
- Reading journey visualization
- Weekly challenge system
- Leaderboard for students and staff
- Teacher analytics dashboards
- Librarian statistics
- System-wide admin analytics

### v1.0.0 - October 2025
**Initial Production Release**

- Core reading platform
- AI-powered quiz generation
- Role-based access (Student, Teacher, Librarian, Admin)
- PDF reading with progress tracking
- Book management system
- Classroom management
- Badge system
- Supabase + MinIO architecture

**📜 Full History:** See `notes/2024-12-14/roadmap/CHANGELOG.md`

---

## 🗺️ Roadmap

### Upcoming Features

**v1.3.0 - Real-time Features** (Q1 2026)
- Live reading sessions
- Real-time leaderboard updates
- WebSocket-based notifications
- Collaborative reading modes

**v1.4.0 - Advanced AI** (Q2 2026)
- Personalized quiz difficulty
- Reading comprehension analysis
- Book recommendation engine
- Auto-generated summaries

**v2.0.0 - Multi-language & Accessibility** (Q3 2026)
- Multi-language support
- Enhanced accessibility features
- Mobile app (React Native)
- Offline reading mode

**🗺️ Complete Roadmap:** See `notes/2024-12-14/roadmap/Project-Roadmap.md`

---

## 🧪 Development

### Local Development

```bash
# Install dependencies
cd web && npm install

# Run dev server
npm run dev

# Run tests
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:coverage     # Coverage report

# Code quality
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run lint:fix          # Auto-fix issues

# Utility scripts
npm run render:book-images      # Render PDF pages
npm run extract:book-text       # Extract text from PDFs
npm run test:quiz-generation    # Test AI quiz generation
```

### Environment Variables

```env
# Database (PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=reading_buddy
DB_USER=reading_buddy
DB_PASSWORD=your-secure-password

# Or use DATABASE_URL
DATABASE_URL=postgresql://reading_buddy:password@postgres:5432/reading_buddy

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=reading-buddy

# AI Provider
AI_PROVIDER=cloud  # or 'local'

# Cloud AI (Gemini)
GEMINI_API_KEY=your-gemini-key

# Local AI (RAG + Diffuser)
RAG_API_URL=http://localhost:8000
DIFFUSER_API_URL=http://localhost:8001
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

**📝 Full Reference:** See `.env.example`

---

## 🚢 Deployment

### Production Deployment

```bash
# Build Docker image
docker build -t reading-companion .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### CI/CD Pipeline

Every push to `staging` or `main` triggers:

1. ✅ **ESLint** - Code quality
2. ✅ **TypeScript** - Type safety
3. ✅ **Unit Tests** - Business logic (Vitest)
4. ✅ **Code Coverage** - Track coverage trends (Codecov)
5. ✅ **E2E Tests** - User flows (Playwright)
6. ✅ **Lighthouse** - Performance & accessibility
7. ✅ **Docker Build** - Multi-platform image
8. ✅ **Push to GHCR** - GitHub Container Registry
9. ✅ **Auto-Deploy** - Komodo webhook deployment

**Total Pipeline Time:** ~10-15 minutes

**📋 Full Guide:** See `notes/2024-12-14/deployment/CI-CD.md`

---

## 🏛️ Architecture

### Hybrid Self-Hosted Approach

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│  NextAuth    │────▶│ PostgreSQL  │
│  Frontend   │     │  (Auth)      │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   MinIO     │────▶│  S3 Storage  │
│  (Files)    │     │  (PDFs, Imgs)│
└─────────────┘     └──────────────┘
       │
       │
       ▼
┌─────────────┐
│   Gemini /  │
│  Local RAG  │
│    (AI)     │
└─────────────┘
```

**Benefits:**
- ✅ Self-hosted database with full control
- ✅ Low-cost, self-hosted file storage
- ✅ Flexible AI provider options
- ✅ Scalable & maintainable
- ✅ No vendor lock-in

---

## 📚 Documentation

All documentation is organized by date in the `notes/` directory:

### Deployment Guides
- **[CI/CD Setup](notes/2024-12-14/deployment/CI-CD.md)** - Complete pipeline documentation
- **[Docker Guide](notes/2024-12-14/deployment/DOCKER.md)** - Container deployment
- **[Database Setup](notes/2024-12-14/deployment/DATABASE_SETUP.md)** - Supabase configuration
- **[Image Versioning](notes/2024-12-14/deployment/VERSIONING.md)** - Tag strategy

### Development Guides
- **[Migration Instructions](notes/2024-12-14/development/MIGRATION_INSTRUCTIONS.md)** - Data migration
- **[MOBI/AZW Implementation](notes/2024-12-14/development/MOBI_AZW_IMPLEMENTATION.md)** - eBook formats

### Roadmap & Planning
- **[Project Roadmap](notes/2024-12-14/roadmap/Project-Roadmap.md)** - Feature planning
- **[UX Improvements](notes/2024-12-14/roadmap/UX-IMPROVEMENT-ROADMAP.md)** - UI/UX enhancements
- **[Changelog](notes/2024-12-14/roadmap/CHANGELOG.md)** - Version history

### AI Guidelines
- **[Claude Guidelines](.claude/claude.md)** - AI assistant development guide

---

## 🤝 Contributing

We welcome contributions! Reading Buddy is actively developed and growing.

### Contribution Workflow

1. **Check the roadmap** - See what's planned in `notes/2024-12-14/roadmap/Project-Roadmap.md`
2. **Fork repository** - Create your own fork
3. **Create branch** - `git checkout -b feature/amazing-feature`
4. **Make changes** - Follow code style guidelines
5. **Run tests** - Ensure all tests pass
6. **Commit** - `git commit -m 'feat: Add amazing feature'`
7. **Push** - `git push origin feature/amazing-feature`
8. **Pull Request** - Open PR with detailed description

### Development Guidelines

- ✅ Follow TypeScript strict mode
- ✅ Write tests for new features
- ✅ Use Server Actions for mutations
- ✅ Respect Row Level Security (RLS)
- ✅ Document complex logic
- ✅ Update changelog

**📖 Full Guidelines:** See `.claude/claude.md`

---

## 🔒 Security

- **Row Level Security (RLS)** on all database tables
- **Server-side validation** for all mutations
- **Presigned URLs** for secure file access
- **Environment variables** for sensitive data
- **Role-based access control** throughout app
- **No client-side secrets** - all auth server-side

**Found a security issue?** Please email security@example.com (do not open public issue)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

This means you can:
- ✅ Use commercially
- ✅ Modify and distribute
- ✅ Use privately
- ✅ Sublicense

With requirements:
- 📝 Include original license
- 📝 State changes made

---

## 👥 Credits

**Developed by:** Faisal Nur Hidayat  
**AI Assistance:** Claude (Anthropic)  
**Contributors:** See [GitHub Contributors](../../graphs/contributors)

### Acknowledgments

- **Supabase** - Backend infrastructure
- **Vercel** - Next.js framework
- **Google** - Gemini AI
- **MinIO** - Object storage
- **Open Source Community** - Various libraries and tools

---

## 📞 Support

**Need Help?**
- 📖 **Documentation:** See `notes/` directory
- 🐛 **Bug Reports:** [GitHub Issues](../../issues)
- 💬 **Discussions:** [GitHub Discussions](../../discussions)
- 📧 **Email:** support@example.com

**Quick Links:**
- [Database Setup Guide](notes/2024-12-14/deployment/DATABASE_SETUP.md) - Start here!
- [CI/CD Documentation](notes/2024-12-14/deployment/CI-CD.md) - Deployment pipeline
- [Project Roadmap](notes/2024-12-14/roadmap/Project-Roadmap.md) - Future features
- [AI Guidelines](.claude/claude.md) - Development with AI

---

## 🌟 Star History

If you find Reading Buddy useful, please consider giving it a star on GitHub! ⭐

---

**Made with ❤️ for K-12 education**

*Reading Buddy - Making reading engaging, trackable, and fun!*
