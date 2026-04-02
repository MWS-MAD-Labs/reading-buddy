# 📚 Reading Buddy - Self-Hosted Edition

A modern K-12 e-library platform with gamification, AI-powered quizzes, and role-based access. Now fully self-hostable!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-20.10+-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

---

## ✨ Features

### 📖 Reading Experience
- **Multi-format support:** PDF, EPUB, MOBI, AZW, AZW3
- **Progress tracking:** Bookmarks, reading statistics
- **Checkpoint quizzes:** Test comprehension at key moments
- **Mobile-responsive:** Read anywhere, any device

### 🎮 Gamification
- **XP and Levels:** Earn experience points for reading
- **Badges:** 30+ achievements to unlock
- **Reading Streaks:** Build daily reading habits
- **Leaderboards:** Compete with classmates
- **Challenges:** Weekly and monthly reading goals

### 🏫 Classroom Management
- **Teacher Dashboard:** Assign books, create quizzes
- **Student Progress:** Monitor reading and quiz performance
- **Class Management:** Organize students by grade/class
- **Book Assignments:** Assign reading with due dates

### 🤖 AI-Powered Quizzes
- **Auto-generate quizzes** from book content
- **Multiple question types:** Multiple choice, true/false
- **Instant grading:** Automatic scoring
- **Performance analytics:** Track student understanding

### 👥 Multi-Role System
- **Students:** Read books, take quizzes, earn badges
- **Teachers:** Create classes, assign books, monitor progress
- **Librarians:** Manage book catalog, upload content
- **Admins:** Full system control

---

## 🚀 Quick Start

### One-Command Setup

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd reading-buddy
./scripts/quick-start.sh
```

Then visit **http://localhost:3000**

### Manual Setup

```bash
# 1. Create configuration
cp .env.selfhosted.example .env

# 2. Generate secrets
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .env

# 3. Start services
docker compose -f docker-compose.selfhosted.yml up -d

# 4. Access application
open http://localhost:3000
```

See [Quick Start Guide](docs/self-hosted/QUICK_START.md) for details.

---

## 📋 Requirements

### Minimum

- **OS:** Linux, macOS, Windows (with WSL2)
- **Docker:** 20.10+ with Compose 2.0+
- **RAM:** 2GB
- **Disk:** 50GB
- **CPU:** 2 cores

### Recommended

- **RAM:** 4GB+
- **Disk:** 100GB+ SSD
- **CPU:** 4 cores
- **Network:** 100 Mbps+

### Optional

- Domain name with SSL
- Google OAuth credentials
- Gemini API key (AI quizzes)
- SMTP server (password reset)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          Reading Buddy Stack            │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │  Next.js 15 Application          │  │
│  │  - React 19                       │  │
│  │  - TypeScript                     │  │
│  │  - NextAuth.js                    │  │
│  └──────────────────────────────────┘  │
│                 ↓                        │
│  ┌──────────────────────────────────┐  │
│  │  PostgreSQL 16                   │  │
│  │  - Row Level Security             │  │
│  │  - Gamification Functions         │  │
│  └──────────────────────────────────┘  │
│                 ↓                        │
│  ┌──────────────────────────────────┐  │
│  │  MinIO Object Storage            │  │
│  │  - Books (PDF, EPUB, etc.)       │  │
│  │  - Cover images                   │  │
│  └──────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

**Tech Stack:**
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** NextAuth.js, PostgreSQL 16
- **Storage:** MinIO (S3-compatible)
- **AI:** Google Gemini 2.5 Flash or Local RAG
- **Deployment:** Docker Compose

---

## 📦 What's Included

### Pre-configured Services

1. **PostgreSQL** - Relational database with RLS
2. **MinIO** - S3-compatible object storage
3. **Next.js App** - Web application

### Database Features

- ✅ 19 tables with relationships
- ✅ Row Level Security (RLS) on all tables
- ✅ Gamification functions (XP, badges, streaks)
- ✅ Automatic profile creation
- ✅ Comprehensive indexes
- ✅ Database triggers

### Authentication

- ✅ Email/password signup
- ✅ Google OAuth (optional)
- ✅ Email verification
- ✅ Password reset
- ✅ Session management
- ✅ Domain restrictions (@yourschool.com)

---

## 🔧 Configuration

### Required Environment Variables

```bash
DB_PASSWORD=your-secure-password
NEXTAUTH_SECRET=your-nextauth-secret
MINIO_SECRET_KEY=your-minio-password
```

### Optional Configuration

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# AI Provider
AI_PROVIDER=cloud
GOOGLE_GEMINI_API_KEY=your-api-key
cek
# Email
EMAIL_SERVER=smtp://user:pass@smtp.gmail.com:587
EMAIL_FROM=noreply@yourdomain.com
```

See [Configuration Guide](docs/self-hosted/CONFIGURATION.md) for all options.

---

## 📚 Documentation

### Getting Started

- [Quick Start Guide](docs/self-hosted/QUICK_START.md) - Get running in 5 minutes
- [Installation Guide](docs/self-hosted/INSTALLATION.md) - Detailed setup instructions
- [Configuration Guide](docs/self-hosted/CONFIGURATION.md) - Environment variables

### Deployment

- [Production Deployment](docs/self-hosted/DEPLOYMENT.md) - SSL, domain, reverse proxy
- [Docker Guide](docs/self-hosted/DOCKER.md) - Container management
- [Backup & Restore](docs/self-hosted/BACKUP.md) - Data safety

### Administration

