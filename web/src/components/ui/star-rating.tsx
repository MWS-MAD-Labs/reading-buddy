"use client";

import { Star } from "lucide-react";

type StarRatingProps = {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
    showValue?: boolean;
};

const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
};

export function StarRating({
    value,
    onChange,
    readonly = false,
    size = "md",
    showValue = false,
}: StarRatingProps) {
    const stars = [1, 2, 3, 4, 5];
    const sizeClass = sizeClasses[size];

    const handleClick = (star: number) => {
        if (!readonly && onChange) {
            onChange(star);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
        if (!readonly && onChange && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onChange(star);
        }
    };

    return (
        <div className="inline-flex items-center gap-0.5">
            {stars.map((star) => {
                const filled = star <= value;
                const partial = !filled && star - 1 < value && value < star;
                const fillPercent = partial ? (value - (star - 1)) * 100 : 0;

                return (
                    <span
                        key={star}
                        onClick={() => handleClick(star)}
                        onKeyDown={(e) => handleKeyDown(e, star)}
                        tabIndex={readonly ? -1 : 0}
                        role={readonly ? "img" : "button"}
                        aria-label={readonly ? `${value} stars` : `Rate ${star} stars`}
                        className={`relative ${readonly ? "" : "cursor-pointer transition-transform hover:scale-110"
                            }`}
                    >
                        {/* Background (empty) star */}
                        <Star
                            className={`${sizeClass} text-gray-300`}
                            fill="transparent"
                            strokeWidth={1.5}
                        />
                        {/* Filled star overlay */}
                        {(filled || partial) && (
                            <Star
                                className={`${sizeClass} absolute inset-0 text-amber-400`}
                                fill="currentColor"
                                strokeWidth={0}
                                style={partial ? { clipPath: `inset(0 ${100 - fillPercent}% 0 0)` } : undefined}
                            />
                        )}
                    </span>
                );
            })}
            {showValue && value > 0 && (
                <span className="ml-1.5 text-sm font-semibold text-amber-600">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
}
