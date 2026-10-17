/**
 * Põe o build num repositório de publicação, para o Square Cloud puxar por GitHub.
 *
 * POR QUE UM REPOSITÓRIO SEPARADO. A integração do Square Cloud com o GitHub não constrói
 * nada: ela sincroniza os arquivos do repositório e reinicia o container. Então o que ela
 * observa precisa conter o site PRONTO, com index.html na raiz. Pôr o build dentro do
 * `pmp-compendio` encheria o repositório de código com 90 MB de HTML gerado, que todo
 * mundo que clona o fonte baixaria sem precisar. É o arranjo do gh-pages: fonte num
 * lugar, artefato em outro.
 *
 * E resolve o que travou o caminho do .zip: a integração CLONA, não extrai. A extração do
 * zip de 5.981 arquivos falhou no painel; para o Git esse número é banal.
 *
 * O `.gitattributes` do repositório de publicação desliga qualquer conversão de fim de
 * linha (`* -text`). Aqui o `core.autocrlf` está ligado, e sem isso o Git reescreveria as
 * quebras de linha dos 2.815 HTML — o que é servido deixaria de ser byte a byte o que foi
 * construído, e os PNG correriam risco pior.
 *
 * Requer um build já feito e portátil: `npm run build` faz os dois.
 */
import { existsSync, readdirSync, rmSync, cpSync, copyFileSync, writeFileSync, mkdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { conferirArquivo } from "./configuracao-square.mjs"

const BUILD = "build"
const CONFIG = "squarecloud.app"
const CLONE = join("publicacao", "site")
const RAMO = "main"
const REPO = process.env.REPO_SITE ?? "LuizHenriquelhlt/pmp-compendio-site"

function pare(mensagem) {
	console.error(mensagem)
	process.exit(1)
}

function git(argumentos, cwd = CLONE) {
	return execFileSync("git", argumentos, { cwd, encoding: "utf8" }).trim()
}

if (!existsSync(join(BUILD, "index.html"))) pare("Falta o build. Rode 'npm run build' antes.")
if (!existsSync(CONFIG)) pare(`Falta o ${CONFIG} na raiz do projeto.`)
if (existsSync(join(BUILD, "pokemon.html"))) {
	pare("O build está na forma pasta.html. Rode 'npm run build' (que termina em ferramentas/portatil.mjs).")
}
if (!existsSync(join(BUILD, "pokemon", "index.html"))) {
	pare(`Não achei ${BUILD}/pokemon/index.html — o build não parece completo.`)
}

const { SUBDOMAIN: subdominio } = conferirArquivo(CONFIG)
const origem = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()

if (!existsSync(join(CLONE, ".git"))) {
	mkdirSync("publicacao", { recursive: true })
	rmSync(CLONE, { recursive: true, force: true })
	console.log(`clonando ${REPO}…`)
	execFileSync("git", ["clone", `https://github.com/${REPO}.git`, CLONE], { stdio: "inherit" })
} else {
	// `fetch` + `reset` em vez de `pull`: o conteúdo daqui é descartável e gerado, então
	// o que o remoto diz sempre ganha — não há merge que faça sentido entre dois builds.
	git(["fetch", "origin"])
	try {
		git(["reset", "--hard", `origin/${RAMO}`])
	} catch {
		console.log(`(${RAMO} ainda não existe no remoto — primeiro envio)`)
	}
}

try {
	git(["checkout", "-B", RAMO])
} catch {
	// Repositório recém-criado, sem nenhum commit: não há o que trocar de ramo ainda.
}

// Apaga tudo menos o .git. O repositório é um espelho do build, não um acúmulo: um
// arquivo que deixou de ser gerado tem de sumir de lá também.
for (const entrada of readdirSync(CLONE)) {
	if (entrada !== ".git") rmSync(join(CLONE, entrada), { recursive: true, force: true })
}

cpSync(BUILD, CLONE, { recursive: true })
copyFileSync(CONFIG, join(CLONE, CONFIG))
writeFileSync(
	join(CLONE, ".gitattributes"),
	"# Conteúdo gerado: o que for servido tem de ser byte a byte o que o build produziu.\n" +
		"# Sem isto, com core.autocrlf ligado, o Git reescreveria o fim de linha dos HTML.\n" +
		"* -text\n",
	"utf8",
)

git(["add", "-A"])

const pendente = git(["status", "--porcelain"])
if (pendente === "") {
	console.log("nada mudou desde o último envio — o site publicado já é este build")
	process.exit(0)
}

const arquivos = git(["diff", "--cached", "--numstat"]).split("\n").filter(Boolean).length
git(["commit", "-m", `Publica o build de ${origem}`])
console.log(`empurrando ${arquivos} arquivo(s) alterado(s)…`)
execFileSync("git", ["push", "-u", "origin", RAMO], { cwd: CLONE, stdio: "inherit" })

console.log(`publicado em github.com/${REPO} (ramo ${RAMO})`)
console.log(`o Square Cloud deve servir isso em https://${subdominio.toLowerCase()}.squareweb.app`)
