import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost";
	loading?: boolean;
	state?: "idle" | "success" | "error";
};

export function Button({
	className,
	variant = "primary",
	loading,
	state = "idle",
	disabled,
	children,
	...props
}: Props) {
	const base =
		"inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-sm";
	type Variant = NonNullable<Props["variant"]>;
	const variants: Record<Variant, string> = {
		primary: "bg-black text-white hover:bg-gray-800",
		secondary:
			"bg-white text-gray-800 border border-gray-300 hover:border-gray-400",
		ghost: "text-gray-700 hover:bg-gray-100",
	};
	type BtnState = NonNullable<Props["state"]>;
	const states: Record<BtnState, string> = {
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
				states[state],
				clsx(disabled || loading ? "opacity-70 cursor-not-allowed" : null),
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
