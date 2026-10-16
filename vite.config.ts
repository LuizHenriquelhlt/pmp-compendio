import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [ sveltekit() ],
	test: {
		include: [ "src/**/*.test.{ts,js}", "testes/**/*.test.{ts,js}" ],
	},
})
