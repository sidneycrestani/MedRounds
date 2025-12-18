import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = HTMLAttributes<HTMLSpanElement> & {
	variant?: "default" | "outline" | "success" | "warning";
};

export function Badge({ className, variant = "default", ...props }: Props) {
	const base =
		"inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1";
	type Variant = NonNullable<Props["variant"]>;
	const variants: Record<Variant, string> = {
		default:
			"bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200 border border-brand-100 dark:border-brand-800",
		outline:
			"border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
		success:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		warning:
			"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
	};
	return (
		<span className={twMerge(base, variants[variant], className)} {...props} />
	);
}

export default Badge;
