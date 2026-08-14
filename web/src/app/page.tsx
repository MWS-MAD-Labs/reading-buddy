import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Library,
  Sparkles,
} from "lucide-react";

import {
  Badge,
  Card,
  CardDescription,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const features = [
  {
    title: "Immersive Reading",
    description:
      "Read EPUBs and PDFs seamlessly with progress saved automatically across devices.",
    image: "/feature-books.svg",
    alt: "Books illustration",
    badge: "Readers",
    variant: "sky" as const,
    surface: "bg-[#EFF8FE]",
  },
  {
    title: "Fun & Rewards",
    description:
      "Earn XP, collect badges, and maintain streaks that make daily reading feel joyful.",
    image: "/feature-gamification.svg",
    alt: "Gamification illustration",
    badge: "Students",
    variant: "amber" as const,
    surface: "bg-[#FBF2DF]",
  },
  {
    title: "Classroom Tools",
    description:
      "Give teachers clear analytics on progress, engagement, and quiz performance.",
    image: "/feature-analytics.svg",
    alt: "Analytics illustration",
    badge: "Teachers",
    variant: "lime" as const,
    surface: "bg-[#EDF3EB]",
  },
  {
    title: "Smart Library",
    description:
      "Manage metadata, grade access, collections, and school-wide reading materials in one place.",
    image: "/feature-management.svg",
    alt: "Library management illustration",
    badge: "Librarians",
    variant: "bubble" as const,
    surface: "bg-[#F5E7E8]",
  },
  {
    title: "AI Companion",
    description:
      "Generate thoughtful quizzes from your books using Gemini or a local model.",
    image: "/feature-ai.svg",
    alt: "AI illustration",
    badge: "AI-assisted",
    variant: "sky" as const,
    surface: "bg-[#EFF8FE]",
  },
  {
    title: "For Everyone",
    description:
      "A unified platform for students, teachers, librarians, and admins with role-based dashboards.",
    image: "/feature-users.svg",
    alt: "Users illustration",
    badge: "School-wide",
    variant: "neutral" as const,
    surface: "bg-white",
  },
];

const stats = [
  { label: "Reading roles", value: "4" },
  { label: "Quiz support", value: "AI" },
  { label: "Hosting", value: "Self" },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] selection:bg-[#FBF2DF] selection:text-[#7E1518]">
      <header className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_20%_20%,rgba(214,161,58,0.24),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(184,221,248,0.55),transparent_36%),linear-gradient(135deg,#fffaf4_0%,#ffffff_54%,#eff8fe_100%)]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8 md:py-7">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="Reading Buddy home"
          >
            <span className="relative h-12 w-12 overflow-hidden rounded-[20px] border border-[#eadfda] bg-white shadow-[0_14px_30px_rgba(36,23,24,0.08)] transition duration-200 group-hover:-translate-y-0.5">
              <Image
                src="/logo.svg"
                alt=""
                fill
                className="object-cover p-1.5"
                priority
              />
            </span>
            <span className="heading-font text-xl font-black tracking-tight text-[#241718] md:text-2xl">
              Reading Buddy
            </span>
          </Link>

          <Link
            href="/login"
            className={buttonVariants({ variant: "neutral", size: "md" })}
          >
            Login
          </Link>
        </nav>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col items-start gap-7 text-left">
            <Badge
              variant="bubble"
              className="shadow-[0_10px_24px_rgba(126,21,24,0.08)]"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              MWS Heart & Purpose UI Kit
            </Badge>

            <div className="space-y-5">
              <h1 className="heading-font max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-[#241718] md:text-7xl lg:text-8xl">
                A warmer way to grow school readers.
              </h1>
              <p className="max-w-2xl text-lg font-semibold leading-8 text-[#5d4b4c] md:text-xl">
                Reading Buddy is a self-hosted e-library companion for schools:
                manage books, track progress, reward consistency, and spark
                curiosity with AI-powered quizzes.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/login"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Start reading now
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="#features"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Explore features
              </Link>
            </div>

            <div className="grid w-full max-w-xl grid-cols-3 gap-3 pt-2">
              {stats.map((stat) => (
                <Card
                  key={stat.label}
                  padding="snug"
                  className="rounded-3xl bg-white/80 text-center"
                >
                  <p className="heading-font text-2xl font-black text-[#7E1518] md:text-3xl">
                    {stat.value}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6b595a]">
                    {stat.label}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <Card
            variant="glow"
            padding="spacious"
            className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[40px]"
          >
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#B8DDF8]/45 blur-2xl" />
            <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#FBF2DF] blur-2xl" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Badge variant="amber">Today&apos;s reading plan</Badge>
                  <h2 className="heading-font mt-3 text-3xl font-black tracking-tight text-[#241718]">
                    Build a habit, one chapter at a time.
                  </h2>
                </div>
                <div className="rounded-3xl bg-[#7E1518] p-4 text-white shadow-[0_18px_36px_rgba(126,21,24,0.2)]">
                  <BookOpen className="h-8 w-8" aria-hidden="true" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-[#eadfda] bg-white/85 p-5">
                  <Library
                    className="mb-4 h-7 w-7 text-[#7E1518]"
                    aria-hidden="true"
                  />
                  <p className="heading-font text-lg font-black text-[#241718]">
                    Curated library
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#5d4b4c]">
                    Grade-ready access and collections for every classroom.
                  </p>
                </div>
                <div className="rounded-[28px] border border-[#eadfda] bg-white/85 p-5">
                  <GraduationCap
                    className="mb-4 h-7 w-7 text-[#6F8B6A]"
                    aria-hidden="true"
                  />
                  <p className="heading-font text-lg font-black text-[#241718]">
                    Visible growth
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#5d4b4c]">
                    Progress, badges, quizzes, and streaks students can
                    celebrate.
                  </p>
                </div>
              </div>

              <div className="rounded-[32px] border border-[#eadfda] bg-[#fffaf4]/90 p-5">
                <div className="mb-4 flex items-center justify-between text-sm font-bold text-[#5d4b4c]">
                  <span>Weekly class goal</span>
                  <span className="text-[#7E1518]">82%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#7E1518] to-[#D6A13A]" />
                </div>
              </div>
            </div>
          </Card>
        </section>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-10 md:px-8 md:pb-16">
        <section id="features" className="space-y-8 py-8 md:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline">Designed for the whole school</Badge>
            <h2 className="heading-font mt-4 text-4xl font-black tracking-tight text-[#241718] md:text-5xl">
              Everything your reading community needs.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[#5d4b4c] md:text-lg">
              The refreshed home page now follows the new kit: soft surfaces,
              rounded cards, burgundy accents, and gentle school-friendly
              illustration moments.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                variant="frosted"
                padding="cozy"
                className="group overflow-hidden rounded-[34px] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(36,23,24,0.1)]"
              >
                <div
                  className={cn(
                    "relative mb-6 h-40 overflow-hidden rounded-[28px]",
                    feature.surface,
                  )}
                >
                  <Image
                    src={feature.image}
                    alt={feature.alt}
                    fill
                    className="object-contain p-5 transition duration-500 group-hover:scale-105"
                  />
                </div>
                <Badge variant={feature.variant} size="sm">
                  {feature.badge}
                </Badge>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription className="mt-2">
                  {feature.description}
                </CardDescription>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eadfda] bg-white/65 px-5 py-8 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-sm font-bold text-[#6b595a] sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} MAD Labs by Millennia World School</p>
          <p className="text-[#7E1518]">
            Built for joyful, purposeful reading.
          </p>
        </div>
      </footer>
    </div>
  );
}
