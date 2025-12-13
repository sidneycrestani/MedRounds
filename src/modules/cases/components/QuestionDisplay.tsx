import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HTMLAttributes } from "react";

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
				<p className="text-gray-800 leading-relaxed">{text}</p>
				{media && (
					<img
						src={media}
						alt="Imagem da questão"
						className="mt-4 rounded-lg border"
					/>
				)}
			</CardContent>
		</Card>
	);
}
