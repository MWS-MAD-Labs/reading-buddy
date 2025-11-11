import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24">
        <header className="page-transition space-y-8 text-center md:text-left">
          <div className="inline-block rounded-2xl border-4 border-yellow-300 bg-yellow-400 px-6 py-2 shadow-lg">
            <p className="text-base font-black uppercase tracking-wide text-yellow-900">
              📚 Reading Buddy
            </p>
          </div>
          <h1 className="text-5xl font-black leading-tight text-purple-900 md:text-7xl">
            A Fun e-Library for{" "}
            <span className="rainbow-text">K-12 Schools!</span>
          </h1>
          <p className="text-xl font-semibold text-purple-700 md:max-w-2xl md:text-2xl">
            🎉 Self-host your books with MinIO, track progress with Supabase,
            and create AI-powered quizzes with Gemini! Everything students,
            teachers, librarians, and admins need in one amazing platform! ✨
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/login"
              className="btn-3d btn-squish rounded-3xl border-4 border-green-300 bg-gradient-to-r from-green-400 to-emerald-500 px-10 py-5 text-center text-xl font-black text-white shadow-2xl transition hover:from-green-500 hover:to-emerald-600"
            >
              🚀 Sign In with Google
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "🔐 Supabase Power",
              emoji: "⚡",
              description:
                "Secure authentication, database, and user management all in one!",
              color: "from-purple-100 to-pink-100",
              borderColor: "border-purple-300",
            },
            {
              title: "💾 MinIO Storage",
              emoji: "📦",
              description:
                "Self-host all your PDFs, covers, and files with full control!",
              color: "from-blue-100 to-cyan-100",
              borderColor: "border-blue-300",
            },
            {
              title: "🤖 AI Magic",
              emoji: "✨",
              description:
                "Generate fun quizzes automatically with Google Gemini AI!",
              color: "from-yellow-100 to-orange-100",
              borderColor: "border-yellow-300",
            },
          ].map((card) => (
            <article
              key={card.title}
              className={`sticker-card rounded-3xl border-4 ${card.borderColor} bg-gradient-to-br ${card.color} p-8 shadow-lg transition hover:scale-105 hover:shadow-2xl`}
            >
              <div className="mb-4 text-5xl">{card.emoji}</div>
              <h2 className="mb-3 text-2xl font-black text-purple-900">
                {card.title}
              </h2>
              <p className="text-base font-semibold text-purple-700">
                {card.description}
              </p>
            </article>
          ))}
        </section>

        <section className="pop-in rounded-3xl border-4 border-pink-300 bg-gradient-to-br from-pink-50 to-purple-50 p-8 text-center shadow-2xl">
          <h2 className="mb-4 text-4xl font-black text-purple-900">
            ✨ Perfect for Everyone! ✨
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { role: "🎒 Students", desc: "Read books & earn achievements!" },
              { role: "👨‍🏫 Teachers", desc: "Assign books & track progress!" },
              { role: "👩‍💼 Librarians", desc: "Manage the book collection!" },
              { role: "⚙️ Admins", desc: "Control everything easily!" },
            ].map((item) => (
              <div
                key={item.role}
                className="rounded-2xl border-4 border-purple-300 bg-white p-4 shadow-md"
              >
                <p className="text-xl font-black text-purple-600">
                  {item.role}
                </p>
                <p className="mt-2 text-sm font-bold text-purple-700">
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
