interface JournalStatsProps {
    stats: {
        totalEntries: number;
        notesCount: number;
        booksWithNotes: number;
        readingSessions: number;
        quotesCount: number;
    };
}

export function JournalStats({ stats }: JournalStatsProps) {
    const statCards = [
        {
            label: "Total Entries",
            value: stats.totalEntries,
            icon: "📋",
            color: "from-indigo-400 to-purple-400",
        },
        {
            label: "Notes",
            value: stats.notesCount,
            icon: "📝",
            color: "from-amber-400 to-orange-400",
        },
        {
            label: "Books Noted",
            value: stats.booksWithNotes,
            icon: "📚",
            color: "from-sky-400 to-cyan-400",
        },
        {
            label: "Reading Sessions",
            value: stats.readingSessions,
            icon: "📖",
            color: "from-green-400 to-emerald-400",
        },
        {
            label: "Saved Quotes",
            value: stats.quotesCount,
            icon: "💬",
            color: "from-pink-400 to-rose-400",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-base`}
                        >
                            {stat.icon}
                        </div>
                    </div>
                    <p className="text-2xl font-black text-indigo-950">{stat.value}</p>
                    <p className="text-xs text-indigo-500">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}
