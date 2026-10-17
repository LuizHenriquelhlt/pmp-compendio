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
import { CLIMA_POR_MOVE, interpretarHabilidade, regraAusente } from "./habilidades.mjs"
import {
	aparicaoDaCelulaDePreco, contaminacao, interpretarPreco, precoDivergente, referenciaDePagina,
	textoComecaNoMeio, textoCortado, tituloDeSecao,
} from "./itens.mjs"
import {
	contaminacaoNaDescricao, habilidadePendente, interpretarDeslocamentoConcedido,
	interpretarOutrosEfeitos, pesEmMetros, prosaDaDescricao,
} from "./megas.mjs"
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
	habilidadesSemRegra: [],
	efeitosDeHabilidadeNaoInterpretados: [],
	movesDeHabilidadeNaoResolvidos: [],
	movesDeClimaAusentes: [],
	habilidadesDeMegaNaoResolvidas: [],
	megasSemEspecieBase: [],
	descricoesDeMegaContaminadas: [],
	efeitosDeMegaNaoInterpretados: [],
	tiposDeMegaDesconhecidos: [],
	tamanhosDeMegaDesconhecidos: [],
	deslocamentosDeMegaDesconhecidos: [],
	camposDeMegaNaoInterpretados: [],
	categoriasDeMegaDesconhecidas: [],
	habilidadesSemPortador: [],
	precosDeItemDivergentes: [],
	celulasDePrecoEmItens: [],
	textosDeItemContaminados: [],
	textosDeItemCortados: [],
	referenciasDePaginaEmItens: [],
	itensDeEvolucaoNaoResolvidos: [],
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

// ------------------------------------------------------------------ Habilidades
// O pack `abilities` é o mais pobre dos três: de todos os campos do documento, só `name`,
// `system.description.value` e o flag `placeholder` variam nas 313 habilidades. O resto é
// constante — inclusive `flags["pokemon-mundo-perfeito"].category`, que é
// `"habilidade-passiva"` em todas. O nome promete um vocabulário de categorias e entrega
// uma constante: não existe taxonomia de habilidade no módulo, e tudo o que esta seção
// estrutura além do nome sai do texto, em `habilidades.mjs`.
//
// Em contrapartida, as referências das fichas de espécie vêm limpas: as 2.662 entradas de
// `passiveAbility.options` e `hiddenAbility` casam com o pack nas 2.662, sem nenhum dos
// defeitos de extração que obrigam a reparar `moveTable`, `tms` e `eggMoves`. Aqui não
// há reparador, de propósito.
const documentosDeHabilidade = carregar("abilities")

const ID_DE_MOVE_POR_NOME = new Map(moves.map((m) => [ m.nome, m.id ]))

// A tabela que traduz Move de clima em clima é conferida contra o dicionário: um Move
// renomeado na fonte tem de aparecer como trabalho, não sumir com o clima dele.
for (const nome of Object.keys(CLIMA_POR_MOVE)) {
	if (!ID_DE_MOVE_POR_NOME.has(nome)) relatorio.movesDeClimaAusentes.push(nome)
}

/** Acrescenta o `id` da rota aos efeitos que nomeiam um Move, como a evolução faz. */
function resolverMoves(efeitos, nomeDaHabilidade) {
	return efeitos.map((efeito) => {
		if (efeito.move == null) return efeito

		const moveId = ID_DE_MOVE_POR_NOME.get(efeito.move) ?? null
		if (moveId == null) {
			relatorio.movesDeHabilidadeNaoResolvidos.push({ habilidade: nomeDaHabilidade, move: efeito.move })
		}

		return { ...efeito, moveId }
	})
}

