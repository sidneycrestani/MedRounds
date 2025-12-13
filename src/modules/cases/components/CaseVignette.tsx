import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
	title: string;
	vignette: string;
	media?: string;
};

export default function CaseVignette({
	title,
	vignette,
	media,
	...props
}: Props) {
	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-blue-800 text-lg font-medium leading-relaxed">
					{vignette}
				</p>
				{media && (
					<img
						src={media}
						alt="Imagem principal do caso"
						className="mt-4 rounded-lg border"
					/>
				)}
			</CardContent>
		</Card>
	);
}
