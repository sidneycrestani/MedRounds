import { clsx } from "clsx";
import type { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type TabItem = {
	id: string | number;
	label: string;
	disabled?: boolean;
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
					onClick={() => !item.disabled && onChange(idx)}
					className={twMerge(
						"px-3 py-2 rounded-lg text-sm font-medium border",
						clsx(
							activeIndex === idx
								? "bg-black text-white border-black"
								: "bg-white text-gray-700 border-gray-300",
							item.disabled ? "opacity-50 cursor-not-allowed" : null,
						),
					)}
				>
					{item.label}
				</button>
			))}
		</div>
	);
}

export default NavigationTabs;