// ------------------------------------------------------------------ Megas
// O pack `mega-evolutions` é o MAIS estruturado dos quatro: treze campos de
// `flags[…].mega` carregam dado (contra três no `abilities`), e nada do documento Foundry
// em volta serve — `system.*` é constante nas 93. Então quase tudo aqui é leitura de
// campo, e a interpretação de texto fica restrita a `otherEffects` e `description`, nos
// dois casos isolada em `megas.mjs` com testes.
//
// Quatro armadilhas que mudam o desenho desta seção, todas medidas sobre as 93 pedras:
//
//   1. `flags[…].species` e `flags[…].megaForm` (os duplicados de topo) NÃO EXISTEM nas
//      três pedras especiais — a chave não está lá. Quem lê o flag de topo em vez de
//      `mega.*` perde Groudon, Kyogre e Rayquaza em silêncio. Lemos sempre de `mega.*`.
//
//   2. `mega.abilityChoices` não é escolha de Habilidade: o conteúdo é
//      `{ options: ["str","dex"], delta: 5 }`, escolha de ATRIBUTO — o `ability` do dnd5e
//      (ability score). O próprio módulo confirma, no `<li>` que gera: "+5 em FOR ou DES
//      (à escolha do jogador)". Lido como habilidade, produz "str" e "dex" como nomes.
//
//   3. `movementBonusFeet` está em PÉS, e o resto do compêndio está em metros (a Pokédex
//      grava "9m de caminhada" em 1.148 das 1.149, sem uma ocorrência de "pés"). A
//      conversão vive em `megas.mjs`, no fator que o próprio corpus declara.
//
//   4. Zero e lista vazia querem dizer "campo não preenchido", não "não há": Mega
//      Eelektross tem `movementBonusFeet: 0` e declara "+ 10 pés em todos os seus
//      deslocamentos" só na prosa, e Mega Delphox tem `movementGrants: []` e ganha voo de
//      40 pés só no texto. É por isso que `otherEffects` é lido, e não descartado.
//
// `system.description.value` fica de fora por inteiro: agrupando os 475 `<li>` do corpus
// em formas de frase, todas saem de um campo estruturado — nenhum fato vive só ali.
const NOMES_DE_HABILIDADE = new Set(documentosDeHabilidade.map((d) => d.name))
const megasPorHabilidade = new Map()
const documentosDeMega = carregarOpcional("mega-evolutions") ?? []
const megas = []
const idsDeMegaUsados = new Set()

/** As chaves de atributo do Foundry. `con` não aparece em nenhuma das 93 pedras. */
const ATRIBUTOS_DO_FOUNDRY = [ "str", "dex", "con", "int", "wis", "cha" ]

