# Compêndio PMP

*Referência do sistema **Pokémon Mundo Perfeito**, em português do Brasil.*

Site estático de consulta para o PMP: statblocks de espécies, fichas de Move, Habilidade
Passiva, Mega Evolução e item, com busca e filtros, pensado para ser aberto no meio de uma
sessão.
Construído em
[SvelteKit](https://svelte.dev/docs/kit), sem servidor e sem banco — tudo é gerado no build.

## Conteúdo não acompanha o código

O sistema Pokémon Mundo Perfeito é obra da sua comunidade autora. Este repositório
carrega **apenas o programa**: `dados/` e `dados-crus/` estão no `.gitignore`, e o
conteúdo é gerado na máquina de quem executa, a partir do módulo Foundry do PMP.

Sem essa etapa, o site não constrói — por desenho.

## Rodando

Pré-requisitos: Node.js 20+ (testado no 24) e o módulo Foundry
`pokemon-mundo-perfeito` extraído em algum lugar.

```bash
npm install

# 1. Converte os compêndios LevelDB do módulo em JSON cru (dados-crus/)
npm run dados:desempacotar -- "../pokemon-mundo-perfeito"

# 2. Normaliza para o formato do site (dados/)
npm run dados:construir

# 3. Procura na PokéAPI a arte dos itens que o módulo deixou sem URL (opcional)
npm run dados:arte

# 4. Sobe o site em http://localhost:5173
npm run dev
```

Os dois passos de dados juntos: `npm run dados`.

> **`dados-crus/sem-genero.json` não vem do módulo.** O módulo gravou todas as espécies
> como 50/50, e a lista das que não têm gênero foi tirada do PDF à mão. Ela não é
> regenerada pelo passo 1: se você desempacotar numa pasta limpa, copie o arquivo para lá
> antes do passo 2, senão as espécies sem gênero voltam a sair 50/50 — e o aviso é só um
> `console.warn` fácil de não ver.

Se você já tem os packs desempacotados em outro lugar, aponte o segundo passo para lá:

```bash
npm run dados:construir -- ../pmp-rpg/data/raw dados
```

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Gera o site estático em `build/` (uma página por espécie, Move, Habilidade, Mega e item) |
| `npm run dados:arte` | Procura na PokéAPI a arte dos itens sem URL no módulo (faz rede) |
| `npm run preview` | Serve o build de produção |
| `npm run teste` | Roda a suíte de testes |
| `npm run verificar` | Checagem de tipos (`svelte-check`) |

## No Docker

```bash
npm run dados            # uma vez: o conteúdo não está no git
docker compose up --build   # abre em http://localhost:8081
```

As páginas são assadas no build da imagem, então conteúdo novo pede um `--build` novo.

**Por que existe um `nginx.conf` aqui.** O adapter-static grava uma rota por ARQUIVO, não
por pasta: `/moves` é `moves.html`, `/sobre` é `sobre.html`, `/moves/absorb` é
`moves/absorb.html`. O `npm run dev` e o `npm run preview` tentam a extensão sozinhos, mas
um servidor estático comum não — ele devolve 404 em `/sobre` e redireciona `/moves` para
`/moves/`, uma pasta sem `index.html`. Fora do modo de desenvolvimento, isso quebra todas
as abas. O `try_files $uri $uri.html` do [nginx.conf](nginx.conf) é o que resolve.

A alternativa seria `trailingSlash: "always"` no SvelteKit, que faz o build emitir
`pasta/index.html` — mas mudaria toda a forma das URLs (`/moves/` em vez de `/moves`),
inclusive as de espécie, que já estão decididas. Preferimos adaptar o servidor ao desenho
das URLs. Quem for publicar isso em outro lugar precisa da mesma regra: tentar `.html`
antes de desistir.

## Como os dados chegam aqui

```
módulo Foundry          dados-crus/*.json          dados/*.json              build/
(packs LevelDB)   ──→   (documentos crus)   ──→    (formato do site)   ──→   (HTML assado)
               desempacotar.mjs          construir.mjs              vite build
```

O módulo guarda cada espécie em `flags["pokemon-mundo-perfeito"].species` e cada Move em
`flags["pokemon-mundo-perfeito"].move`, já com os campos tipados (`dexNumber`,
`armorClass`, `moveTable`, `moveType`, `pp`, `range`…). O pipeline lê desses campos e só
interpreta texto onde o módulo guarda prosa — ou onde o campo não quer dizer o que o
nome promete:

| Campo do módulo | Por que não dá para usar direto |
|---|---|
| `damage.baseFormula`, `damage.scaling` | São "os dados do Move", não "os dados de dano": Recover guarda 2d6 de **cura** ali, e 16 Moves escalonam cura |
| `category` | String vazia nos 833 Moves — a categoria de resolução só existe no texto |
| `system.activities[].type` | É a modelagem do Foundry: 75 Moves marcados como `attack` são **disputas** no livro |
| `activation.type` | Guarda só o primeiro modo: os 18 Moves de "1 ação / reação" ficam como `action` |
| `priority` | Zerado em 3 Moves que declaram prioridade no próprio texto |

As Habilidades Passivas vêm do pack `abilities`, e ele é o mais pobre dos três: de todos
os campos do documento, só `name`, `system.description.value` e o flag `placeholder`
variam nas 313. Tudo o mais é constante, e alguns campos enganam pelo nome:

| Campo do módulo | Por que não dá para usar direto |
|---|---|
| `flags[…].category` (habilidade) | `"habilidade-passiva"` nas 313 — promete um vocabulário de categorias e entrega uma constante. Não há taxonomia de habilidade no módulo |
| `species.passiveAbility.active` | É exatamente `options[0]` nas 1.149 espécies. No PMP o jogador **escolhe** entre as opções; publicar `active` inventa uma escolha que o livro não faz |
| `mega.abilityChoices` | Não é escolha de Habilidade: o conteúdo é `{ options: ["str","dex"], delta: 5 }` — é o *ability score* do dnd5e, ou seja, **atributo** |
| `system.description.value` (habilidade) | Em 74 das 313 não é regra, e sim a nota de que o módulo não achou a regra no livro |

Em compensação, as referências de habilidade das fichas de espécie vêm **limpas**: as
2.662 entradas de `passiveAbility.options` e `hiddenAbility` casam com o pack nas 2.662,
sem nenhum dos defeitos de extração que obrigam a reparar `moveTable`, `tms` e
`eggMoves`. Por isso ali não há reparador.

Duas assimetrias que a modelagem precisa respeitar: **"oculta" é propriedade do par
espécie–habilidade**, não da habilidade (139 das 302 com portador são padrão em uma
espécie e ocultas em outra), e **três habilidades não pertencem a espécie nenhuma da
Pokédex** — quem as tem é uma forma Mega, declarada em `mega-evolutions.json`.

O pack `mega-evolutions` é o oposto do `abilities`: treze campos de `flags[…].mega`
carregam dado útil nas 93 pedras, e nada do documento Foundry em volta serve (`system.*` é
constante nas 93). Quase tudo sai de campo. Em compensação, é onde o texto está pior:

| Campo do módulo | Por que não dá para usar direto |
|---|---|
| `flags[…].species`, `flags[…].megaForm` | Os duplicados de topo **não existem** nas 3 pedras especiais. Quem os lê em vez de `mega.*` perde Groudon, Kyogre e Rayquaza em silêncio |
| `mega.abilityChoices` | Não é escolha de Habilidade: é escolha de **atributo** (o *ability score* do dnd5e). O próprio módulo escreve "+5 em FOR ou DES (à escolha do jogador)" |
| `movementBonusFeet` | Está em **pés**, enquanto a Pokédex grava deslocamento em metros em 1.148 das 1.149. A equivalência (0,3 m/pé) é declarada 3 vezes no próprio corpus |
| `movementBonusFeet: 0`, `movementGrants: []` | Querem dizer "campo não preenchido", não "não há": Mega Eelektross declara "+ 10 pés" e Mega Delphox ganha voo de 40 pés **só na prosa** |
| `types.type2: null` com `type1` preenchido | Não é dado faltando: é **monotipo**. Mega Aggron vem de Aço/Pedra e fica Aço puro, e o módulo renderiza "Tipo muda para Aço" |
| `size` | Usa 4 degraus onde as espécies usam 6 (`tiny` e `huge` só existem na base). E o texto de Mega Hawlucha pede "Imenso", palavra que a escala do PMP não tem |
| `otherEffects` | 10 frases em 10 pedras, e nenhuma é redundante: elas **corrigem** os campos acima. Uma está truncada no meio ("Snow Warning (torna-se Snow") |
| `passiveAbility` | Vazio em 4 pedras — mas **duas delas** declaram a habilidade em `otherEffects`, e a de Mega Floette (Fairy Aura) existe no pack |
| `description` | 4 das 93 carregam texto de outro documento: a de Mega Delphox traz um bloco de estatísticas de espécie inteiro, a de Mega Hawlucha traz o statblock do Move Nihil Light |
| `img` | 42 são SVG de tipo, 48 são PNG de item e 3 são um ícone genérico. Usá-lo como sinal de tipo acerta em 42 e inventa em 51 |

O `<ul>` de `system.description.value` fica de fora por inteiro: agrupando os 475 `<li>`
do corpus em formas de frase, **todas** saem de um campo estruturado. Nenhum fato vive só
ali — o que ele dá de graça é o vocabulário em português do próprio módulo, que a
interface copia.

`category` merece nota por ser um dos raríssimos campos de categoria do módulo que de fato
**variam** (90 `mega-stone`, 3 `mega-stone-especial`). O que ele distingue não é "Primal":
são duas Reversões Primal (Groudon, Kyogre) mais um Pokémon que Mega Evolui sem pedra
nenhuma (Rayquaza). O que as três têm em comum é não seguir a regra comum da Mega Pedra.

Três consequências para a modelagem: **nenhuma das 93 formas existe como espécie na
Pokédex** (o link vai para a espécie-base, que casa em 90), **seis espécies têm duas
pedras** (Charizard, Mewtwo e Raichu com X e Y; Garchomp, Absol e Lucario com a forma Z),
e **a relação Mega↔habilidade é N:N** — Magic Bounce e Tough Claws são concedidas por
quatro pedras cada.

Os **itens** não estão no pack chamado `items`, que tem dois documentos: uma pasta e o
Fator Terastal. Os 420 estão em `trainer-features.json`, um saco misto de 600 documentos e
onze categorias mais 64 pastas (talentos, naturezas, classes de treinador, as mecânicas
Terastal e Dynamax), do qual `category: "item-treinador"` é a maior fatia:

| Campo do módulo | Por que não dá para usar direto |
|---|---|
| `system.price.value` | Está **1000x menor** em 2 itens: o módulo leu a vírgula de `"₽20,000"` como decimal e gravou 20. O pack mistura as duas convenções de milhar — 150 itens escrevem `₽1.500` e 2 escrevem `₽20,000` —, e nenhum dos 343 tem centavos |
| `system.price.value: 0` | Não é "de graça": 31 itens-chave (Mega Pedra, Pedra-Chave, Bracelete-Z, Cristal-Z…) o livro não vende. É `null`, como o `armorClassDelta` das Megas |
| `system.description.value` | A tabela do PDF vazou para dentro em 10 itens, de quatro jeitos — ver abaixo |
| `folder` | É a taxonomia mais fraca do pack: 310 dos 420 caem num balde chamado "Itens"; Berries, Tera Shards, Hortelãs, Doces e Poções dividem 110 |
| `img` | 190 dos 420 apontam para a biblioteca de ícones do próprio Foundry (`icons/equipment/…`), que não é publicada com o site. Destes, 66 são itens Pokémon que a PokéAPI tem e o módulo só não linkou — ver "A arte dos itens" |

As quatro formas de contaminação do texto, todas da extração do PDF:

1. **A célula de preço no FIM** (7 itens): "Permite que Hoopa mude de forma. **N/A**". É o
   único caso seguro de aparar, porque dois sinais independentes concordam — o token está
   no fim *e* o item não tem preço.
2. **A célula no MEIO da frase** (6): "o dano duas **N/A** vezes".
3. **O rótulo "Não vendido" partido** (2): em Mega Pedra o "Não" caiu no meio e o
   "vendido" no fim, e lido como está a regra vira o oposto — "durante a **não** batalha".
4. **A descrição de outro item emendada** (5): Balm Mushroom traz Pearl, Big Pearl e Pearl
   String juntos; Soul Dew e Everstone trazem a tabela dos Genesect Drives.

Nos 10 contaminados a descrição **não é publicada**, como nas descrições de Mega e nas 74
habilidades sem regra: publicá-la atribuiria ao item uma regra que não é dele. Os 7 do
caso 1 são aparados e publicados normalmente.

A v1.34.0 trouxe um quinto padrão, e esse **carrega informação**: os 77 itens das
expansões de Galar e Paldea têm o cabeçalho da seção do livro colado no fim da descrição
("Itens Evolutivos — Expansão da Nona Geração (Paldea)"). Em vez de descartar, o pipeline
o extrai para `secao` e `expansao` — vira a taxonomia que a pasta não dá, com 12 seções
("Itens Evolutivos", "Fósseis", "Lista de Tera Shards", "Itens-Chave"…). O padrão exige o
travessão e a forma "Expansão da … Geração (…)" na última linha, porque quatro itens
antigos têm segundo parágrafo legítimo e não podem perder nada.

Cinco Berries (Iapapa, Aguav, Wiki, Figy e Mago) compartilham uma descrição cortada
exatamente na palavra que as distingue — "causa confusão caso seja de Natureza" —, e seis
itens mandam o leitor virar a página do livro ("veja a página seguinte"), que num site não
existe. Os dois casos ficam visíveis e vão para o relatório.

### A arte dos itens

O módulo preenche `img` com uma URL da PokéAPI em 230 dos 420 itens e deixa os outros 190
apontando para a biblioteca de ícones interna do Foundry, que não é publicada com o site.
Mas boa parte desses 190 são itens Pokémon de verdade que a PokéAPI tem — o módulo só não
linkou. `npm run dados:arte` acha e confere: **66 itens** ganham arte assim, subindo a
cobertura de 230 para 296.

Ela roda **fora** do pipeline de propósito, porque faz rede e `construir.mjs` precisa ser
offline e determinístico. O resultado é `ferramentas/arte-de-item.json`, que o pipeline lê
como qualquer outro dado — e que é opcional: sem ele o site constrói igual, só com menos
ícones. Cada candidato leva um pedido HEAD e **só entra o que responder 200**, que é o que
impede o site de voltar a mostrar 404 no lugar de um ícone.

Os 124 que continuam sem arte não são um problema a resolver com outra fonte:

- **A maior parte é equipamento de aventura que o PMP inventou** — Chaleira, Cantil,
  Bússola, Canivete de Bolso, Tenda, Saco de Dormir, Pacote de Explorador. Não são itens
  Pokémon; não existe arte oficial deles em fonte nenhuma, e o ícone genérico do Foundry
  que o módulo escolheu é a arte certa para uma chaleira.
- **As 20 Hortelãs** têm sprite na PokéAPI, mas o PMP renomeou as Naturezas e as remapeou
  para atributos de D&D: "Teimoso" e "Astuto" não têm correspondente entre as 25 Naturezas
  oficiais. Casar por semelhança publicaria uma associação que o livro não faz. O sprite
  existir não é prova de que o mapeamento está certo — `timid-mint` existe, e isso não
  torna a Hortelã da Astúcia uma Timid Mint.
- **Cristal-Z, Mega Pedra e os 19 Tera Shards** são genéricos no PMP; a PokéAPI só tem os
  específicos (um por tipo, um por espécie).

A tabela de tradução de `arte.mjs` só aceita o que é **inequívoco** — as três máscaras de
Ogerpon, os quatro Nectares, Orbe Tera, Pedra-Chave, Bracelete-Z, Pulseira Dynamax.

**O pipeline não inventa dado.** O que não for possível interpretar com segurança vai
para `dados/relatorio.json`, com o texto original, para conferência no livro e correção
na fonte. O relatório cobre:

| Campo | O que lista |
|---|---|
| `deslocamentoIncompleto` | Espécies cujo deslocamento está truncado no módulo (66 na v1.34.0) |
| `movesNaoResolvidos` | Entradas das listas de Move das fichas que o reparo não reconheceu (29 na v1.34.0) |
| `evolucoesNaoResolvidas` | Evoluções cujo alvo não existe no compêndio |
| `evolucoesSuspeitas` | Evoluções em que o estágio não aumenta |
| `formasOrfas` | Formas de estágio >1 para as quais nenhuma espécie evolui (23 na v1.34.0) |
| `tiposDesconhecidos`, `tamanhosDesconhecidos`, `tiposDeMoveDesconhecidos` | Valores fora do vocabulário esperado |
| `alcanceDeMoveTruncado` | Moves com o campo de alcance cortado na fonte (1 na v1.34.0) |
| `prioridadeDeMoveDivergente` | Moves em que o campo `priority` discorda do texto (3 na v1.34.0) |
| `dadosDeMoveNaoClassificados` | Moves cujos dados não deu para dizer se são de dano ou de cura (1 na v1.34.0) |
| `efeitosDeMoveNaoInterpretados` | Frases que **declaram** um efeito mecânico que o parser não estruturou (24 na v1.34.0) |
| `textosDeMoveContaminados` | Texto de regra com conteúdo vazado de outro lugar, como crédito de arte (1 na v1.34.0) |
| `habilidadesSemRegra` | Habilidades cuja regra o módulo não achou no livro, com a nota original (74 na v1.34.0) |
| `efeitosDeHabilidadeNaoInterpretados` | Frases que declaram um efeito de habilidade que o parser não estruturou (13 na v1.34.0) |
| `habilidadesSemPortador` | Habilidades que nenhuma espécie e nenhuma Mega têm (8 na v1.34.0) |
| `habilidadesDeMegaNaoResolvidas` | Habilidades que uma pedra Mega nomeia e que não existem no pack (20 na v1.34.0: 8 nomes reais, 11 vezes a marca de pendência `"[ainda a ser lançada]"` e 1 truncada na fonte) |
| `megasSemEspecieBase` | Megas cuja espécie-base não casa com a Pokédex, com os nomes candidatos (3 na v1.34.0) |
| `descricoesDeMegaContaminadas` | Descrições de Mega com texto de outro documento do livro, com a marca que o denunciou e o original (4 na v1.34.0) |
| `efeitosDeMegaNaoInterpretados` | Frases de `otherEffects` que declaram um efeito que o parser não estruturou (1 na v1.34.0: o tamanho "Imenso") |
| `tiposDeMegaDesconhecidos`, `tamanhosDeMegaDesconhecidos`, `deslocamentosDeMegaDesconhecidos`, `camposDeMegaNaoInterpretados`, `categoriasDeMegaDesconhecidas` | Valores de Mega fora do vocabulário ou do formato esperado (0 na v1.34.0) |
| `precosDeItemDivergentes` | Itens em que o número do módulo discorda do preço impresso (2 na v1.34.0, os dois 1000x menores) |
| `textosDeItemContaminados` | Itens cujo texto carrega conteúdo de outra linha da tabela, com a marca e o original (10 na v1.34.0) |
| `celulasDePrecoEmItens` | Células de preço aparadas do fim do texto (7 na v1.34.0) |
| `textosDeItemCortados` | Itens cujo texto foi cortado antes de dizer a regra (8 na v1.34.0) |
| `referenciasDePaginaEmItens` | Itens que mandam virar a página do livro (6 na v1.34.0) |
| `itensDeEvolucaoNaoResolvidos` | Itens citados numa evolução que não têm ficha (0 na v1.34.0) |
| `movesDeClimaAusentes`, `movesDeHabilidadeNaoResolvidos` | Moves nomeados por uma habilidade que não existem no compêndio (0 na v1.34.0) |

Boa parte dessas categorias aponta lacunas no texto do próprio livro, não falhas do
pipeline — são a lista de trabalho para melhorar o módulo.

`efeitosDeMoveNaoInterpretados` merece nota: cada família de efeito tem um detector de
**sinal** (largo) e um extrator (estreito), e só vai para o relatório a frase que declara
o efeito sem que nada tenha sido extraído. É o que separa "o livro não declara isso" de
"o livro declara e eu não entendi" — sem os dois limiares, a segunda some em silêncio.

## Estrutura

```
Dockerfile          build do site + nginx que serve as rotas (ver "No Docker")
nginx.conf          try_files $uri $uri.html — sem isso as rotas dão 404
ferramentas/        pipeline de dados (Node puro, fora do app)
  desempacotar.mjs    packs LevelDB → JSON cru
  construir.mjs       JSON cru → formato do site
  evolucao.mjs        interpretação do texto de evolução (isolada por ser frágil)
  moves.mjs           alcance, ativação, resolução, dados e reparo de nomes de Move
  efeitos.mjs         efeitos mecânicos do texto do Move (a parte mais frágil de todas)
  habilidades.mjs     imunidade, clima e Move concedido no texto da Habilidade
  megas.mjs           habilidade, tamanho e deslocamento no texto da pedra Mega; contaminação
  itens.mjs           preço do item e as quatro contaminações da tabela do PDF
  texto.mjs           HTML→texto, slug, deslocamento, sentidos
mensagens/          catálogos de interface, um por idioma
src/
  lib/pmp/            domínio: tipos, atributos, tamanhos, busca, espécie, move, habilidade, mega, item
  lib/dados/          leitura dos JSONs durante o prerender (só servidor)
  lib/i18n/           acesso às mensagens
  lib/ui/             design system e componentes
  rotas/              páginas (SvelteKit)
testes/             testes do pipeline
```

Os seis módulos de interpretação (`evolucao`, `moves`, `efeitos`, `habilidades`, `megas`,
`itens`) são separados de `construir.mjs` pela mesma razão: leem prosa do livro, cada
padrão novo é uma chance de ler errado, e isolados cada padrão vira um teste. As
entradas dos testes são frases do corpus real, não inventadas.

Em `habilidades.mjs` o risco tem nome: a palavra "imune" aparece 37 vezes no corpus e em
11 delas **não** é imunidade de quem tem a habilidade. Justified diz que *não* fornece
imunidade, Prankster concede a imunidade ao **oponente**, e Shields Down retira num
marcador o que concedeu na primeira frase. Por isso a família de imunidade ancora no
sujeito (`Este Pokémon é imune a…`) e traz a lista de citações junto.

Em `megas.mjs` o risco é outro: o corpus da família é **minúsculo** — dez frases em dez
das 93 pedras —, e com dez exemplos é fácil escrever um padrão que casa os dez por
acidente. Por isso os testes trazem as dez na íntegra, e não uma amostra, e cada uma
está anotada com o campo estruturado que ela contradiz. A detecção de contaminação da
descrição é conferida nos dois sentidos: pega as 4 sujas e não acusa a maior das 89
limpas.

Em `itens.mjs` a armadilha é a vírgula — a mesma que estas ferramentas repetem desde o
pack de Moves, desta vez cometida pela própria fonte. E um caso que só apareceu rodando:
o detector de texto cortado usava `` antes da palavra, e `/a\s*$/` **casa dentro de
"Força"** — sem a flag `u`, o `\w` do JavaScript é só ASCII, "ç" não é caractere de
palavra e abre uma fronteira ali. As 20 Hortelãs, que terminam em "-2 Força" e estão
completas, iam todas para o relatório. A âncora passou a ser um espaço.

Os dados são lidos de `dados/` **durante o prerender** e ficam assados em cada página.
Eles não vão para `static/`: o site publicado contém as páginas renderizadas, não um
dump do conteúdo do sistema.

## Idiomas

O compêndio nasce em pt-BR e os identificadores do conteúdo são os nomes em português
(`/pokemon/weezing-de-galar`). Ainda assim nenhum texto de interface está escrito dentro
dos componentes. Ver [docs/localizacao.md](docs/localizacao.md) para o que é preciso
para somar um idioma.

## Créditos

- **Sistema Pokémon Mundo Perfeito** — comunidade autora do PMP.
- **Módulo Foundry** [`pokemon-mundo-perfeito`](https://github.com/LuizHenriquelhlt/pokemon-mundo-perfeito), origem dos dados.
- **Artes** — [PokéAPI](https://pokeapi.co).

Projeto de fã, sem fim lucrativo. Pokémon é marca registrada de Nintendo, Game Freak e
The Pokémon Company; não há vínculo nem endosso de nenhuma delas, nem da Wizards of the
Coast.
