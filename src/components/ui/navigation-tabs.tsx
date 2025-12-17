import { clsx } from "clsx";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type TabItem = {
	id: string | number;
	label: string;
	disabled?: boolean;
	status?: "locked" | "mastered" | "current" | "pending";
};

type Props = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
	items: TabItem[];
	activeIndex: number;
	onChange: (index: number) => void;
};

export function NavigationTabs({
	className,
	items,
	activeIndex,
	onChange,
	...props
}: Props) {
	return (
		<div
			className={twMerge("flex gap-2 overflow-x-auto pb-1", className)}
			{...props}
		>
			{items.map((item, idx) => (
				<button
					key={item.id}
					type="button"
					onClick={() =>
						!(item.status === "locked" || item.disabled) && onChange(idx)
					}
					className={twMerge(
						"px-3 py-2 rounded-lg text-sm font-medium border inline-flex items-center gap-2 transition-colors whitespace-nowrap",
						clsx(
							item.status === "current"
								? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
								: null,
							item.status === "mastered"
								? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800"
								: null,
							item.status === "locked"
								? "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700 cursor-not-allowed"
								: null,
							item.status === "pending" || !item.status
								? "bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
								: null,
							item.disabled ? "cursor-not-allowed opacity-70" : null,
						),
					)}
				>
					{item.status === "mastered" ? (
						<CheckCircle2 size={14} />
					) : item.status === "locked" ? (
						<Clock size={14} />
					) : item.status === "pending" || item.status === "current" ? (
						<Circle size={14} />
					) : null}
					{item.label}
				</button>
			))}
		</div>
	);
}

export default NavigationTabs;
