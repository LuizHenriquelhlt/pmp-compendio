import { describe, expect, it } from "vitest"
import { CLIMA_POR_MOVE, interpretarHabilidade, regraAusente } from "../ferramentas/habilidades.mjs"

// As frases destes testes são do corpus da v1.33.0, não inventadas — é o que lhes dá
// valor. Vários casos aqui são armadilhas que uma leitura ingênua inverte: a habilidade
// que diz que NÃO concede imunidade, a que concede imunidade ao OPONENTE, e as duas cujo
// único assunto é o clima e que são justamente as que não nomeiam nenhum.

const efeitos = (texto) => interpretarHabilidade(texto).efeitos
const naoLido = (texto) => interpretarHabilidade(texto).naoInterpretado

describe("regra ausente", () => {
	// O módulo marca 74 das 313 habilidades com `placeholder: true` e grava nelas sempre
	// esta mesma nota, que é diagnóstico de extração e não regra do livro.
	const NOTA = "Regra completa não encontrada no glossário de Habilidades Passivas do Livro de Regras "
		+ "(Geração 7+). Consulte o material de Geração 8/9 ou a descrição da espécie no bloco de estatísticas."

	it("reconhece pelo flag da fonte", () => {
		expect(regraAusente({ placeholder: true, descricao: NOTA })).toBe(true)
	})

	// Os dois sinais são conferidos separadamente de propósito: o flag é a declaração da
	// fonte e o texto é a evidência. Um pipeline que leia só um dos dois passa a errar
	// calado no dia em que o módulo mudar o outro.
	it("reconhece pelo texto, mesmo sem o flag", () => {
		expect(regraAusente({ descricao: NOTA })).toBe(true)
	})

	it("não confunde uma regra de verdade com a nota", () => {
		const adaptability = "Quando este Pokémon usa um Move do seu próprio tipo, ele pode rolar os dados "
			+ "de dano duas vezes e escolher o maior resultado."

		expect(regraAusente({ descricao: adaptability })).toBe(false)
	})
})

