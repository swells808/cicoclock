import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

export const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", children, className, ...props }, ref) => {
    const baseStyles =
      "text-base font-semibold cursor-pointer px-[21px] py-4 rounded-lg transition-colors";
    const variants = {
      primary:
        "bg-[#008000] text-white shadow-[0_4px_6px_rgba(0,0,0,0.1),0_10px_15px_rgba(0,0,0,0.1)] border-none hover:bg-[#006600]",
      secondary: "bg-[#4BA0F4] text-white border border-solid border-[#4BA0F4] hover:bg-[#3a8de0]",
      outline: "bg-transparent border border-white text-white hover:bg-white/10",
    };

    return (
      <button ref={ref} className={cn(baseStyles, variants[variant], className)} {...props}>
        {children}
      </button>
    );
  }
);

CustomButton.displayName = "CustomButton";
