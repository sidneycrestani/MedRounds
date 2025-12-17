import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash } from "lucide-react";
import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type Props = HTMLAttributes<HTMLDivElement> & {
	caseId: number;
	title: string;
	vignette: string;
	media?: string;
};

export default function CaseVignette({
	caseId,
	title,
	vignette,
	media,
	...props
}: Props) {
	return (
		<Card {...props}>
			<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
				<CardTitle>{title}</CardTitle>

				<div
					className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-mono text-xs font-medium select-all hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-default"
					title="Case ID"
				>
					<Hash className="w-3 h-3 opacity-70" />
					<span>{caseId}</span>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-blue-900 dark:text-blue-200 text-lg font-medium leading-relaxed prose dark:prose-invert max-w-none">
					<ReactMarkdown
						remarkPlugins={[remarkGfm, remarkMath]}
						rehypePlugins={[rehypeKatex]}
					>
						{vignette}
					</ReactMarkdown>
				</div>
				{media && (
					<img
						src={media}
						alt="Imagem principal do caso"
						className="mt-4 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
					/>
				)}
			</CardContent>
		</Card>
	);
}
