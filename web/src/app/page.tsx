import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:gap-16 md:px-6 md:py-24">
        <header className="page-transition space-y-6 text-center md:space-y-8 md:text-left">
          <div className="inline-block rounded-2xl border-4 border-yellow-300 bg-yellow-400 px-5 py-2 shadow-lg md:px-6">
            <p className="text-sm font-black uppercase tracking-wide text-yellow-900 md:text-base">
              Reading Buddy
            </p>
          </div>
          <h1 className="text-4xl font-black leading-tight text-purple-900 md:text-5xl lg:text-7xl">
            A focused e-Library for{" "}
            <span className="rainbow-text">K-12 schools</span>
          </h1>
          <p className="text-lg font-semibold text-purple-700 md:max-w-2xl md:text-xl lg:text-2xl">
            Self-host your books with MinIO, track progress with Supabase, and
            create AI-powered quizzes with Gemini. Built for students, teachers,
            librarians, and admins.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/login"
              className="btn-3d btn-squish min-h-[56px] rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-8 py-4 text-center text-lg font-black text-white shadow-2xl transition hover:from-green-500 hover:to-emerald-600 active:scale-95 md:px-10 md:py-5 md:text-xl"
            >
              Sign in with Google
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {[
            {
              title: "Supabase foundation",
              description:
                "Secure authentication, database, and user management in one stack.",
              color: "from-purple-100 to-pink-100",
              borderColor: "border-purple-300",
            },
            {
              title: "MinIO storage",
              description:
                "Self-host PDFs, covers, and files with full control.",
              color: "from-blue-100 to-cyan-100",
              borderColor: "border-blue-300",
            },
            {
              title: "AI assistance",
              description:
                "Generate quizzes automatically with Google Gemini AI.",
              color: "from-yellow-100 to-orange-100",
              borderColor: "border-yellow-300",
            },
          ].map((card) => (
            <article
              key={card.title}
              className={`sticker-card rounded-3xl border-4 ${card.borderColor} bg-gradient-to-br ${card.color} p-6 shadow-lg transition hover:scale-105 hover:shadow-2xl md:p-8`}
            >
              <h2 className="mb-2 text-xl font-black text-purple-900 md:mb-3 md:text-2xl">
                {card.title}
              </h2>
              <p className="text-sm font-semibold text-purple-700 md:text-base">
                {card.description}
              </p>
            </article>
          ))}
        </section>

        <section className="pop-in rounded-3xl border-4 border-pink-300 bg-gradient-to-br from-pink-50 to-purple-50 p-6 text-center shadow-2xl md:p-8">
          <h2 className="mb-3 text-3xl font-black text-purple-900 md:mb-4 md:text-4xl">
            Built for every role
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-6 lg:grid-cols-4">
            {[
              { role: "Students", desc: "Read books and earn achievements." },
              { role: "Teachers", desc: "Assign books and track progress." },
              { role: "Librarians", desc: "Manage the book collection." },
              { role: "Admins", desc: "Control configuration and access." },
            ].map((item) => (
              <div
                key={item.role}
                className="rounded-2xl border-4 border-purple-300 bg-white p-4 shadow-md transition hover:shadow-lg"
              >
                <p className="text-lg font-black text-purple-600 md:text-xl">
                  {item.role}
                </p>
                <p className="mt-2 text-xs font-bold text-purple-700 md:text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