describe("imunidade", () => {
	it.each([
		[ "Este Pokémon é imune ao status Confuso.", "confuso" ],
		[ "Este Pokémon é imune ao status Paralisado.", "paralisado" ],
		[ "Este Pokémon é imune ao status Congelado.", "congelado" ],
		[ "Este Pokémon é imune ao status Envenenado.", "envenenado" ],
		[ "Este Pokémon é imune ao status Atordoado.", "atordoado" ],
	])("lê a condição em %j", (frase, status) => {
		expect(efeitos(frase)).toEqual([ { tipo: "imunidade", status } ])
	})

	it("lê as duas condições quando a frase traz as duas", () => {
		expect(efeitos("Este Pokémon é imune às condições Sonolento e Dormindo.")).toEqual([
			{ tipo: "imunidade", status: "sonolento" },
			{ tipo: "imunidade", status: "dormindo" },
		])
	})

	/**
	 * Os nomes de tipo do livro são acentuados, e é aqui que a classe de caracteres
	 * importa: com `\w+` no lugar de `[a-zà-ÿ]+`, "Elétrico" é capturado como "El" e
	 * Volt Absorb perde a imunidade que define a habilidade. Sem este teste, passa calado.
	 */
	it.each([
		[ "Este Pokémon é imune ao dano e efeitos de Moves do tipo Elétrico (incluindo Moves de Status).", "eletrico" ],
		[ "Este Pokémon é imune ao dano e efeitos de Moves do tipo água (incluindo Moves de Status).", "agua" ],
	])("lê o tipo acentuado em %j", (frase, tipoDeMove) => {
		expect(efeitos(frase)).toEqual([ { tipo: "imunidade", tipoDeMove } ])
	})

	// Levitate escreve "terra" onde o resto do corpus escreve "Terrestre". Uma tabela só
	// com os nomes canônicos perderia a habilidade mais conhecida da família.
	it("aceita \"terra\" como Terrestre, que é como Levitate escreve", () => {
		expect(efeitos("Este Pokémon é imune a Moves do tipo terra."))
			.toEqual([ { tipo: "imunidade", tipoDeMove: "terrestre" } ])
	})

	// Water Bubble fala de dois tipos antes de declarar a imunidade, e a imunidade é de
	// condição. Ler a frase inteira misturaria as duas coisas.
	it("não puxa os tipos da frase anterior para a imunidade de condição", () => {
		const waterBubble = "Este Pokémon recebe apenas metade do dano de Moves do tipo fogo, e seus Moves "
			+ "do tipo água têm seus dados de dano dobrados. Além disso, este Pokémon é imune ao status Queimado."

		expect(efeitos(waterBubble)).toEqual([ { tipo: "imunidade", status: "queimado" } ])
	})

	describe("as frases que falam de imunidade sem conceder nenhuma", () => {
		// A pior de todas: Justified é ATINGIDO pelo Move sombrio e ganha estágio por
		// isso. Lido como imunidade, a página publica o oposto do livro.
		it("não lê imunidade onde a habilidade diz que não fornece nenhuma", () => {
			const justified = "Quando este Pokémon é atingido por um Move do tipo sombrio, ele tem seu Ataque "
				+ "aumentado em 1 estágio. Essa habilidade não fornece imunidade nem redução de dano, nem é "
				+ "ativada se um Move do tipo sombrio atingir seu Substitute."

			expect(efeitos(justified)).toEqual([])
			expect(naoLido(justified)).toEqual([])
		})

		// Prankster e Effect Spore concedem a imunidade ao OPONENTE. Sem ancorar no
		// sujeito, o portador ganharia uma imunidade que o livro dá a quem o enfrenta.
		it.each([
			[ "Prankster", "Pokémon do tipo Sombrio são imunes a Moves de inimigos sob efeito de Prankster." ],
			[ "Effect Spore", "Pokémon do tipo Grama são imunes a Effect Spore." ],
		])("não toma a imunidade de terceiros contra a habilidade como sendo do portador (%s)", (_, frase) => {
			expect(efeitos(frase)).toEqual([])
			expect(naoLido(frase)).toEqual([])
		})

		it.each([
			// Fala de imunidade alheia, para negá-la.
			"Esta habilidade não ignora imunidades de tipo.",
			"Não tem efeito sobre a imunidade dos Pokémon do tipo Aço contra Moves do tipo Venenoso que causam dano.",
			// Parentético sobre o atacante, não sobre o portador.
			"Se este Pokémon ficar queimado, paralisado, envenenado ou gravemente envenenado, seu atacante "
			+ "receberá a mesma Condição de Status também (se não for imune).",
			// Muda as imunidades que a forma já tem; não concede nenhuma.
			"Seu STAB, resistências, imunidades e vulnerabilidades mudam para coincidir com a forma que assume.",
			// O marcador de Shields Down retira o que a primeira frase concedeu.
			"• Se um Pokémon que não seja Minior obtiver Shields Down por Imposter ou Transform, o Pokémon não "
			+ "mudará de forma e não será imune a condições de status (mesmo que tenha se transformado em um "
			+ "Minior na Forma Meteoro).",
		])("não lê nem reporta %j", (frase) => {
			expect(efeitos(frase)).toEqual([])
			expect(naoLido(frase)).toEqual([])
		})
	})

	describe("o que o livro declara e o parser não estrutura", () => {
		// O recorte da família são os vocabulários que o PMP publica — as condições de
		// status e os 18 tipos. Imunidade a acerto crítico, a dano indireto ou a Moves de
		// som é regra do livro, e modelá-la exigiria inventar um vocabulário de
		// categorias que o sistema não tem. Então vai para o relatório, com a frase.
		it.each([
			"Este Pokémon é imune a dano extra causado por um acerto crítico, incluindo aqueles causados em testes de resistência.",
			"Este Pokémon é imune a todo tipo de dano indireto.",
			"Este Pokémon é imune a Moves baseados em som, incluindo os seus próprios.",
			"Este Pokémon é imune ao dano causado pelos ataques de seus aliados.",
		])("reporta %j", (frase) => {
			expect(efeitos(frase)).toEqual([])
			expect(naoLido(frase)).toEqual([ { familia: "imunidade", frase } ])
		})

		// "Condições de Status" sem nomear nenhuma, e sob condição de forma: estruturar
		// como imunidade às quinze condições diria que vale sempre, o que é falso.
		it("reporta a imunidade a todas as condições em vez de listá-las", () => {
			const frase = "Este Pokémon é imune a Condições de Status enquanto estiver na Forma Meteoro."

			expect(efeitos(frase)).toEqual([])
			expect(naoLido(frase)).toEqual([ { familia: "imunidade", frase } ])
		})

		// "sono" não é nome de condição no vocabulário do PMP (que tem Sonolento e
		// Dormindo). Mapear para as duas é adivinhar; e a imunidade é dos aliados.
		it("reporta \"condição de sono\" em vez de traduzi-la para as duas condições", () => {
			const sweetVeil = "Qualquer aliado dentro de 15 pés (4,5 metros) deste Pokémon "
				+ "(incluindo ele próprio) é imune à condição de sono."

			expect(efeitos(sweetVeil)).toEqual([])
			expect(naoLido(sweetVeil)).toEqual([ { familia: "imunidade", frase: sweetVeil } ])
		})

		// Wonder Guard usa "dos tipos" (plural) para dizer o OPOSTO — quais tipos
		// conseguem atingi-lo. Daí o extrator exigir o singular "do tipo".
		it("não lê os tipos que Wonder Guard diz que ATINGEM o portador", () => {
			const wonderGuard = "Este Pokémon é imune a Moves que causam dano e que não sejam super eficazes. "
				+ "Apenas Shedinja pode possuir essa habilidade; ela não pode ser transferida ou trocada. "
				+ "Isso significa que, no caso de Shedinja, apenas Moves dos tipos Fogo, Voador, Pedra, "
				+ "Fantasma e Sombrio conseguem atingi- lo."

			expect(efeitos(wonderGuard)).toEqual([])
			expect(naoLido(wonderGuard).map((n) => n.familia)).toEqual([ "imunidade" ])
		})
	})
})

