import adapter from "@sveltejs/adapter-static"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import("@sveltejs/kit").Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: "404.html" }),
		files: {
			routes: "src/rotas",
		},
		alias: {
			$pmp: "src/lib/pmp",
			$dados: "src/lib/dados",
			$ui: "src/lib/ui",
			$i18n: "src/lib/i18n",
		},
		prerender: {
			// O compêndio é inteiramente estático; qualquer link quebrado é erro de build.
			handleHttpError: "fail",
		},
	},
}
