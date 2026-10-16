// Normaliza os compêndios crus (dados-crus/*.json) no formato que o compêndio consome
// (dados/*.json). Lê os dados estruturados de flags["pokemon-mundo-perfeito"] e só
// recorre a interpretação de texto onde o módulo guarda prosa (evolução, deslocamento).
//
// Uso: npm run dados:construir -- [entrada=dados-crus] [saída=dados]
//
// Nada é inventado: o que não for possível interpretar com segurança vai para
// dados/relatorio.json, para correção na fonte (o módulo Foundry).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { interpretarEfeitos } from "./efeitos.mjs"
import { criarInterpretadorDeEvolucao } from "./evolucao.mjs"
import {
	CHAVE_DE_TIPO_VARIAVEL, TIPO_DE_MOVE_POR_CHAVE, classificarResolucao, criarReparadorDeMoves,
	interpretarAlcance, interpretarAtivacao, interpretarDados, interpretarDuracao, prioridadeDeclarada,
} from "./moves.mjs"
import { interpretarDeslocamento, interpretarSentidos, slug, textoSimples } from "./texto.mjs"

const [ entrada = "dados-crus", saida = "dados" ] = process.argv.slice(2)
const FLAG = "pokemon-mundo-perfeito"

if (!existsSync(join(entrada, "pokedex.json"))) {
	console.error(`Não encontrei ${join(entrada, "pokedex.json")}.`)
	console.error('Rode primeiro: npm run dados:desempacotar -- "<pasta-do-módulo>"')
	process.exit(1)
}

mkdirSync(saida, { recursive: true })

const carregar = (nome) => JSON.parse(readFileSync(join(entrada, `${nome}.json`), "utf8"))
const carregarOpcional = (nome) => existsSync(join(entrada, `${nome}.json`)) ? carregar(nome) : null
const flags = (documento) => documento.flags?.[FLAG] ?? {}

const TIPO_POR_CHAVE = {
	normal: "normal", fire: "fogo", water: "agua", electric: "eletrico", grass: "grama",
	ice: "gelo", fighting: "lutador", poison: "venenoso", ground: "terrestre", flying: "voador",
	psychic: "psiquico", bug: "inseto", rock: "pedra", ghost: "fantasma", dragon: "dragao",
	dark: "sombrio", steel: "aco", fairy: "fada",
}

const TAMANHO_POR_CHAVE = {
	tiny: "minusculo", small: "pequeno", medium: "medio",
	large: "grande", huge: "enorme", gigantic: "gigantesco",
}

const relatorio = {
	geradoEm: new Date().toISOString(),
	deslocamentoIncompleto: [],
	movesNaoResolvidos: [],
	evolucoesNaoResolvidas: [],
	evolucoesSuspeitas: [],
	tiposDesconhecidos: [],
	tamanhosDesconhecidos: [],
	tiposDeMoveDesconhecidos: [],
	alcanceDeMoveTruncado: [],
	prioridadeDeMoveDivergente: [],
	dadosDeMoveNaoClassificados: [],
	efeitosDeMoveNaoInterpretados: [],
	textosDeMoveContaminados: [],
}

const dex = carregar("pokedex")
const documentosDeEspecie = dex.filter((d) => flags(d).species != null)

// ------------------------------------------------------------------ Geração e região
// As "pastas" do pack são documentos cujo nome é "Geração 1 — Kanto".
const PROCEDENCIA_POR_PASTA = {}
for (const documento of dex) {
	const casa = (documento.name ?? "").match(/^Geração (\d+)\s*—\s*(.+)$/)
	if (casa != null) PROCEDENCIA_POR_PASTA[documento._id] = { geracao: Number(casa[1]), regiao: casa[2].trim() }
}

// ------------------------------------------------------------------ Dicionário de Moves
// As listas de Moves das fichas de espécie são texto de PDF, e o reparo delas vive em
// `moves.mjs` (com testes). Vale para as três listas: tabela de nível, TMs e Moves de Ovo
// — as duas últimas passavam cruas até agora, e é por isso que a ficha mostrava
// "T a k e D o w n" e "Double- Edge" onde o livro diz "Take Down" e "Double-Edge".
const documentosDeMove = carregar("moves").filter((d) => flags(d).move != null)
const reparadorDeMoves = criarReparadorDeMoves(documentosDeMove.map((d) => d.name))

