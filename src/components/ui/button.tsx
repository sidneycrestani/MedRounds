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
		// Primary: geralmente ok, pois é preto/branco, mas podemos ajustar hover
		primary:
			"bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200",

		// Secondary: Fundo branco vira fundo escuro, borda ajustada
		secondary:
			"bg-white text-gray-800 border border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-500",

		// Ghost: Hover ajustado para dark mode
		ghost:
			"text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
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
