import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost";
	size?: "sm" | "md" | "lg" | "icon";
	loading?: boolean;
	state?: "idle" | "success" | "error";
};

export function Button({
	className,
	variant = "primary",
	size = "md",
	loading,
	state = "idle",
	disabled,
	children,
	...props
}: Props) {
	const base =
		"inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed";

	const variants = {
		// ALTERADO: De bg-black para bg-brand-gradient
		primary:
			"bg-brand-gradient text-white hover:opacity-90 shadow-blue-500/20 dark:shadow-none border border-transparent",
		secondary:
			"bg-white text-gray-800 border border-gray-300 hover:border-brand-400 hover:text-brand-600 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:border-brand-500 dark:hover:text-brand-400",
		ghost:
			"text-gray-700 hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-gray-800 shadow-none",
	};

	const sizes = {
		sm: "px-3 py-1.5 text-xs",
		md: "px-4 py-2 text-sm",
		lg: "px-6 py-3 text-base",
		icon: "p-2",
	};

	const states = {
		idle: "",
		success: "ring-2 ring-green-500",
		error: "ring-2 ring-red-500",
	};

	const content = loading ? "Carregando..." : children;

	return (
		<button
			className={twMerge(
				base,
				variants[variant],
				sizes[size],
				states[state],
				className,
			)}
			disabled={disabled || loading}
			{...props}
		>
			{content}
		</button>
	);
}

export default Button;