let movesReparados = 0
const movesNaoResolvidos = new Set()

function anotarNaoResolvidos(nomeDaEspecie, nomes) {
	for (const nome of nomes) movesNaoResolvidos.add(`${nomeDaEspecie}: ${nome}`)
}

function listaDeMoves(brutos, nomeDaEspecie) {
	const { resolvidos, naoResolvidos } = reparadorDeMoves.resolverLista(brutos)
	anotarNaoResolvidos(nomeDaEspecie, naoResolvidos)
	// O que não resolveu continua na ficha, como texto sem link: a lista do livro não
	// deve encurtar porque o módulo contaminou uma entrada.
	return [ ...resolvidos, ...naoResolvidos ]
}

function tabelaDeMoves(linhas, nomeDaEspecie) {
	const { tabela, naoResolvidos, reparados } = reparadorDeMoves.repararTabela(linhas)
	anotarNaoResolvidos(nomeDaEspecie, naoResolvidos)
	movesReparados += reparados
	return tabela
}

// ------------------------------------------------------------------ Evolução
// O livro descreve evoluções de muitos jeitos: "no nível 6 ou superior", "a partir do
// nível 6", "em qualquer nível quando sua Lealdade for +2", "com a ajuda de uma Thunder
// Stone", "apenas durante a noite", ramificações separadas por vírgula ou "ou". Quebramos
// em cláusulas, achamos a espécie-alvo pelo dicionário de nomes e extraímos as condições.
// O que não for reconhecido vira `especial` — condição narrativa, para o Mestre resolver.
const NOMES_DE_ESPECIE = [ ...new Set(documentosDeEspecie.map((d) => d.name)) ]
	.sort((a, b) => b.length - a.length)

const PADRAO_ITEM_EVOLUTIVO = /Stone|Scale|Coat|Claw|Fang|Disc|Cloth|Upgrade|Protector|Electirizer|Magmarizer|Apple|Sweet|Pedra|Ring|Fossil|Chipped|Cracked|Tart|Auspicious|Malicious|Metal Alloy|Peat|Scroll|Leek|Sachet|Whipped|Gimmighoul|Oval/i

const ITENS_EVOLUTIVOS = (carregarOpcional("trainer-features") ?? [])
	.filter((f) => flags(f).category === "item-treinador")
	.filter((f) => PADRAO_ITEM_EVOLUTIVO.test(f.name))
	.map((f) => ({ id: slug(f.name), nome: f.name }))
	.sort((a, b) => b.nome.length - a.nome.length)

const interpretarEvolucao = criarInterpretadorDeEvolucao({
	nomesDeEspecie: NOMES_DE_ESPECIE,
	itensEvolutivos: ITENS_EVOLUTIVOS,
	tipoPorChave: TIPO_POR_CHAVE,
})

// ------------------------------------------------------------------ Espécies
// O módulo gravou espécies sem gênero como 50/50; a lista correta vem do PDF.
const SEM_GENERO = new Set(carregarOpcional("sem-genero") ?? [])
if (SEM_GENERO.size === 0) {
	console.warn("  (sem dados-crus/sem-genero.json — espécies sem gênero sairão como 50/50)")
}

const especies = []
const idsUsados = new Set()

