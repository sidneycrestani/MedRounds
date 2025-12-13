import type { TextareaHTMLAttributes } from "react";

type Props = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"onChange" | "value"
> & {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
};

export default function AnswerInput({
	value,
	onChange,
	disabled,
	...props
}: Props) {
	return (
		<div className="relative">
			<textarea
				className="w-full min-h-[200px] border border-gray-300 rounded-xl p-5 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm resize-y transition-all"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				{...props}
			/>
			<div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
				{value.length} caracteres
			</div>
		</div>
	);
}
