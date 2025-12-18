/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: [
		"./src/**/*.{astro,ts,tsx,js,jsx}",
		"./src/pages/**/*.{astro,ts,tsx,js,jsx}",
		"./src/components/**/*.{astro,ts,tsx,js,jsx}",
	],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#f0f9ff", // Fundo muito claro
					100: "#e0f2fe",
					200: "#bae6fd",
					300: "#7dd3fc",
					400: "#21a6e6", // [Marca] Start Gradient (Cyan-ish)
					500: "#1f7adf", // [Marca] End Gradient (Primary Blue)
					600: "#0284c7", // Hover state
					700: "#0369a1",
					800: "#075985",
					900: "#0c4a6e",
				},
			},
			backgroundImage: {
				// Atalho para o gradiente oficial
				"brand-gradient": "linear-gradient(to right, #21a6e6, #1f7adf)",
				"brand-gradient-hover": "linear-gradient(to right, #1f7adf, #1860b3)",
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};