for (const documento of documentosDeEspecie) {
	const s = flags(documento).species

	let id = slug(documento.name)
	while (idsUsados.has(id)) id = `${id}-2`
	idsUsados.add(id)

	const tipos = [ s.types?.type1, s.types?.type2 ]
		.filter((t) => t != null && t !== "")
		.map((chave) => {
			const tipo = TIPO_POR_CHAVE[chave]
			if (tipo == null) relatorio.tiposDesconhecidos.push({ especie: documento.name, chave })
			return tipo
		})
		.filter((t) => t != null)

	const tamanho = TAMANHO_POR_CHAVE[s.size]
	if (tamanho == null) relatorio.tamanhosDesconhecidos.push({ especie: documento.name, chave: s.size })

	const { deslocamentos, incompleto } = interpretarDeslocamento(s.movement?.other ?? "")
	if (incompleto) {
		relatorio.deslocamentoIncompleto.push({ especie: documento.name, bruto: s.movement?.other ?? "" })
	}

	const periciasBrutas = (s.skills ?? [])
		.filter((p) => typeof p === "string" && p.trim() !== "" && p.trim() !== "—")
	const todasAsPericias = periciasBrutas.some((p) => /^todas$/i.test(p.trim()))
	const semGenero = s.gender?.genderless === true || SEM_GENERO.has(documento.name)

	especies.push({
		id,
		nome: documento.name,
		numero: s.dexNumber ?? 0,
		tipos,
		sr: s.speciesRank?.value ?? 0,
		srTexto: s.speciesRank?.display ?? String(s.speciesRank?.value ?? 0),
		tamanho: tamanho ?? "medio",
		alturaM: s.heightMeters ?? null,
		nivelMinimo: s.minLevelFound ?? 1,
		...(PROCEDENCIA_POR_PASTA[documento.folder] ?? { geracao: null, regiao: null }),
		gruposDeOvo: s.eggGroups ?? [],
		genero: semGenero
			? null
			: { machoPct: s.gender?.malePercent ?? 50, femeaPct: s.gender?.femalePercent ?? 50 },
		estagio: { atual: s.evolutionStage?.current ?? 1, total: s.evolutionStage?.max ?? 1 },
		evolucao: textoSimples(s.evolution ?? ""),
		evolucoes: interpretarEvolucao(s.evolution ?? "", documento.name),
		descricao: textoSimples(s.biography ?? "").split("\n")[0] ?? "",
		atributos: {
			str: s.abilities?.str?.value ?? 10,
			dex: s.abilities?.dex?.value ?? 10,
			con: s.abilities?.con?.value ?? 10,
			int: s.abilities?.int?.value ?? 10,
			wis: s.abilities?.wis?.value ?? 10,
			cha: s.abilities?.cha?.value ?? 10,
		},
		pericias: todasAsPericias ? [] : periciasBrutas,
		todasAsPericias,
		ca: s.armorClass?.value ?? 10,
		pv: s.hitPoints?.max ?? s.hitPoints?.value ?? 0,
		dadoDeVida: String(s.hitPoints?.hitDie ?? "d6"),
		deslocamentos,
		deslocamentoBruto: s.movement?.other ?? "",
		deslocamentoIncompleto: incompleto,
		sentidos: interpretarSentidos(s.senses ?? ""),
		habilidades: s.passiveAbility?.options ?? [],
		habilidadeOculta: s.hiddenAbility != null && s.hiddenAbility !== "" ? s.hiddenAbility : null,
		movesPorNivel: tabelaDeMoves(s.moveTable ?? [], documento.name),
		tms: listaDeMoves(s.tms ?? [], documento.name),
		movesDeOvo: listaDeMoves(s.eggMoves ?? [], documento.name),
		defesasAlteradas: Object.keys(s.typeDefenseOverrides ?? {}).length > 0 ? s.typeDefenseOverrides : null,
		imagem: typeof documento.img === "string" && documento.img.startsWith("http") ? documento.img : null,
	})
}

// Resolve os alvos de evolução para `id`, agora que todas as espécies existem.
const ID_POR_NOME = new Map(especies.map((e) => [ e.nome, e.id ]))
const ESPECIE_POR_ID = new Map(especies.map((e) => [ e.id, e ]))

for (const especie of especies) {
	for (const evolucao of especie.evolucoes) {
		evolucao.paraId = ID_POR_NOME.get(evolucao.para) ?? null

		if (evolucao.paraId == null) {
			relatorio.evolucoesNaoResolvidas.push({ especie: especie.nome, alvo: evolucao.para })
			continue
		}

		// Evoluir não pode baixar nem manter o estágio. Quando acontece, ou o texto do
		// livro está ambíguo, ou a espécie aponta para a forma errada — caso de várias
		// formas regionais, cujo texto cita a evolução comum ("Growlithe de Hisui …
		// evoluir para Arcanine", e não "Arcanine de Hisui"). Sinalizamos para conferência.
		const alvo = ESPECIE_POR_ID.get(evolucao.paraId)
		if (alvo != null && alvo.estagio.atual <= especie.estagio.atual) {
			relatorio.evolucoesSuspeitas.push({
				especie: especie.nome,
				alvo: alvo.nome,
				estagios: `${especie.estagio.atual} → ${alvo.estagio.atual}`,
				texto: especie.evolucao,
			})
		}
	}
}