for (const documento of documentosDeMega) {
	const m = flags(documento).mega
	if (m == null) continue

	// `id` pela FORMA, não pela pedra. Os dois dão 93 slugs distintos sem colisão, mas a
	// forma é o que se procura e o que a ficha descreve — a pedra é o requisito. E a forma
	// gera URL legível onde a pedra não: `/megas/mega-charizard-x` contra
	// `/megas/rayquazanite-nao-requer-mega-pedra`.
	let id = slug(m.megaForm)
	while (idsDeMegaUsados.has(id)) id = `${id}-2`
	idsDeMegaUsados.add(id)

	// `types` é sempre o par COMPLETO novo, nunca um delta — Mega Pinsir (`bug` →
	// `bug/flying`) repete `type1`. E `type2: null` com `type1` preenchido é MONOTIPO, não
	// dado faltando: Mega Aggron vem de `steel/rock` e fica `steel`, e o módulo renderiza
	// "Tipo muda para Aço", um nome só. Lista vazia = não troca de tipo (74 das 93).
	const tipos = [ m.types?.type1, m.types?.type2 ]
		.filter((t) => t != null && t !== "")
		.map((chave) => {
			const tipo = TIPO_POR_CHAVE[chave]
			if (tipo == null) relatorio.tiposDeMegaDesconhecidos.push({ forma: m.megaForm, chave })
			return tipo
		})
		.filter((t) => t != null)

	// `size` é absoluto, não delta, e `null` em 69 = não muda de tamanho.
	const tamanho = m.size == null || m.size === "" ? null : TAMANHO_POR_CHAVE[m.size] ?? null
	if (m.size != null && m.size !== "" && tamanho == null) {
		relatorio.tamanhosDeMegaDesconhecidos.push({ forma: m.megaForm, chave: m.size })
	}

	// Na ordem canônica dos atributos, e não na do módulo (que grava Mega Hawlucha como
	// wis, cha, str, dex, int): a ficha mostra FOR, DES, CON, INT, SAB, CAR, e sem isto
	// duas Megas com os mesmos bônus sairiam em ordens diferentes na tela.
	const atributos = ATRIBUTOS_DO_FOUNDRY
		.filter((chave) => typeof (m.abilityDeltas ?? {})[chave] === "number")
		.map((chave) => ({ id: chave, delta: m.abilityDeltas[chave] }))

	for (const [ chave, delta ] of Object.entries(m.abilityDeltas ?? {})) {
		if (!ATRIBUTOS_DO_FOUNDRY.includes(chave) || typeof delta !== "number") {
			relatorio.camposDeMegaNaoInterpretados.push({
				forma: m.megaForm, campo: "abilityDeltas", original: { [chave]: delta },
			})
		}
	}

	// Sempre uma entrada com duas opções nas 11 que têm. Em Mega Hawlucha as duas opções
	// (`str`, `dex`) TAMBÉM estão em `abilityDeltas`: são dois fatos que se somam, não um
	// repetido, e a ficha mostra os dois separados.
	const escolhasDeAtributo = (m.abilityChoices ?? []).flatMap((escolha) => {
		const opcoes = (escolha.options ?? []).filter((a) => ATRIBUTOS_DO_FOUNDRY.includes(a))

		if (opcoes.length !== (escolha.options ?? []).length || typeof escolha.delta !== "number") {
			relatorio.camposDeMegaNaoInterpretados.push({
				forma: m.megaForm, campo: "abilityChoices", original: escolha,
			})
			return []
		}

		return [ { opcoes, delta: escolha.delta } ]
	})

	// ---------------------------------------------------------------- Texto da pedra
	const lido = interpretarOutrosEfeitos(m.otherEffects ?? [])

	for (const item of lido.naoInterpretado) {
		relatorio.efeitosDeMegaNaoInterpretados.push({ forma: m.megaForm, ...item })
	}

	for (const efeito of m.otherEffects ?? []) {
		if (typeof efeito !== "string") {
			relatorio.camposDeMegaNaoInterpretados.push({
				forma: m.megaForm, campo: "otherEffects", original: efeito,
			})
		}
	}

	// Deslocamento: o campo e o texto preenchem a MESMA lista, porque descrevem o mesmo
	// fato de dois jeitos — `movementGrants` dá o modo e a base ("igual ao de caminhada"),
	// a prosa dá o modo e um valor absoluto ("de 40 pés"). Separá-los em dois campos faria
	// a ficha mostrar dois painéis para a mesma coisa.
	const deslocamentosConcedidos = []

	for (const concessao of m.movementGrants ?? []) {
		const concedido = interpretarDeslocamentoConcedido(concessao)
		if (concedido != null) deslocamentosConcedidos.push(concedido)
		else relatorio.deslocamentosDeMegaDesconhecidos.push({ forma: m.megaForm, original: concessao })
	}

	for (const efeito of lido.efeitos) {
		if (efeito.tipo === "deslocamentoConcedido") {
			const { tipo, ...concedido } = efeito
			deslocamentosConcedidos.push(concedido)
		}
	}

	const bonusDoTexto = lido.efeitos.find((e) => e.tipo === "deslocamentoBonus")?.metros ?? null
	const bonusDoCampo = typeof m.movementBonusFeet === "number" && m.movementBonusFeet !== 0
		? pesEmMetros(m.movementBonusFeet)
		: null

	// Habilidade concedida: 0, 1 ou 2 por pedra, e de DOIS campos. Quatro pedras têm
	// `passiveAbility` vazia e duas delas declaram a habilidade em `otherEffects` — uma
	// (Mega Floette → Fairy Aura) nomeando uma habilidade que EXISTE no pack. Lendo só
	// `passiveAbility`, a ficha diz "sem habilidade" para Mega Floette e a ficha de Fairy
	// Aura nunca descobre que uma Mega a concede.
	const declaradas = []
	let habilidadePendenteNaPedra = false

	const passiva = typeof m.passiveAbility === "string" ? m.passiveAbility.trim() : ""
	if (passiva !== "") {
		if (habilidadePendente(passiva)) habilidadePendenteNaPedra = true
		else declaradas.push({ nome: passiva, campo: "passiveAbility" })
	}

	for (const efeito of lido.efeitos) {
		if (efeito.tipo === "habilidadePendente") habilidadePendenteNaPedra = true
		if (efeito.tipo === "habilidadeConcedida") {
			declaradas.push({ nome: efeito.nome, campo: "otherEffects", truncado: efeito.truncado === true })
		}
	}

	const habilidades = declaradas.map(({ nome, campo, truncado }) => {
		const existe = NOMES_DE_HABILIDADE.has(nome)

		// O nome que não casa fica visível na ficha SEM link, como o projeto já faz com os
		// Moves não resolvidos: a pedra declara a habilidade, e calar a declaração por
		// falta de ficha encurtaria o que o livro diz.
		if (!existe) {
			relatorio.habilidadesDeMegaNaoResolvidas.push({
				pedra: documento.name, habilidade: nome, campo,
				...(truncado ? { truncado: true } : {}),
			})
		}

		return { nome, id: existe ? slug(nome) : null }
	})

	// Os dez `"[ainda a ser lançada]"` continuam no relatório, agora marcados: a chave
	// contava 18 nomes sem ficha e não pode perder nenhum só porque a pendência passou a
	// ter campo próprio.
	if (habilidadePendenteNaPedra) {
		relatorio.habilidadesDeMegaNaoResolvidas.push({
			pedra: documento.name, habilidade: "[ainda a ser lançada]", pendente: true,
		})
	}

	// ---------------------------------------------------------------- Espécie-base
	// Nenhuma das 93 `megaForm` existe como espécie na Pokédex — as Megas não estão lá. A
	// espécie-base existe em 90, e é para ela que o link aponta.
	//
	// O teste das 93 é feito aqui, UMA vez por pedra e independente da habilidade. Antes
	// ele vinha depois de um `continue` que saltava a pedra cuja habilidade não resolvia, e
	// por isso a chave contava 1 onde há 3: Floettite (`passiveAbility: ""`) e
	// Tatsugirinite (`"[ainda a ser lançada]"`) nunca chegavam ao teste.
	const especieId = ID_POR_NOME.get(m.species) ?? null

	if (especieId == null) {
		// Os candidatos vêm da própria Pokédex (nomes que contêm a última palavra do nome
		// procurado) e são o que falta para corrigir a fonte: "Meowstic" → Meowstic Macho /
		// Meowstic Fêmea. Não são uma resolução — escolher um deles seria adivinhar, e no
		// caso de Tatsugiri exigiria traduzir "(Curly Form)" para "Forma Curva".
		const ultima = String(m.species ?? "").split(/\s+/).pop()?.toLowerCase() ?? ""
		const candidatos = ultima === ""
			? []
			: especies.filter((e) => e.nome.toLowerCase().includes(ultima)).map((e) => e.nome)

		relatorio.megasSemEspecieBase.push({ pedra: documento.name, especie: m.species, candidatos })
	}

	const categoriaBruta = flags(documento).category
	if (![ "mega-stone", "mega-stone-especial" ].includes(categoriaBruta)) {
		relatorio.categoriasDeMegaDesconhecidas.push({ pedra: documento.name, categoria: categoriaBruta ?? null })
	}

	// ---------------------------------------------------------------- Descrição
	// Prosa de sabor: nenhuma das 93 repete os deltas, então descrição e deltas convivem
	// na ficha sem dizer a mesma coisa duas vezes. A deixa que o módulo repete nas 93
	// ("<espécie> recebe os seguintes benefícios:") sai fora — ver `prosaDaDescricao`.
	const descricaoBruta = textoSimples(m.description ?? "")
	const contaminacao = contaminacaoNaDescricao(descricaoBruta)

	if (contaminacao != null) {
		relatorio.descricoesDeMegaContaminadas.push({
			forma: m.megaForm, marca: contaminacao, texto: descricaoBruta,
		})
	}

	megas.push({
		id,
		nome: m.megaForm,
		pedra: documento.name,
		especie: m.species,
		especieId,
		// O número da espécie-base, para a listagem poder sair na ordem da Pokédex — que é
		// a ordem em que o livro apresenta as espécies. 0 nas três sem base resolvida.
		numero: especieId != null ? ESPECIE_POR_ID.get(especieId)?.numero ?? 0 : 0,
		// `category` é um dos raríssimos campos de categoria do módulo que de fato variam.
		// O que ele distingue não é "Primal": são 2 Primal (Groudon, Kyogre) mais 1 que não
		// precisa de pedra (Rayquaza). O que as três têm em comum é não seguir a regra comum
		// da Mega Pedra, e a regra de cada uma está em `outrosTextos`.
		categoria: categoriaBruta === "mega-stone"
			? "mega"
			: categoriaBruta === "mega-stone-especial" ? "especial" : "desconhecida",
		tipos,
		tamanho,
		// `null` e não 0 de propósito: 11 pedras têm delta 0 de CA, e um campo ausente lido
		// como 0 diria "não muda a CA" onde o certo é "o módulo não gravou".
		deltaCA: typeof m.armorClassDelta === "number" ? m.armorClassDelta : null,
		atributos,
		escolhasDeAtributo,
		habilidades,
		// Mega Hawlucha tem No Guard E uma segunda habilidade pendente: são compatíveis.
		habilidadePendente: habilidadePendenteNaPedra,
		// Em metros, como o resto do compêndio. O texto tem precedência sobre o campo
		// porque é o texto que corrige o campo zerado (Mega Eelektross).
		deslocamentoBonusM: bonusDoTexto ?? bonusDoCampo,
		deslocamentosConcedidos,
		deslocamentoMetade: lido.efeitos.some((e) => e.tipo === "deslocamentoMetade"),
		deslocamentosPerdidos: lido.efeitos
			.filter((e) => e.tipo === "deslocamentoPerdido")
			.map((e) => e.modo),
		// Só a prosa que nenhuma família leu: as regras de ativação das três especiais e a
		// frase que o parser não estruturou. O que saiu estruturado não se repete aqui.
		outrosTextos: lido.textos,
		// A descrição contaminada NÃO é publicada. Ao contrário do crédito de arte vazado
		// em Swallow (`textosDeMoveContaminados`), que é uma linha num campo separado e dá
		// para ver onde a regra acaba, aqui são até 2.600 caracteres DENTRO do único campo
		// de prosa: a ficha de Mega Delphox mostraria "CA: 17" e a regra de Flower Veil
		// como se fossem dela. A página diz o que aconteceu, com texto de interface, e o
		// original inteiro fica no relatório — o mesmo trato das 74 habilidades sem regra.
		descricao: contaminacao != null ? "" : prosaDaDescricao(descricaoBruta),
		descricaoContaminada: contaminacao != null,
		imagem: typeof m.tokenImage === "string" && m.tokenImage.startsWith("http") ? m.tokenImage : null,
	})

	for (const habilidade of habilidades) {
		if (habilidade.id == null) continue

		const lista = megasPorHabilidade.get(habilidade.nome) ?? []
		lista.push({ pedra: documento.name, forma: m.megaForm, megaId: id, especie: m.species, especieId })
		megasPorHabilidade.set(habilidade.nome, lista)
	}
}

