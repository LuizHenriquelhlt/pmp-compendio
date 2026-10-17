/**
 * Deixa o build servível em qualquer host estático, sem mexer nas URLs.
 *
 * O adapter-static grava uma rota por ARQUIVO: /moves → build/moves.html. Quase nenhum
 * servidor tenta a extensão sozinho — isso é uma regra que escrevemos à mão no nosso
 * nginx.conf (`try_files $uri $uri.html`) e que um host gerenciado não tem como saber.
 *
 * Este passo renomeia cada build/X.html para build/X/index.html, que é o que TODO servidor
 * estático resolve sozinho (`index index.html` é o padrão do nginx, do Apache, do Caddy,
 * do S3, das Pages). As URLs do compêndio continuam exatamente as mesmas: quem muda é o
 * arquivo no disco, não o link em /moves/absorb.
 *
 * É renomear, não copiar: o SvelteKit já grava build/X/__data.json ao lado de build/X.html,
 * então a pasta de destino quase sempre existe e o passo não custa um byte. Copiar — para
 * servir as duas formas — custaria os 60 MB de HTML de novo, e a forma com extensão é a
 * que depende de configuração especial, não a com índice.
 *
 * Isso é a alternativa ao `trailingSlash: "always"` do SvelteKit, que resolveria o mesmo
 * problema emitindo pasta/index.html — mas mudaria toda a forma das URLs para /moves/,
 * inclusive as de espécie, que já estão decididas.
 *
 * Fora do rearranjo: build/index.html (já é a raiz) e build/404.html, que o nginx usa em
 * `error_page` e que os hosts gerenciados procuram nesse nome exato.
 */
import { readdirSync, mkdirSync, renameSync, existsSync } from "node:fs"
import { join, dirname, basename } from "node:path"

const RAIZ = "build"
const INTOCADOS = new Set(["index.html", "404.html"])

function paginas(pasta) {
	const achadas = []
	for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
		const caminho = join(pasta, entrada.name)
		if (entrada.isDirectory()) achadas.push(...paginas(caminho))
		else if (entrada.name.endsWith(".html") && !INTOCADOS.has(entrada.name)) achadas.push(caminho)
	}
	return achadas
}

if (!existsSync(join(RAIZ, "index.html"))) {
	console.error(`Não achei ${RAIZ}/index.html. Rode o build antes.`)
	process.exit(1)
}

let movidas = 0
let pastasCriadas = 0
const conflitos = []

for (const pagina of paginas(RAIZ)) {
	const destinoPasta = pagina.slice(0, -".html".length)
	const destino = join(destinoPasta, "index.html")

	// Um X.html e um X/index.html já existentes significariam duas páginas disputando a
	// mesma URL — não é algo que este passo possa decidir, então para e conta qual.
	if (existsSync(destino)) {
		conflitos.push(pagina)
		continue
	}

	if (!existsSync(destinoPasta)) {
		mkdirSync(destinoPasta, { recursive: true })
		pastasCriadas++
	}

	renameSync(pagina, destino)
	movidas++
}

if (conflitos.length > 0) {
	console.error(`${conflitos.length} página(s) já tinham index.html próprio:`)
	for (const conflito of conflitos.slice(0, 10)) console.error(`  ${conflito}`)
	process.exit(1)
}

console.log(`build portátil: ${movidas} páginas em pasta/index.html (${pastasCriadas} pasta(s) nova(s))`)
