import adapter from "@sveltejs/adapter-static"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import("@sveltejs/kit").Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: "404.html" }),
		/**
		 * Caminho de asset ABSOLUTO (`/_app/...`), e não relativo, que é o padrão do
		 * SvelteKit.
		 *
		 * O caminho relativo é calculado para a profundidade da URL canônica. Serve bem
		 * enquanto a página for entregue nela - o nosso nginx entrega `/pokemon/charizard`
		 * direto, sem redirecionar. Mas um host que resolve pasta com `try_files $uri $uri/`
		 * responde 301 para `/pokemon/charizard/`, e a barra a mais acrescenta um nível: todo
		 * `../` passa a resolver um degrau raso, e a página chega sem CSS nenhum.
		 *
		 * Foi o que aconteceu no Square Cloud. O `curl` não viu - o host devolve 200 para
		 * caminho inexistente -, só o navegador pedindo o CSS de verdade.
		 *
		 * O compêndio mora na raiz de um domínio, então o absoluto está sempre certo e é
		 * imune ao formato da URL que o host escolher.
		 */
		paths: { relative: false },
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