// Pela espécie-base na ordem da Pokédex, com a forma como desempate: é o que mantém Mega
// Charizard X e Y lado a lado, e Mega Mewtwo X e Y juntos num outro ponto da lista.
//
// As três sem espécie-base resolvida (número 0) vão para o FIM, não para o começo: são as
// de dado incompleto, e abrir a listagem com elas as apresentaria como as principais.
megas.sort((a, b) =>
	(a.numero || Number.MAX_SAFE_INTEGER) - (b.numero || Number.MAX_SAFE_INTEGER)
	|| a.nome.localeCompare(b.nome, "pt-BR"))


const habilidades = []
const idsDeHabilidadeUsados = new Set()

for (const documento of documentosDeHabilidade) {
	let id = slug(documento.name)
	while (idsDeHabilidadeUsados.has(id)) id = `${id}-2`
	idsDeHabilidadeUsados.add(id)

	const bruto = textoSimples(documento.system?.description?.value ?? "")

	// Em 74 das 313 a "descrição" é a nota de que o módulo não achou a regra no livro.
	// Publicá-la como descrição mostraria um erro de extração onde se espera uma regra,
	// então o campo sai vazio e a página diz o que aconteceu, com texto de interface.
	const semRegra = regraAusente({ placeholder: flags(documento).placeholder, descricao: bruto })
	if (semRegra) relatorio.habilidadesSemRegra.push({ habilidade: documento.name, texto: bruto })

	const descricao = semRegra ? "" : bruto
	const lido = semRegra ? { efeitos: [], naoInterpretado: [] } : interpretarHabilidade(descricao)

	for (const item of lido.naoInterpretado) {
		relatorio.efeitosDeHabilidadeNaoInterpretados.push({ habilidade: documento.name, ...item })
	}

	habilidades.push({
		id,
		nome: documento.name,
		descricao,
		semRegra,
		efeitos: resolverMoves(lido.efeitos, documento.name),
		megas: megasPorHabilidade.get(documento.name) ?? [],
	})
}

