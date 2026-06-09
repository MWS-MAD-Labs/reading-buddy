"use client";

import * as React from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  showRecentSearches?: boolean;
  className?: string;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = "Search...",
  onSearch,
  suggestions = [],
  onSuggestionClick,
  showRecentSearches = true,
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(query, debounceMs);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  React.useEffect(() => {
    if (showRecentSearches && typeof window !== "undefined") {
      const stored = localStorage.getItem("recent-searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [showRecentSearches]);

  // Trigger search when debounced query changes
  React.useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(
      value.length > 0 || (showRecentSearches && recentSearches.length > 0),
    );
  };

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(false);
    onSearch("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
    onSuggestionClick?.(suggestion);

    // Add to recent searches
    if (showRecentSearches && typeof window !== "undefined") {
      const updated = [
        suggestion,
        ...recentSearches.filter((s: any) => s !== suggestion),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent-searches", JSON.stringify(updated));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "Enter" && query) {
      handleSuggestionClick(query);
    }
  };

  const displaySuggestions = query
    ? suggestions.filter((s: any) =>
        s.toLowerCase().includes(query.toLowerCase()),
      )
    : showRecentSearches
      ? recentSearches
      : [];

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7E1518]/55" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() =>
            setShowSuggestions(
              query.length > 0 ||
                (showRecentSearches && recentSearches.length > 0),
            )
          }
          onKeyDown={handleKeyDown}
          className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white py-3 pl-12 pr-12 text-base font-medium text-[#241718] placeholder:text-[#9b898a] transition-all focus:border-[#D6A13A]"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#7E1518]/55 transition-colors hover:bg-[#F5E7E8] hover:text-[#7E1518]"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && displaySuggestions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[#eadfda] bg-white card-shadow">
          <div className="max-h-64 overflow-y-auto">
            {!query && showRecentSearches && recentSearches.length > 0 && (
              <div className="border-b border-[#eadfda] px-4 py-2">
                <p className="heading-font text-xs font-bold uppercase tracking-wider text-[#7a5311]">
                  Recent Searches
                </p>
              </div>
            )}
            {displaySuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#241718] transition-colors hover:bg-[#F5E7E8]/60"
              >
                <div className="flex items-center gap-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-[#7E1518]/50" />
                  <span>
                    {query ? (
                      // Highlight matching text
                      <>
                        {suggestion
                          .split(new RegExp(`(${query})`, "gi"))
                          .map((part, i) =>
                            part.toLowerCase() === query.toLowerCase() ? (
                              <mark
                                key={i}
                                className="bg-[#FBF2DF] font-bold text-[#7a5311]"
                              >
                                {part}
                              </mark>
                            ) : (
                              <span key={i}>{part}</span>
                            ),
                          )}
                      </>
                    ) : (
                      suggestion
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
