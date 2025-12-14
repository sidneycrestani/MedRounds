import { clsx } from "clsx";
import { CheckCircle2, Circle, Lock } from "lucide-react";
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
			className={twMerge("flex gap-2 overflow-x-auto", className)}
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
						"px-3 py-2 rounded-lg text-sm font-medium border inline-flex items-center gap-2",
						clsx(
							item.status === "current"
								? "bg-black text-white border-black"
								: null,
							item.status === "mastered"
								? "bg-green-100 text-green-800 border-green-200"
								: null,
							item.status === "locked"
								? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
								: null,
							item.status === "pending" || !item.status
								? "bg-white text-gray-700 border-gray-300"
								: null,
							item.disabled ? "cursor-not-allowed" : null,
						),
					)}
				>
					{item.status === "mastered" ? (
						<CheckCircle2 size={14} />
					) : item.status === "locked" ? (
						<Lock size={14} />
					) : item.status === "pending" ? (
						<Circle size={14} />
					) : null}
					{item.label}
				</button>
			))}
		</div>
	);
}

export default NavigationTabs;