habilidades.sort((a, b) => a.nome.localeCompare(b.nome, "en"))

// Habilidades que nenhuma espécie e nenhuma Mega têm. Oito na v1.33.0: cinco concedem um
// Move homônimo a uma forma alternativa (Air Slash, Overheat, Hydro Pump, Blizzard,
// Leaf Storm) e três não têm portador nenhum (Transformer, Healing Rain, Paper Thin).
const HABILIDADES_COM_PORTADOR = new Set(especies.flatMap((e) =>
	[ ...e.habilidades, ...(e.habilidadeOculta != null ? [ e.habilidadeOculta ] : []) ]))

relatorio.habilidadesSemPortador = habilidades
	.filter((h) => !HABILIDADES_COM_PORTADOR.has(h.nome) && h.megas.length === 0)
	.map((h) => h.nome)

// A fatia que a listagem e a busca carregam. Os efeitos entram achatados, como os
// `resolucoes` e `modos` do índice de Moves: é o que os filtros consultam, e a listagem
// não precisa do texto da descrição para isso.
const indiceDeHabilidades = habilidades.map((h) => ({
	id: h.id,
	nome: h.nome,
	semRegra: h.semRegra,
	imunidadesDeStatus: h.efeitos.filter((e) => e.status != null).map((e) => e.status),
	imunidadesDeTipo: h.efeitos.filter((e) => e.tipoDeMove != null).map((e) => e.tipoDeMove),
	climas: [ ...new Set(h.efeitos.filter((e) => e.tipo === "clima").map((e) => e.clima)) ]
		.filter((c) => c != null),
	// Air Lock e Cloud Nine suprimem o clima inteiro, sem nomear nenhum: sem esta marca
	// elas sairiam da listagem como habilidades que não têm nada a ver com clima.
	suprimeClima: h.efeitos.some((e) => e.tipo === "clima" && e.relacao === "suprime"),
	concedeMove: h.efeitos.some((e) => e.tipo === "moveConcedido"),
	// Quantas Megas concedem a habilidade. Entra no índice porque o cartão precisa dele
	// para não dizer "sem portador" nas três habilidades cujo portador é uma forma Mega —
	// ao contrário da contagem de espécies, que é relação inversa e se calcula na leitura.
	megas: h.megas.length,
}))

