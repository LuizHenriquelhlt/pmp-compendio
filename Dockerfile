# O Compêndio PMP em um container: site estático servido por nginx.
#
# O conteúdo do PMP (dados/) vem do módulo do Foundry e NÃO está no git: gere-o antes
# com `npm run dados`. Ele é lido durante o prerender e fica assado nas páginas, então
# precisa existir no momento do build da imagem — não em tempo de execução.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: o `prepare` roda `svelte-kit sync`, que precisa do svelte.config.js —
# e ele só é copiado no passo seguinte. O `vite build` sincroniza sozinho de qualquer jeito.
RUN npm ci --ignore-scripts

COPY . .

# Sem os dados, o prerender falharia lá na frente com um erro de arquivo não encontrado.
# Avisar aqui diz o que fazer em vez de só dizer o que quebrou.
RUN test -f dados/indice.json \
	|| (echo "Faltam os dados do PMP em dados/. Rode 'npm run dados' antes do docker build." && exit 1)

RUN npm run build

# `stable-alpine` em vez de uma versão fixa: é a única tag do nginx que nunca deixa de
# existir, e aqui o servidor só entrega arquivo estático — não há superfície de API para
# uma atualização quebrar.
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
	CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
