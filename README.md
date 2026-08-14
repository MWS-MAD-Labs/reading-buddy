# 📚 Reading Buddy

> A modern K-12 e-library platform with gamification, AI-powered quizzes, and role-based access for students, teachers, librarians, and administrators. **Now fully self-hostable.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-20.10+-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

---

## 📖 Features

Reading Buddy transforms traditional school libraries into interactive digital learning experiences.

### For Students 🎓
- **Interactive Reader:** 3D flip-book experience for PDFs and native EPUB rendering.
- **Progress Tracking:** Automatic digital bookmarks plus validated physical-book page updates that synchronize across the dashboard, reader, and journal.
- **Gamification:** Earn XP, level up, and unlock 30+ achievement badges.
- **Challenges:** Weekly reading goals and global leaderboards.

### For Teachers 👨‍🏫
- **Classroom Management:** Create classes and monitor student rosters.
- **Assignments:** Assign specific books and quizzes with due dates.
- **Analytics:** Real-time performance heatmaps and engagement dashboards.

### For Librarians & Admins 📖
- **Catalog Management:** Bulk upload and meta-data management for multi-format books (PDF, EPUB, MOBI).
- **AI Quiz Generation:** Automatically generate comprehension quizzes from book content using Gemini AI.
- **System Control:** User role assignment, system-wide analytics, and broadcast announcements.

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | PostgreSQL 16 (Self-hosted with RLS) |
| **Auth** | NextAuth.js (v5 Beta) |
| **Storage** | MinIO (S3-compatible, self-hosted) |
| **AI** | Google Gemini 2.5 Flash OR Local RAG |
| **Infrastructure** | Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- **Docker** & Docker Compose
- **Google Gemini API Key** (for AI quizzes)
- **MinIO** (included in setup)

### Installation (Docker)

```bash
# 1. Clone repository
git clone https://github.com/MWS-MAD-Labs/reading-buddy.git
cd reading-buddy

# 2. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and NEXTAUTH_SECRET

# 3. Start services
docker-compose -f docker-compose.selfhosted.yml up -d

# 4. Access application
open http://localhost:3000
```

---

## 📂 Project Structure

```
reading-buddy/
├── web/                      # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities & helpers
├── sql/                     # Database migrations & schema
├── docs/                    # Self-hosted documentation
├── notes/                   # Development history & roadmaps
└── docker-compose.yml       # Production deployment
```

---

## 📚 Documentation

Detailed guides are available in the [docs/](docs/) directory:
- [Offline Reading Progress Synchronization](docs/features/OFFLINE_READING_PROGRESS_SYNC.md)
- [Installation Guide](docs/self-hosted/INSTALLATION.md)
- [Configuration Reference](docs/self-hosted/CONFIGURATION.md)
- [Database Schema](docs/self-hosted/DATABASE.md)
- [Troubleshooting](docs/self-hosted/TROUBLESHOOTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on our workflow and coding standards.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Developed by:** Faisal Nur Hidayat  
**AI Assistance:** Claude & Gemini  
*Made with ❤️ for K-12 education worldwide.*