// Formas que têm estágio evolutivo mas para as quais ninguém evolui. Não dá para
// inventar a ligação — o texto do livro simplesmente não a declara —, então viram
// lista de conferência. Costumam ser de três tipos: forma regional cujo antecessor
// cita a evolução comum ("evoluir para Arcanine", não "Arcanine de Hisui"), forma
// alternativa escolhida na evolução (Wormadam, Meowstic Fêmea) e evolução por
// condição especial (Shedinja, Froslass).
const ALVOS = new Set(especies.flatMap((e) => e.evolucoes.map((v) => v.paraId)).filter((id) => id != null))
relatorio.formasOrfas = especies
	.filter((e) => e.estagio.atual > 1 && !ALVOS.has(e.id))
	.map((e) => ({ especie: e.nome, estagio: `${e.estagio.atual}/${e.estagio.total}` }))

especies.sort((a, b) => a.numero - b.numero || a.nome.localeCompare(b.nome, "pt-BR"))

// ------------------------------------------------------------------ Moves
// O pack de Moves é bem mais estruturado que a Pokédex, mas quatro dos campos não querem
// dizer o que o nome promete — ver o cabeçalho de `moves.mjs`. O que este laço faz é
// aplicar essas correções e registrar, Move por Move, o que não deu para concluir.
const moves = []
const idsDeMoveUsados = new Set()

for (const documento of documentosDeMove) {
	const m = flags(documento).move

	let id = slug(documento.name)
	while (idsDeMoveUsados.has(id)) id = `${id}-2`
	idsDeMoveUsados.add(id)

	const tipoVariavel = m.moveType === CHAVE_DE_TIPO_VARIAVEL
	const tipo = tipoVariavel ? null : TIPO_DE_MOVE_POR_CHAVE[m.moveType] ?? null
	if (tipo == null && !tipoVariavel) {
		relatorio.tiposDeMoveDesconhecidos.push({ move: documento.name, chave: m.moveType })
	}

	const descricao = textoSimples(m.description ?? "")
	const niveisSuperiores = textoSimples(m.higherLevels ?? "")
	const observacoes = textoSimples(m.observations ?? "")

	const alcance = interpretarAlcance(m.range?.raw ?? "", m.range?.meters ?? 0, m.range?.melee === true)
	if (alcance.truncado) {
		relatorio.alcanceDeMoveTruncado.push({ move: documento.name, bruto: alcance.bruto })
	}

	const noTexto = prioridadeDeclarada(descricao)
	const prioridade = m.priority ?? 0
	if (noTexto != null && noTexto !== prioridade) {
		relatorio.prioridadeDeMoveDivergente.push({ move: documento.name, campo: prioridade, texto: noTexto })
	}

	const { dano, cura, naoClassificado } = interpretarDados({
		base: m.damage?.baseFormula ?? "",
		escalonamento: m.damage?.scaling ?? [],
		niveisSuperiores,
		descricao,
	})
	if (naoClassificado != null) {
		relatorio.dadosDeMoveNaoClassificados.push({ move: documento.name, texto: naoClassificado })
	}

	const { efeitos, naoInterpretado } = interpretarEfeitos(descricao)
	for (const item of naoInterpretado) {
		relatorio.efeitosDeMoveNaoInterpretados.push({ move: documento.name, ...item })
	}

	// Um crédito de arte vazado para dentro do texto de regra (Swallow, na v1.33.0).
	// Fica visível na página como está: limpar em silêncio escondia o defeito da fonte.
	const contaminado = [ descricao, niveisSuperiores, observacoes ].find((t) => /Arte feita por|Arte por/i.test(t))
	if (contaminado != null) {
		relatorio.textosDeMoveContaminados.push({ move: documento.name, texto: contaminado })
	}

	moves.push({
		id,
		nome: documento.name,
		tipo,
		tipoVariavel,
		poder: { atributos: m.powerAbilities ?? [], texto: m.power ?? "" },
		ativacao: interpretarAtivacao(m.activation?.raw ?? ""),
		// Struggle é o único Move de PP ilimitado, e o módulo o grava como `max: 0`.
		pp: m.pp?.unlimited === true ? null : m.pp?.max ?? m.pp?.value ?? 0,
		duracao: interpretarDuracao(m.duration ?? ""),
		alcance,
		prioridade,
		prioridadeNoTexto: noTexto != null && noTexto !== prioridade ? noTexto : null,
		resolucoes: classificarResolucao(descricao),
		dano,
		cura,
		efeitos,
		descricao,
		niveisSuperiores,
		observacoes,
		zPower: m.zPowerEffect != null && m.zPowerEffect !== "" ? m.zPowerEffect : null,
		imagem: typeof documento.img === "string" && documento.img.startsWith("http") ? documento.img : null,
	})
}

