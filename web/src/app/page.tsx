import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 selection:bg-pink-200 selection:text-pink-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white shadow-sm md:h-12 md:w-12">
            <Image src="/logo.svg" alt="Reading Buddy Logo" fill className="object-cover p-1" />
          </div>
          <span className="text-xl font-black text-slate-800 md:text-2xl">
            Reading Buddy
          </span>
        </div>
        <Link
          href="/login"
          className="rounded-2xl border-2 border-slate-900 bg-white px-6 py-2.5 text-base font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:translate-y-0"
        >
          Login
        </Link>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-4 py-16 text-center md:gap-24 md:px-6 md:py-24">
        {/* Hero Section */}
        <header className="flex flex-col items-center gap-8 md:gap-10">
          <div className="inline-block rounded-full bg-pink-100 px-6 py-2 shadow-sm">
            <p className="text-sm font-extrabold tracking-wider text-pink-600 uppercase">
              ✨ The Friendly School Library
            </p>
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[1.1] text-slate-900 md:text-7xl lg:text-8xl">
            Make reading <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 underline-offset-8">fun</span> again.
          </h1>

          <p className="max-w-2xl text-xl font-medium leading-relaxed text-slate-600 md:text-2xl">
            A self-hosted e-library companion for your school.
            Manage books, track progress, and spark curiosity with AI-powered quizzes.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-purple-600 to-pink-500 px-10 py-5 text-xl font-black text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:opacity-90"
            >
              <span className="relative z-10">Start Reading Now</span>
            </Link>
          </div>
        </header>

        {/* Features Grids */}
        <section className="width-full grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Books */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-pink-50">
              <Image src="/feature-books.svg" alt="Books Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">Immersive Reading</h3>
              <p className="font-medium text-slate-500">
                Read EPUBs and PDFs seamlessly. Progress is saved automatically across devices.
              </p>
            </div>
          </div>

          {/* Card 2: Gamification */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-orange-50">
              <Image src="/feature-gamification.svg" alt="Gamification Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">Fun & Rewards</h3>
              <p className="font-medium text-slate-500">
                Earn XP, collect badges, and maintain streaks. Reading has never been this rewarding.
              </p>
            </div>
          </div>

          {/* Card 3: Analytics */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-emerald-50">
              <Image src="/feature-analytics.svg" alt="Analytics Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">Classroom Tools</h3>
              <p className="font-medium text-slate-500">
                Teachers get detailed analytics on student progress, engagement, and quiz performance.
              </p>
            </div>
          </div>

          {/* Card 4: Management */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-sky-50">
              <Image src="/feature-management.svg" alt="Management Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">Smart Library</h3>
              <p className="font-medium text-slate-500">
                Librarians can manage metadata, set access levels by grade, and curate collections easily.
              </p>
            </div>
          </div>

          {/* Card 5: AI */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-purple-50">
              <Image src="/feature-ai.svg" alt="AI Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">AI Companion</h3>
              <p className="font-medium text-slate-500">
                Automatically generate quizzes from your school books using Gemini or a Local Model.
              </p>
            </div>
          </div>

          {/* Card 6: Users */}
          <div className="group flex flex-col gap-4 rounded-[40px] border border-white/50 bg-white/60 p-8 shadow-xl backdrop-blur-sm transition-transform hover:scale-[1.02]">
            <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-indigo-50">
              <Image src="/feature-users.svg" alt="Users Illustration" fill className="object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className="text-left">
              <h3 className="mb-2 text-2xl font-black text-slate-800">For Everyone</h3>
              <p className="font-medium text-slate-500">
                A unified platform for students, teachers, and admins with role-based dashboards.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-slate-400 font-bold">
          <p>© {new Date().getFullYear()} MAD Labs by Millennia World School</p>
        </footer>
      </main>
    </div>
  );
}
