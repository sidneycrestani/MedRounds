import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Props = HTMLAttributes<HTMLDivElement> & {
	rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

export function Skeleton({ className, rounded = "md", ...props }: Props) {
	const r = {
		sm: "rounded",
		md: "rounded-md",
		lg: "rounded-lg",
		xl: "rounded-xl",
		full: "rounded-full",
	}[rounded];
	return (
		<div
			// MUDANÇA AQUI: Adicionado dark:bg-gray-700
			className={twMerge(
				"animate-pulse bg-gray-200 dark:bg-gray-700/50",
				r,
				className,
			)}
			{...props}
		/>
	);
}

export default Skeleton;