describe("clima", () => {
	it("lê o clima gerado pelo Move que a habilidade nomeia", () => {
		const drizzle = "Quando este Pokémon entra em uma batalha, ele imediatamente gera os efeitos do Move Rain Dance."

		expect(efeitos(drizzle))
			.toEqual([ { tipo: "clima", relacao: "gera", clima: "chuva", move: "Rain Dance" } ])
	})

	it.each([
		[ "Sunny Day", "sol" ],
		[ "Sandstorm", "tempestade-de-areia" ],
		[ "Hail", "granizo" ],
	])("lê %s como %s", (move, clima) => {
		const frase = `Quando este Pokémon entra em uma batalha, ele imediatamente gera os efeitos do Move ${move}.`
		expect(efeitos(frase)).toEqual([ { tipo: "clima", relacao: "gera", clima, move } ])
	})

	// Delta Stream é a única que cria clima sem nomear um Move.
	it("lê o clima criado diretamente, sem Move", () => {
		expect(efeitos("Delta Stream cria ventos fortes quando a habilidade é ativada."))
			.toEqual([ { tipo: "clima", relacao: "gera", clima: "ventos-fortes" } ])
	})

	/**
	 * Air Lock e Cloud Nine são o motivo de `suprime` estar no sinal da família: as duas
	 * habilidades cujo assunto é só o clima são justamente as únicas que não nomeiam
	 * nenhum, e um sinal feito apenas do vocabulário de climas as deixava de fora.
	 */
	it("lê a supressão do clima inteiro, que não nomeia clima nenhum", () => {
		const airLock = "Enquanto este Pokémon estiver em batalha, Air Lock suprime todos os efeitos causados "
			+ "pelo clima, incluindo aumentos no dano dos golpes, dano ao final do turno, alterações na "
			+ "precisão, habilidades passivas, Moves relacionados e assim por diante."

		expect(efeitos(airLock)).toEqual([ { tipo: "clima", relacao: "suprime", clima: null } ])
	})

	// Quatro habilidades declaram proteção contra o dano do clima SEM a palavra "imune".
	// Procurar só "imune" perde Overcoat, Slush Rush, Sand Rush e Sand Force.
	it("lê a proteção escrita sem a palavra \"imune\"", () => {
		const overcoat = "Este Pokémon não sofre dano das condições climáticas de tempestade de areia e "
			+ "tempestade de granizo, e também é protegido contra Moves que contenham 'Powder' e 'Spore' em seu nome."

		expect(efeitos(overcoat)).toEqual([
			{ tipo: "clima", relacao: "protege", clima: "granizo" },
			{ tipo: "clima", relacao: "protege", clima: "tempestade-de-areia" },
		])
	})

	it("guarda os dois fatos quando a habilidade se beneficia do clima E se protege dele", () => {
		const slushRush = "Durante uma Tempestade de Granizo, todos os deslocamentos deste Pokémon são "
			+ "dobrados. Além disso, este Pokémon não recebe dano da Tempestade de Granizo se normalmente "
			+ "fosse afetado por ela."

		expect(efeitos(slushRush)).toEqual([
			{ tipo: "clima", relacao: "protege", clima: "granizo" },
			{ tipo: "clima", relacao: "interage", clima: "granizo" },
		])
	})

	// Forecast muda de tipo conforme três climas. Listar os três é o que o livro diz —
	// aqui não há tabela achatada a desconfiar, a regra mesmo é tripla.
	it("lê os três climas de uma regra que depende dos três", () => {
		const forecast = "Na chuva, torna-se do tipo água; na luz solar intensa, torna-se do tipo fogo; "
			+ "em condições frias e nevadas, torna-se do tipo gelo."

		expect(efeitos(forecast)).toEqual([
			{ tipo: "clima", relacao: "interage", clima: "chuva" },
			{ tipo: "clima", relacao: "interage", clima: "neve" },
			{ tipo: "clima", relacao: "interage", clima: "sol" },
		])
	})

	/**
	 * Granizo e neve são climas distintos no PMP: o pack de Moves tem `Hail`, `Snowscape`
	 * e `Chilly Reception` separados. Snow Cloak cita os dois na mesma frase, e mesclá-los
	 * inventaria uma regra.
	 */
	it("distingue granizo de neve", () => {
		const snowCloak = "Este Pokémon é imune ao dano por turno causado pela Tempestade de Granizo. "
			+ "Além disso, em condições árticas ou quando está nevando ou granizando, este Pokémon recebe "
			+ "um bônus de +2 em sua CA e em seus testes de resistência."

		expect(efeitos(snowCloak)).toEqual([
			{ tipo: "clima", relacao: "protege", clima: "granizo" },
			{ tipo: "clima", relacao: "interage", clima: "granizo" },
			{ tipo: "clima", relacao: "interage", clima: "neve" },
		])
	})

	it("não repete como \"interage\" o clima que a habilidade gera", () => {
		const drizzle = "Quando este Pokémon entra em uma batalha, ele imediatamente gera os efeitos do Move "
			+ "Rain Dance. Se Drizzle for ativado enquanto já houver uma chuva ativa (se outro Pokémon com "
			+ "Drizzle entrar em campo ou se o próprio usuário sair e retornar à batalha), a duração da "
			+ "chuva não é reiniciada."

		expect(efeitos(drizzle))
			.toEqual([ { tipo: "clima", relacao: "gera", clima: "chuva", move: "Rain Dance" } ])
	})

	// Sem nomear um clima, a frase não entra na família — é o que dispensa a lista de
	// citações que as outras famílias precisam ter.
	it.each([
		"• Disguise não protege contra dano de clima.",
		"Se múltiplos Pokémon com habilidades que geram clima (Drizzle, Drought, Sand Stream ou Snow Warning) "
		+ "entrarem no campo ao mesmo tempo, a condição climática resultante será a do Pokémon mais lento na "
		+ "ordem de iniciativa.",
	])("ignora a frase que fala de clima sem nomear nenhum: %j", (frase) => {
		expect(efeitos(frase).filter((e) => e.tipo === "clima")).toEqual([])
		expect(naoLido(frase).filter((n) => n.familia === "clima")).toEqual([])
	})

	it("reporta o Move de clima que a tabela não conhece, em vez de adivinhar o clima", () => {
		const frase = "Quando este Pokémon entra em uma batalha, ele imediatamente gera os efeitos do Move Hurricane Season."

		expect(efeitos(frase)).toEqual([])
		expect(naoLido(frase)).toEqual([ { familia: "clima", frase } ])
	})

	it("só nomeia Moves que o compêndio publica", () => {
		// `construir.mjs` confere estas chaves contra o dicionário de Moves; o teste
		// garante que a tabela não ganhe um clima sem Move que o sustente.
		expect(Object.keys(CLIMA_POR_MOVE))
			.toEqual([ "Rain Dance", "Sunny Day", "Sandstorm", "Hail", "Snowscape" ])
	})
})

