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
- **AI:** Google Gemini 2.5 Flash
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

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your credentials
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application**
   Open http://localhost:3000

See [DOCKER.md](DOCKER.md) for detailed deployment instructions.

## Documentation

- [Project Roadmap](Project-Roadmap.md) - Development phases and progress
- [Docker Deployment](DOCKER.md) - Production deployment guide
- [AI Development Guide](AI-Readme.md) - Architecture and development guidelines
- [Admin Panel](web/ADMIN_PANEL.md) - Admin features documentation
- [Database Migrations](migrations/README.md) - Database schema updates
- [Changelog](CHANGELOG.md) - Version history and release notes

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
- Google Gemini API key
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

This project was developed as an MVP for K-12 schools. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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
