<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { signOut } from "@auth/sveltekit/client";
	import { page } from '$app/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';

	let { session = null }: { session?: { user?: { name?: string; image?: string; email?: string } } | null } = $props();

	let isOpen = $state(false);
	const toggleMenu = () => (isOpen = !isOpen);

	const currentPath = derived(page, ($p) => $p.url.pathname);
</script>

<header class="sticky top-0 z-50 max-w-5xl mx-auto bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 rounded-b-lg">
	<div class="mx-auto flex w-full items-center justify-between px-6 py-4 gap-6">
		<!-- ─── Logo ─────────────────────────────── -->
		<a href={session ? '/dashboard' : '/'} class="flex-shrink-0">
			<img src="/teams-icon.png" alt="Teams Icon" class="h-16" />
		</a>

		<!-- ─── Navigation Pills ─────────────────── -->
		<nav class="hidden md:flex items-center gap-6">
			<div class="flex items-center gap-1 bg-zinc-50 rounded-lg p-1 shadow">
				{#each [
					{ label: 'Home', href: '/' },
					{ label: 'Public Files', href: '/public-files' }
					] as item}
						<a
							href={item.href}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
							class:bg-black={($currentPath === item.href) || (item.href === '/' && $currentPath === '/login')}
							class:text-white={($currentPath === item.href) || (item.href === '/' && $currentPath === '/login')}
							class:text-zinc-600={!($currentPath === item.href) && !(item.href === '/' && $currentPath === '/login')}
						>
							{item.label}
						</a>
					{/each}

					{#if session}
						<a
							href="/dashboard"
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
							class:bg-black={$currentPath === '/dashboard'}
							class:text-white={$currentPath === '/dashboard'}
							class:text-zinc-600={$currentPath !== '/dashboard'}
						>
							Dashboard
						</a>
					{/if}
			</div>
		</nav>

		<!-- ─── Avatar / CTA ────────────────────── -->
		<div class="flex-shrink-0 flex items-center gap-4 max-md:hidden">
			{#if session}
				<div
					class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 p-[1px]"
				>
					<Button
						onclick={() => signOut()}
						class="rounded-full bg-white px-4 py-1 text-sm font-medium hover:bg-zinc-50 transition-colors"
					>
						<span class="bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
							Log out
						</span>
					</Button>
				</div>
				<button class="relative block size-11 rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-purple-500 p-0.5">
					<span class="flex h-full w-full items-center justify-center rounded-full bg-pink-500 text-white font-bold text-lg">
						{session.user?.name?.charAt(0).toUpperCase() ?? 'U'}
					</span>
				</button>
			{:else}
				<Button
					class="rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:brightness-110 focus-visible:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
					disabled={$currentPath === '/login'}
					onclick={() => goto("/login")}
				>
					Sign in
				</Button>
			{/if}
		</div>

		<!-- ─── Mobile Hamburger ─────────────────── -->
		<button
			class="md:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-600 hover:text-zinc-900 focus:outline-none"
			onclick={toggleMenu}
			aria-label="Toggle menu"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if !isOpen}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				{/if}
			</svg>
		</button>
	</div>

	<!-- ─── Mobile Nav ────────────────────────── -->
	{#if isOpen}
		<nav class="md:hidden space-y-1 px-6 pb-6 border-b border-zinc-200">
			<a href="/" class="block rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition">Home</a>
			<a href="/public-files" class="block rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition">Public Files</a>
			<div class="flex items-center justify-end mt-2">
				{#if session}
					<div
						class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 p-[1px]"
					>
						<Button
							onclick={() => signOut()}
							class="rounded-full bg-white px-4 py-1 text-sm font-medium hover:bg-zinc-50 transition-colors"
						>
							<span class="bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
								Log out
							</span>
						</Button>
					</div>
				{:else}
					<Button
						class="rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:brightness-110 focus-visible:outline-none"
					>
						<a href="/login" class="flex items-center gap-1">Sign in</a>
					</Button>
				{/if}
			</div>
		</nav>
	{/if}
</header>