// ------------------------------------------------------------------ Itens
// Os itens NÃO estão no pack chamado `items`, que tem dois documentos: uma pasta e o
// Fator Terastal. Os 343 estão em `trainer-features.json`, um saco misto de 522
// documentos e doze categorias — talentos, naturezas, classes de treinador, as mecânicas
// Terastal e Dynamax — do qual `category: "item-treinador"` é uma fatia.
//
// A taxonomia vem da PASTA, e cobre só um quarto do catálogo: 259 dos 343 caem num balde
// chamado "Itens", e as outras quatro pastas (Berries, Hortelãs, Doces, Poções) dividem
// 84. É o mesmo padrão de `PROCEDENCIA_POR_PASTA` na Pokédex — o documento-pasta é um
// registro do próprio pack, com `type: "Item"` e sem `category`.
//
// Por isso o índice publica também `consumivel` e `especie` do dnd5e (`equipment` /
// `consumable` / `container` cruzado com `trinket` / `food` / `potion`): essa divisão
// separa os 343 de verdade, e é independente da pasta.
//
// O preço e o texto são lidos em `itens.mjs`, isolado e com testes — ver o cabeçalho de
// lá para as quatro formas de contaminação da tabela do PDF.
const documentosDeTreinador = carregarOpcional("trainer-features") ?? []
const documentosDeItem = documentosDeTreinador.filter((d) => flags(d).category === "item-treinador")

// As pastas são documentos do próprio pack, como as gerações na Pokédex.
const PASTA_DE_ITEM = new Map(documentosDeTreinador
	.filter((d) => flags(d).category == null && typeof d.name === "string")
	.map((d) => [ d._id, d.name ]))

const NOMES_DE_ITEM = new Set(documentosDeItem.map((d) => d.name))

// Arte achada na PokéAPI para os itens que o módulo deixou sem URL — ver `arte.mjs`, que
// gera este arquivo conferindo cada sprite. Opcional: sem ele o site constrói igual, só
// com menos ícones, e é por isso que a busca na rede não vive dentro do pipeline.
const ARTE_DE_ITEM = existsSync("ferramentas/arte-de-item.json")
	? JSON.parse(readFileSync("ferramentas/arte-de-item.json", "utf8"))
	: {}

const itens = []
const idsDeItemUsados = new Set()

