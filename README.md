# Reading Buddy

A modern K-12 e-library platform with gamification, AI-powered quizzes, and role-based access for students, teachers, librarians, and administrators.

## Features

### For Students
- Browse and read books with an interactive PDF reader
- 3D flip-book reading experience with rendered page images
- Track reading progress automatically
- Take AI-generated quizzes to test comprehension
- Complete checkpoint quizzes while reading
- View assigned books from teachers
- Earn badges and achievements

### For Teachers
- Create and manage classrooms
- Assign books to students and classrooms
- Assign quizzes for assessment
- Track student reading progress in real-time
- View quiz results and analytics
- Monitor classroom engagement

### For Librarians
- Upload books (PDF) with cover images
- Manage book metadata (ISBN, author, publisher, etc.)
- Set access levels for different grade groups
- Generate AI-powered quizzes from book content
- Create checkpoint quizzes at specific pages
- Extract text from PDFs for better AI quiz generation
- Generate book descriptions with AI

### For Administrators
- Manage user accounts and roles
- Assign roles (Student, Teacher, Librarian, Admin)
- System-wide oversight and analytics
- Access all dashboards and features

## Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Storage:** MinIO (self-hosted S3-compatible)
- **AI:** Configurable (Gemini 2.5 Flash cloud or local RAG + Diffuser)
- **PDF Processing:** pdfjs-dist, react-pdf, canvas
- **Deployment:** Docker

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Supabase account
- MinIO server (self-hosted)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/faisalnh/reading-companion.git
   cd reading-companion
   ```

2. **Set up Supabase database**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the `database-setup.sql` script in Supabase SQL Editor
   - See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your credentials (Supabase, MinIO, AI provider)
   ```
   - Set `AI_PROVIDER` to `cloud` (Gemini) or `local` (RAG + Diffuser) and fill in the required keys/URLs.

4. **Deploy with Docker**
   ```bash
   docker-compose up --build -d
   ```

5. **Create your first admin user**
   - Sign up through the app
   - Manually set your role to 'ADMIN' in Supabase Table Editor → profiles

6. **Access the application**
   Open http://localhost:3000

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for database setup and [DOCKER.md](DOCKER.md) for deployment instructions.

## Documentation

- [Database Setup Guide](DATABASE_SETUP.md) - **Start here!** Complete database setup instructions
- [Project Roadmap](Project-Roadmap.md) - **Complete roadmap** from v1.0.0 to v2.0.0+ with detailed feature planning
- [Changelog](CHANGELOG.md) - **Version history** and detailed release notes
- [Docker Deployment](DOCKER.md) - Production deployment guide
- [AI Provider Migration](web/docs/AI_PROVIDER_MIGRATION.md) - Configure `AI_PROVIDER` for cloud or local AI
- [AI Development Guide](AI-Readme.md) - Architecture and development guidelines
- [Admin Panel](web/ADMIN_PANEL.md) - Admin features documentation

## Development

```bash
# Install dependencies
cd web && npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run utility scripts
npm run render:book-images  # Render PDF pages to images
npm run extract:book-text   # Extract text from PDFs
npm run test:quiz-generation  # Test AI quiz generation
```

## Environment Variables

See [.env.example](.env.example) for all required environment variables:
- Supabase URL and keys (public + service role)
- MinIO endpoint and credentials
- AI provider switch (`AI_PROVIDER=cloud|local`)
- Cloud: `GEMINI_API_KEY` for Gemini 2.5 Flash
- Local: `RAG_API_URL`, `DIFFUSER_API_URL`, and `NEXT_PUBLIC_RAG_API_URL`
- Port configuration

## Architecture

Reading Buddy uses a hybrid backend architecture:
- **Supabase**: PostgreSQL database, authentication, RLS policies
- **MinIO**: Self-hosted object storage for PDFs and images
- **Next.js Server Actions**: Secure API layer
- **Google Gemini**: AI-powered quiz and description generation

This architecture provides:
- Developer-friendly managed backend (Supabase)
- Low-cost, high-control storage (MinIO)
- Secure file handling with presigned URLs
- Scalable AI integration

## Contributing

Reading Buddy v1.0.0 is complete! We welcome contributions for future versions.

**Before contributing:**
- Check the [Project Roadmap](Project-Roadmap.md) to see planned features
- Review the [Changelog](CHANGELOG.md) for recent changes
- Open a GitHub Discussion for new feature ideas

**Contribution workflow:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See the [Contribution Guidelines](Project-Roadmap.md#10-contribution-guidelines) in the roadmap for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

Developed by Faisal Nur Hidayat with AI assistance from Claude (Anthropic).

## Support

For issues and questions:
- GitHub Issues: https://github.com/faisalnh/reading-companion/issues
- Documentation: See project documentation files

---

**Version:** 1.0.0  
**Status:** Production Ready ✓
