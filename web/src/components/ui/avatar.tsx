"use client";

import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className = "", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
                {...props}
            />
        );
    }
);
Avatar.displayName = "Avatar";

export const AvatarImage = React.forwardRef<
    HTMLImageElement,
    React.ImgHTMLAttributes<HTMLImageElement>
>(({ className = "", alt, ...props }, ref) => {
    return (
        <img
            ref={ref}
            className={`aspect-square h-full w-full ${className}`}
            alt={alt}
            {...props}
        />
    );
});
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={`flex h-full w-full items-center justify-center rounded-full bg-slate-100 ${className}`}
            {...props}
        />
    );
});
AvatarFallback.displayName = "AvatarFallback";