for (const documento of documentosDeItem) {
	let id = slug(documento.name)
	while (idsDeItemUsados.has(id)) id = `${id}-2`
	idsDeItemUsados.add(id)

	const bruto = flags(documento).priceRaw
	const precoNoTexto = String(bruto ?? "").trim()
	const temPreco = precoNoTexto !== ""
	const preco = interpretarPreco(precoNoTexto)

	// O módulo leu a vírgula de "₽20,000" como decimal e gravou 20. Publicamos o valor do
	// TEXTO, que é a fonte, e relatamos — como `prioridadeDeMoveDivergente` nos Moves. Dá
	// para afirmar que a vírgula é separador de milhar porque nenhum dos 343 preços tem
	// centavos.
	if (precoDivergente(precoNoTexto, documento.system?.price?.value ?? 0)) {
		relatorio.precosDeItemDivergentes.push({
			item: documento.name,
			texto: precoNoTexto,
			campo: documento.system?.price?.value ?? 0,
			valor: preco,
		})
	}

	// O cabeçalho da seção do livro, que a v1.34.0 anexou ao fim dos 77 itens novos. Sai
	// da descrição e vira dado: é a taxonomia que o pack não tem, porque `folder` joga 259
	// itens num balde chamado "Itens".
	const { descricao: semTitulo, secao, expansao } = tituloDeSecao(
		textoSimples(documento.system?.description?.value ?? ""))

	// A célula de preço vazia da tabela, anexada ao fim do texto. Aparar é seguro só
	// quando os dois sinais concordam: o token está no fim E o item não tem preço.
	const { descricao: semCelula, aparado } = aparicaoDaCelulaDePreco(semTitulo, temPreco)

	if (aparado != null) {
		relatorio.celulasDePrecoEmItens.push({ item: documento.name, aparado })
	}

	const sujeira = contaminacao(semCelula, {
		temPreco,
		outrosNomes: new Set([ ...NOMES_DE_ITEM ].filter((n) => n !== documento.name)),
	})

	if (sujeira != null) {
		relatorio.textosDeItemContaminados.push({ item: documento.name, marca: sujeira, texto: semCelula })
	}

	// Sem contaminação, o texto é publicado como está — inclusive a referência à página do
	// livro, que é o livro falando de si e não defeito de extração. Contaminado, ele não
	// vai para a página: a de Balm Mushroom traria as descrições de Pearl, Big Pearl e
	// Pearl String emendadas, e a de Mega Pedra diria "durante a NÃO batalha", o oposto da
	// regra. Mesmo trato das descrições de Mega e das 74 habilidades sem regra.
	const descricao = sujeira != null ? "" : semCelula

	if (sujeira == null && referenciaDePagina(descricao)) {
		relatorio.referenciasDePaginaEmItens.push({ item: documento.name, texto: descricao })
	}

	// Cortado no fim (termina em preposição) ou no começo (abre no meio da frase). Os dois
	// são a mesma coisa para quem lê: o módulo não tem a regra inteira. A página diz isso
	// em vez de deixar o leitor achar que a frase pela metade é a regra.
	const incompleto = sujeira == null
		&& descricao !== ""
		&& (textoCortado(descricao) || textoComecaNoMeio(descricao))

	if (incompleto) {
		relatorio.textosDeItemCortados.push({
			item: documento.name,
			onde: textoComecaNoMeio(descricao) ? "começo" : "fim",
			texto: descricao,
		})
	}

	itens.push({
		id,
		nome: documento.name,
		descricao,
		textoContaminado: sujeira != null,
		/** O módulo tem só um pedaço da regra — ver `textosDeItemCortados`. */
		textoIncompleto: incompleto,
		// `null` e não 0: 15 itens-chave do livro não são vendidos (Mega Pedra, Pedra-Chave,
		// Bracelete-Z…), e "₽0" diria que são de graça.
		preco,
		precoTexto: precoNoTexto,
		grupo: PASTA_DE_ITEM.get(documento.folder) ?? null,
		// A seção do livro, só nos itens que a declaram. Sai como o livro escreve: ele
		// mesmo alterna "Itens Seguráveis consumíveis" e "…Consumíveis", e uniformizar a
		// caixa seria corrigir a fonte por conta própria.
		secao,
		expansao,
		// A divisão do dnd5e, que separa os 343 onde a pasta não separa.
		consumivel: documento.type === "consumable",
		recipiente: documento.type === "container",
		especie: documento.system?.type?.value ?? null,
		// A arte vem do mapa que `arte.mjs` gera, e aponta para `static/itens/` — o site
		// serve de si mesmo. Apontar direto para `raw.githubusercontent.com`, como o
		// módulo faz, quebrava de forma intermitente: o endpoint `raw` não é CDN e
		// estrangula quando a listagem pede algumas dezenas de imagens de uma vez.
		//
		// `null` enquanto `dados:arte` não rodar, e nos itens sem arte nenhuma — a página
		// desenha um ícone próprio nesses casos.
		imagem: ARTE_DE_ITEM[documento.name] ?? null,
	})
}

itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

// O elo com a evolução. `interpretarEvolucao` já achava o nome do item no texto do livro,
// mas não tinha catálogo onde resolvê-lo: o nome saía como texto solto. Agora vira link,
// e a ficha do item mostra a relação inversa (quais espécies evoluem com ele), que é
// calculada na leitura, como `evoluiDe` — a pedra declara o item, não o contrário.
const ID_DE_ITEM_POR_NOME = new Map(itens.map((i) => [ i.nome, i.id ]))

for (const especie of especies) {
	for (const evolucao of especie.evolucoes) {
		if (evolucao.item == null) continue

		evolucao.itemId = ID_DE_ITEM_POR_NOME.get(evolucao.item) ?? null
		if (evolucao.itemId == null) {
			relatorio.itensDeEvolucaoNaoResolvidos.push({ especie: especie.nome, item: evolucao.item })
		}
	}
}