describe("Move concedido", () => {
	it.each([
		[ "Este Pokémon conhece Blizzard como um quinto Move.", "Blizzard" ],
		[ "Este Pokémon conhece Air Slash como um quinto Move.", "Air Slash" ],
		[ "Este Pokémon conhece Hydro Pump como um quinto Move.", "Hydro Pump" ],
		[ "Este Pokémon conhece Leaf Storm como um quinto Move.", "Leaf Storm" ],
		// A única das cinco que escreve "o Move" antes do nome.
		[ "Este Pokémon conhece o Move Overheat como um quinto Move.", "Overheat" ],
	])("lê %j", (frase, move) => {
		expect(efeitos(frase)).toEqual([ { tipo: "moveConcedido", move } ])
	})

	// Forewarn casa `conhece` por outro motivo: ele LÊ o Move do alvo. O desempate é
	// `conhece … como`, não `conhece` sozinho.
	it("não confunde ler o Move do alvo com conceder um Move", () => {
		const forewarn = "Quando este Pokémon entra em batalha, ele seleciona um alvo para revelar o Move "
			+ "que conhece com maior potência de dano. Caso haja mais de um Move com mesmo dano, o alvo "
			+ "pode escolher qual revelar."

		expect(efeitos(forewarn)).toEqual([])
		expect(naoLido(forewarn)).toEqual([])
	})
})
