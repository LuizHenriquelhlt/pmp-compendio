<script lang="ts">
	import { browser } from "$app/environment"
	import { t } from "$i18n"

	/**
	 * `undefined` = seguir o sistema. Só passa a "claro"/"escuro" quando o leitor
	 * escolhe explicitamente; a escolha fica em `data-tema` no <html>, que é o que
	 * os seletores de `base.css` observam.
	 *
	 * O valor inicial é lido do atributo que o script em `app.html` já aplicou, para
	 * que o botão nasça coerente com a tela - sem piscar.
	 */
	let tema = $state<"claro" | "escuro" | undefined>(
		browser ? (document.documentElement.dataset.tema as "claro" | "escuro" | undefined) : undefined,
	)

	function escuroAgora(): boolean {
		if (tema != null) return tema === "escuro"
		return browser && window.matchMedia("(prefers-color-scheme: dark)").matches
	}

	function alternar() {
		tema = escuroAgora() ? "claro" : "escuro"
		document.documentElement.dataset.tema = tema
		try {
			localStorage.setItem("tema", tema)
		} catch {
			// Navegação privada ou armazenamento bloqueado: o tema vale só para esta visita.
		}
	}
</script>

<button type="button" onclick={alternar} title={t("tema.alternar")} aria-label={t("tema.alternar")}>
	<!-- Um ícone só, que troca de forma: sol quando está escuro (o que o clique traz). -->
	<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
		{#if escuroAgora()}
			<circle cx="12" cy="12" r="4.5" fill="currentColor" />
			<g stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<line x1="12" y1="2" x2="12" y2="4.5" />
				<line x1="12" y1="19.5" x2="12" y2="22" />
				<line x1="2" y1="12" x2="4.5" y2="12" />
				<line x1="19.5" y1="12" x2="22" y2="12" />
				<line x1="5" y1="5" x2="6.8" y2="6.8" />
				<line x1="17.2" y1="17.2" x2="19" y2="19" />
				<line x1="5" y1="19" x2="6.8" y2="17.2" />
				<line x1="17.2" y1="6.8" x2="19" y2="5" />
			</g>
		{:else}
			<path
				d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
				fill="currentColor"
			/>
		{/if}
	</svg>
</button>

<style>
	button {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--raio);
		color: var(--texto-suave);
		cursor: pointer;
		transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
	}

	button:hover {
		background: var(--superficie-afundada);
		border-color: var(--borda);
		color: var(--texto);
	}
</style>
