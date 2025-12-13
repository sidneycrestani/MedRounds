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
		default: "bg-blue-100 text-blue-800",
		outline: "border border-gray-300 text-gray-700",
		success: "bg-green-100 text-green-800",
		warning: "bg-orange-100 text-orange-800",
	};
	return (
		<span className={twMerge(base, variants[variant], className)} {...props} />
	);
}

export default Badge;
