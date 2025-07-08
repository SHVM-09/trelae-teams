<script lang="ts">
	import { Button } from "$lib/components/ui/button";

	let { session = null }: { session?: { user?: { name?: string; image?: string; email?: string } } | null } = $props();

	let isOpen = $state(false);

	function toggleMenu() {
		isOpen = !isOpen;
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
>
	<div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2">
			<h1 class="text-2xl font-bold tracking-tight text-zinc-900">
				Trelae<span class="text-zinc-600 ms-px text-3xl">Teams</span>
			</h1>
		</a>

		<!-- Desktop nav -->
		<nav class="hidden md:flex items-center gap-6">
			<a href="/" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
				Home
			</a>

			{#if session}
				<a href="/dashboard" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">Dashboard</a>
				<a href="/files" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">My Files</a>
				<a href="/teams" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">Teams</a>
				<a href="/settings" class="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">Settings</a>
			{/if}

			<Button class="text-sm font-medium">
				<a href="/login" class="flex items-center gap-1">Sign in</a>
			</Button>
		</nav>

		<!-- Hamburger icon -->
		<button
			class="md:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-700 hover:text-zinc-900 focus:outline-none"
			onclick={toggleMenu}
			aria-label="Toggle menu"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if !isOpen}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M6 18L18 6M6 6l12 12" />
				{/if}
			</svg>
		</button>
	</div>

	<!-- Mobile nav -->
	{#if isOpen}
		<nav class="md:hidden px-6 pb-4">
			<a href="/" class="block py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">Home</a>

			{#if session}
				<a href="/dashboard" class="block py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">Dashboard</a>
				<a href="/files" class="block py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">My Files</a>
				<a href="/teams" class="block py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">Teams</a>
				<a href="/settings" class="block py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">Settings</a>
			{/if}

			<Button class="w-full mt-2">
				<a href="/login" class="block w-full text-center">Sign in</a>
			</Button>
		</nav>
	{/if}
</header>