// A fatia de Mega que a listagem e a busca carregam. Fica de fora o que só a ficha usa —
// a descrição, a prosa de `outrosTextos` e os fatos de deslocamento, que são de 5 a 10
// casos cada e não sustentam filtro.
//
// `atributosAumentados` e `trocaDeTipo` entram achatados pela mesma razão que `resolucoes`
// no índice de Moves: é o que o filtro consulta, e perguntar "quais Megas aumentam FOR"
// não deve custar a leitura dos 93 registros inteiros.
const indiceDeMegas = megas.map((m) => ({
	id: m.id,
	nome: m.nome,
	pedra: m.pedra,
	especie: m.especie,
	especieId: m.especieId,
	numero: m.numero,
	categoria: m.categoria,
	tipos: m.tipos,
	tamanho: m.tamanho,
	deltaCA: m.deltaCA,
	atributos: m.atributos,
	escolhasDeAtributo: m.escolhasDeAtributo,
	habilidades: m.habilidades,
	habilidadePendente: m.habilidadePendente,
	// Só os atributos que SOBEM: um filtro "aumenta FOR" não deve trazer Mega Hawlucha,
	// que tem `str: -2`. As opções de `abilityChoices` entram porque o jogador pode
	// escolher aquele atributo — é um aumento possível, e o cartão marca a diferença.
	atributosAumentados: [ ...new Set([
		...m.atributos.filter((a) => a.delta > 0).map((a) => a.id),
		...m.escolhasDeAtributo.flatMap((e) => e.opcoes),
	]) ],
	// A soma dos deltas fixos, para ordenar por "quanto a forma ganha". Os deltas
	// negativos entram com o sinal, e a escolha de atributo fica fora: ela vale uma vez,
	// não uma por opção.
	totalDeAtributos: m.atributos.reduce((soma, a) => soma + a.delta, 0),
	trocaDeTipo: m.tipos.length > 0,
	imagem: m.imagem,
}))

// A fatia de Item que a listagem e a busca carregam. Fica de fora a descrição, que é o
// que só a ficha usa.
const indiceDeItens = itens.map((i) => ({
	id: i.id,
	nome: i.nome,
	preco: i.preco,
	precoTexto: i.precoTexto,
	grupo: i.grupo,
	secao: i.secao,
	expansao: i.expansao,
	consumivel: i.consumivel,
	recipiente: i.recipiente,
	especie: i.especie,
	// O cartão precisa saber que a ficha não tem texto inteiro para mostrar, sem carregar
	// o texto.
	textoContaminado: i.textoContaminado,
	textoIncompleto: i.textoIncompleto,
	imagem: i.imagem,
}))

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
escrever("indice-habilidades", indiceDeHabilidades)
escrever("megas", megas)
escrever("indice-megas", indiceDeMegas)
escrever("itens", itens)
escrever("indice-itens", indiceDeItens)
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
console.log(`  habilidades sem regra no módulo: ${relatorio.habilidadesSemRegra.length}`)
console.log(`  efeitos de habilidade declarados e não interpretados: ${relatorio.efeitosDeHabilidadeNaoInterpretados.length}`)
console.log(`  habilidades sem portador: ${relatorio.habilidadesSemPortador.length}`)
console.log(`  habilidades de Mega sem ficha no pack: ${relatorio.habilidadesDeMegaNaoResolvidas.length}`)
console.log(`  Megas cuja espécie-base não casa com a Pokédex: ${relatorio.megasSemEspecieBase.length}`)
console.log(`  descrições de Mega contaminadas na fonte: ${relatorio.descricoesDeMegaContaminadas.length}`)
console.log(`  efeitos de Mega declarados e não interpretados: ${relatorio.efeitosDeMegaNaoInterpretados.length}`)
console.log(`  preços de item divergentes do texto: ${relatorio.precosDeItemDivergentes.length}`)
console.log(`  textos de item contaminados na fonte: ${relatorio.textosDeItemContaminados.length}`)
console.log(`  textos de item cortados na fonte: ${relatorio.textosDeItemCortados.length}`)
console.log(`  células de preço aparadas de itens: ${relatorio.celulasDePrecoEmItens.length}`)
console.log(`  itens de evolução não resolvidos: ${relatorio.itensDeEvolucaoNaoResolvidos.length}`)
console.log(`  Moves de clima ausentes do compêndio: ${relatorio.movesDeClimaAusentes.length}`)
console.log(`  Moves concedidos por habilidade não resolvidos: ${relatorio.movesDeHabilidadeNaoResolvidos.length}`)
