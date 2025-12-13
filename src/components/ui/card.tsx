import type { HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Props = HTMLAttributes<HTMLDivElement> & {
	children?: ReactNode;
	variant?: "default" | "muted";
};

export function Card({
	className,
	children,
	variant = "default",
	...props
}: Props) {
	const base = "rounded-xl border shadow-sm";
	type Variant = NonNullable<Props["variant"]>;
	const variants: Record<Variant, string> = {
		default: "bg-white border-gray-100",
		muted: "bg-gray-100 border-gray-200",
	};
	return (
		<div className={twMerge(base, variants[variant], className)} {...props}>
			{children}
		</div>
	);
}

export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={twMerge("px-6 pt-6", className)} {...props} />;
}

export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3 className={twMerge("font-bold text-gray-900", className)} {...props} />
	);
}

export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={twMerge("px-6 pb-6", className)} {...props} />;
}

export default Card;