moves.sort((a, b) => a.nome.localeCompare(b.nome, "en"))

// ------------------------------------------------------------------ Saídas
// O índice é o que a listagem e a busca carregam; propositalmente enxuto.
const indice = especies.map((e) => ({
	id: e.id,
	nome: e.nome,
	numero: e.numero,
	tipos: e.tipos,
	sr: e.sr,
	srTexto: e.srTexto,
	tamanho: e.tamanho,
	geracao: e.geracao,
	regiao: e.regiao,
	ca: e.ca,
	pv: e.pv,
	imagem: e.imagem,
}))

// A fatia de Move que a listagem e a busca carregam. O que fica de fora é o que só a
// ficha usa — descrição, Níveis Superiores, observações e os efeitos detalhados.
const indiceDeMoves = moves.map((m) => ({
	id: m.id,
	nome: m.nome,
	tipo: m.tipo,
	tipoVariavel: m.tipoVariavel,
	pp: m.pp,
	prioridade: m.prioridade,
	alcance: m.alcance.texto,
	metros: m.alcance.metros,
	corpoACorpo: m.alcance.corpoACorpo,
	ativacao: m.ativacao.texto,
	modos: m.ativacao.modos,
	resolucoes: m.resolucoes,
	dano: m.dano?.base ?? null,
	cura: m.cura?.base ?? null,
	poder: m.poder.texto,
}))

const habilidades = {}
for (const documento of carregar("abilities")) {
	habilidades[documento.name] = textoSimples(documento.system?.description?.value ?? "")
}

function escrever(nome, dados) {
	writeFileSync(join(saida, `${nome}.json`), JSON.stringify(dados))
	const total = Array.isArray(dados) ? dados.length : Object.keys(dados).length
	console.log(`  ${nome}.json — ${total} registros`)
}

relatorio.movesNaoResolvidos = [ ...movesNaoResolvidos ]

console.log(`\nGerado em ${saida}/:`)
escrever("especies", especies)
escrever("indice", indice)
escrever("moves", moves)
escrever("indice-moves", indiceDeMoves)
escrever("habilidades", habilidades)
writeFileSync(join(saida, "relatorio.json"), JSON.stringify(relatorio, null, 1))

console.log(`\nQualidade do dado-fonte (detalhes em ${saida}/relatorio.json):`)
console.log(`  tabelas de Moves reparadas: ${movesReparados}`)
console.log(`  nomes de Move não resolvidos nas fichas: ${movesNaoResolvidos.size}`)
console.log(`  deslocamento truncado no módulo: ${relatorio.deslocamentoIncompleto.length} espécies`)
console.log(`  evoluções com alvo não resolvido: ${relatorio.evolucoesNaoResolvidas.length}`)
console.log(`  evoluções a conferir no livro: ${relatorio.evolucoesSuspeitas.length}`)
console.log(`  formas sem antecessor declarado: ${relatorio.formasOrfas.length}`)
console.log(`  alcance de Move truncado no módulo: ${relatorio.alcanceDeMoveTruncado.length}`)
console.log(`  prioridade de Move divergente do texto: ${relatorio.prioridadeDeMoveDivergente.length}`)
console.log(`  dados de Move sem classificar (dano ou cura): ${relatorio.dadosDeMoveNaoClassificados.length}`)
console.log(`  efeitos de Move declarados e não interpretados: ${relatorio.efeitosDeMoveNaoInterpretados.length}`)
console.log(`  textos de Move contaminados na fonte: ${relatorio.textosDeMoveContaminados.length}`)