- [User Management](docs/self-hosted/USER_MANAGEMENT.md) - Add users, roles
- [Book Management](docs/self-hosted/BOOK_MANAGEMENT.md) - Upload and organize books
- [Troubleshooting](docs/self-hosted/TROUBLESHOOTING.md) - Common issues

### Development

- [Architecture](notes/2024-12-14/development/SELF_HOSTED_ARCHITECTURE.md) - System design
- [Database Schema](docs/self-hosted/DATABASE.md) - Tables and relationships
- [API Reference](docs/self-hosted/API.md) - Endpoints
- [Contributing](CONTRIBUTING.md) - How to contribute

---

## 🎯 Use Cases

### Schools & Libraries

- **Digital Library:** Replace physical books with e-books
- **Reading Programs:** Track summer reading, book clubs
- **Literacy Initiatives:** Monitor student progress
- **Remote Learning:** Access books from home

### Homeschooling

- **Curriculum Management:** Organize reading materials
- **Progress Tracking:** Monitor multiple children
- **Gamification:** Motivate reluctant readers

### Educational Institutions

- **University Libraries:** E-book access for students
- **Teacher Training:** Reading comprehension tools
- **Research Projects:** Organize academic papers

---

## 🔒 Security

### Built-in Security Features

- ✅ **Row Level Security (RLS)** on all database tables
- ✅ **Password hashing** with bcrypt
- ✅ **Session-based authentication**
- ✅ **CSRF protection**
- ✅ **SQL injection prevention**
- ✅ **XSS protection**
- ✅ **Environment variable secrets**

### Best Practices

- Use strong passwords (20+ characters)
- Enable HTTPS in production
- Regular security updates
- Automated backups
- Firewall configuration
- Access logging

See [Security Guide](docs/self-hosted/SECURITY.md) for details.

---

## 🚢 Deployment Options

### Local Development

```bash
docker compose -f docker-compose.selfhosted.yml up -d
```

### Production (VPS)

Recommended providers:
- **Hetzner Cloud** - €9/month (2 vCPU, 4GB RAM)
- **DigitalOcean** - $24/month (2 vCPU, 4GB RAM)
- **AWS Lightsail** - $24/month (2 vCPU, 4GB RAM)

### Self-Hosted (Home Server)

- Old laptop or desktop
- Raspberry Pi 4 (8GB model)
- NAS with Docker support

### Kubernetes (Advanced)

See [Kubernetes Guide](docs/self-hosted/KUBERNETES.md)

---

## 📊 Performance

### Benchmarks

- **Response Time:** <200ms (local network)
- **Concurrent Users:** 100+ (2GB RAM)
- **Book Upload:** ~5 seconds (50MB PDF)
- **Page Render:** ~1 second (200-page book)
- **Database Queries:** <50ms (indexed tables)

### Optimization Tips

- Use SSD for database storage
- Enable PostgreSQL connection pooling
- Configure Redis caching (optional)
- CDN for static assets (production)

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/<your-org>/<your-repo>.git
cd reading-buddy

# Start development environment
docker compose -f docker-compose.selfhosted.yml up -d

# Install dependencies
cd web
npm install

# Run development server
npm run dev
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

**Commercial Use:** ✅ Allowed  
**Modification:** ✅ Allowed  
**Distribution:** ✅ Allowed  
**Private Use:** ✅ Allowed

---

## 🙏 Acknowledgments

- **Next.js** - React framework
- **PostgreSQL** - Relational database
- **MinIO** - Object storage
- **NextAuth.js** - Authentication
- **Tailwind CSS** - Styling
- **React PDF** - PDF rendering
- **Google Gemini** - AI quiz generation

---

## 📞 Support

### Community Support

- **GitHub Issues:** [Report bugs](../../issues)
- **Discussions:** [Ask questions](../../discussions)
- **Discord:** [Join community](https://discord.gg/reading-buddy) _(coming soon)_

### Documentation

- [Quick Start](docs/self-hosted/QUICK_START.md)
- [FAQ](docs/self-hosted/FAQ.md)
- [Troubleshooting](docs/self-hosted/TROUBLESHOOTING.md)

---

## 🗺️ Roadmap

### Version 2.1 (Q1 2025)

- [ ] Mobile apps (iOS, Android)
- [ ] Offline reading support
- [ ] Enhanced analytics dashboard
- [ ] Multi-language support (i18n)

### Version 2.2 (Q2 2025)

- [ ] Advanced AI features (book recommendations)
- [ ] Social features (book clubs, discussions)
- [ ] Parent portal
- [ ] API for third-party integrations

### Version 3.0 (Q3 2025)

- [ ] Multi-tenant support (host multiple schools)
- [ ] White-label customization
- [ ] Advanced reporting tools
- [ ] Integration marketplace

See [Project Roadmap](notes/2024-12-14/roadmap/Project-Roadmap.md) for details.

---

## 📈 Stats

- **19 Database Tables** with full RLS
- **30+ Achievement Badges**
- **4 User Roles** (Student, Teacher, Librarian, Admin)
- **5 Book Formats** (PDF, EPUB, MOBI, AZW, AZW3)
- **100% Open Source**

---

## ⭐ Star History

If you find Reading Buddy useful, please star the repository!

---

**Made with ❤️ for educators and students worldwide**

**Deploy your own Reading Buddy today and start building a love for reading! 📚✨**

---

## Quick Links

- [📖 Quick Start](docs/self-hosted/QUICK_START.md)
- [🚀 Deployment Guide](docs/self-hosted/DEPLOYMENT.md)
- [🔧 Configuration](docs/self-hosted/CONFIGURATION.md)
- [❓ FAQ](docs/self-hosted/FAQ.md)
- [🐛 Report Issue](../../issues)
