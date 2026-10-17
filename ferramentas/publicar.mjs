/**
 * Empacota o build para subir num host estático (Square Cloud, no caso).
 *
 * O Square Cloud recebe um .zip cuja RAIZ é a raiz do site: index.html e squarecloud.app
 * têm de estar no primeiro nível do arquivo, não dentro de uma pasta `build/`. É por isso
 * que este script zipa o CONTEÚDO de build/ e não a pasta — um zip com um nível a mais é
 * o erro mais comum e o painel só diz "não achei index.html".
 *
 * O squarecloud.app vive na raiz do projeto (é configuração versionada, não artefato) e é
 * copiado para dentro do pacote aqui.
 *
 * Requer um build já feito e já portátil: `npm run build` faz os dois.
 */
import { existsSync, copyFileSync, mkdirSync, rmSync, statSync, readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join, resolve } from "node:path"

const BUILD = "build"
const CONFIG = "squarecloud.app"
const SAIDA = join("publicacao", "compendio-pmp.zip")

function pare(mensagem) {
	console.error(mensagem)
	process.exit(1)
}

/**
 * As regras do squarecloud.app, conferidas aqui porque o host só as aplica DEPOIS do
 * upload — e uma delas não tem segunda chance.
 *
 * SUBDOMAIN é obrigatório no PRIMEIRO upload. Sem ele o deploy vira uma aplicação comum,
 * não um site, e não há como converter: seria apagar e subir de novo. DISPLAY_NAME só
 * aceita letra SEM acento, o que é fácil de esquecer num projeto escrito em português —
 * "Compêndio" seria recusado.
 *
 * Fonte: docs.squarecloud.app/en/getting-started/config-file
 */
function conferirConfig(texto) {
	const campos = {}
	for (const linha of texto.split("\n")) {
		const corte = linha.indexOf("=")
		if (corte > 0) campos[linha.slice(0, corte).trim()] = linha.slice(corte + 1).trim()
	}

	const problemas = []
	const { DISPLAY_NAME = "", SUBDOMAIN = "", VERSION = "", DESCRIPTION = "", MEMORY = "" } = campos

	if (!DISPLAY_NAME) problemas.push("DISPLAY_NAME é obrigatório")
	else if (DISPLAY_NAME.length > 32) problemas.push(`DISPLAY_NAME tem ${DISPLAY_NAME.length} caracteres (limite 32)`)
	else if (!/^[A-Za-z0-9 _-]+$/.test(DISPLAY_NAME)) {
		const fora = [...DISPLAY_NAME].filter((c) => !/[A-Za-z0-9 _-]/.test(c))
		problemas.push(`DISPLAY_NAME só aceita letra sem acento, dígito, espaço, - e _; achei ${fora.join(" ")}`)
	}

	if (!SUBDOMAIN) {
		problemas.push(
			"SUBDOMAIN está faltando. Ele TEM de ir no primeiro upload: sem ele o deploy vira\n" +
			"  aplicação em vez de site, e não dá para converter depois — só apagando e subindo de novo.",
		)
	} else if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(SUBDOMAIN.toLowerCase())) {
		problemas.push(`SUBDOMAIN inválido: "${SUBDOMAIN}" (letras, dígitos e hífen, sem começar nem terminar em hífen, até 63)`)
	}

	if (!["recommended", "latest"].includes(VERSION)) problemas.push(`VERSION é "recommended" ou "latest", não "${VERSION}"`)
	if (DESCRIPTION.length > 280) problemas.push(`DESCRIPTION tem ${DESCRIPTION.length} caracteres (limite 280)`)
	if (!/^\d+$/.test(MEMORY)) problemas.push(`MEMORY é um número em MB, não "${MEMORY}"`)

	if (problemas.length > 0) pare(`${CONFIG} não passa nas regras do Square Cloud:\n` + problemas.map((p) => `- ${p}`).join("\n"))

	return SUBDOMAIN
}

if (!existsSync(join(BUILD, "index.html"))) pare("Falta o build. Rode 'npm run build' antes.")
if (!existsSync(CONFIG)) pare(`Falta o ${CONFIG} na raiz do projeto.`)

// Um build sem o passo de portabilidade subiria e daria 404 em toda rota que não a raiz —
// e o 404 só apareceria depois do upload. Melhor falhar aqui.
if (existsSync(join(BUILD, "pokemon.html"))) {
	pare("O build está na forma pasta.html. Rode 'npm run build' (que termina em ferramentas/portatil.mjs).")
}
if (!existsSync(join(BUILD, "pokemon", "index.html"))) {
	pare(`Não achei ${BUILD}/pokemon/index.html — o build não parece completo.`)
}

const subdominio = conferirConfig(readFileSync(CONFIG, "utf8"))

copyFileSync(CONFIG, join(BUILD, CONFIG))

mkdirSync("publicacao", { recursive: true })
rmSync(SAIDA, { force: true })

// Sem dependência de npm para zipar: no Windows o .NET já tem o compressor, e em
// qualquer outro lugar o `zip` do sistema resolve. `CreateFromDirectory` com
// `includeBaseDirectory` falso põe o conteúdo na raiz do arquivo, que é o que o host espera.
if (process.platform === "win32") {
	const ps = [
		"Add-Type -AssemblyName System.IO.Compression.FileSystem;",
		`[System.IO.Compression.ZipFile]::CreateFromDirectory('${resolve(BUILD)}', '${resolve(SAIDA)}', [System.IO.Compression.CompressionLevel]::Optimal, $false)`,
	].join(" ")
	execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "inherit" })
} else {
	execFileSync("zip", ["-r", "-q", resolve(SAIDA), "."], { cwd: BUILD, stdio: "inherit" })
}

const mb = (statSync(SAIDA).size / 1024 / 1024).toFixed(1)
console.log(`pacote: ${SAIDA} (${mb} MB)`)
console.log(`o site vai atender em https://${subdominio.toLowerCase()}.squareweb.app`)
