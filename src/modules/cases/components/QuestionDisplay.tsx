import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type Props = HTMLAttributes<HTMLDivElement> & {
	text: string;
	media?: string;
};

export default function QuestionDisplay({ text, media, ...props }: Props) {
	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>Enunciado</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-gray-800 dark:text-gray-200 leading-relaxed prose dark:prose-invert max-w-none">
					<ReactMarkdown
						remarkPlugins={[remarkGfm, remarkMath]}
						rehypePlugins={[rehypeKatex]}
					>
						{text}
					</ReactMarkdown>
				</div>
				{media && (
					<img
						src={media}
						alt="Imagem da questão"
						className="mt-4 rounded-lg border dark:border-gray-700"
					/>
				)}
			</CardContent>
		</Card>
	);
}
