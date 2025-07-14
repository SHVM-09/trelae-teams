<script lang="ts">
	import { Button } from "$lib/components/ui/button";
    import Header from "$lib/custom-components/Header.svelte";
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data } = $props() as { data: { session?: { user?: { name?: string; image?: string; email?: string; namespaceId?: string; teamNamespaceId?: string; publicNamespaceId?: string } } } };
</script>

<!-- Header component -->
<Header session={data.session as { user?: { name?: string; image?: string; email?: string } } | null | undefined} />

<!-- Hero Section -->
<section class="max-w-7xl mx-auto px-6 py-28 text-center flex flex-col items-center bg-gradient-to-b from-white to-zinc-50 rounded-lg">
	<h1 class="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 mb-6">
		Trelae<span class="text-zinc-600 text-6xl md:text-8xl">Teams</span>
        <span class="text-zinc-900 font-normal tracking-normal text-xl block">Your Files. Perfected.</span>
	</h1>
	<p class="text-lg md:text-xl text-zinc-600 mb-10 max-w-2xl leading-relaxed">
		A modern way to organize, manage, and share your files and assets across your team — with total control.
	</p>

	{#if !data.session}
		<Button
			size="lg"
			class="px-8 py-4 text-md shadow-md hover:shadow-lg transition"
			onclick={() => goto("/login")}
		>
			Launch Your Team Hub
		</Button>
	{:else}
		<p class="text-md text-zinc-600 mb-4">
			Welcome back, {data.session.user?.name}!
		</p>
		<Button
			size="lg"
			class="px-8 py-4 text-md shadow-md hover:shadow-lg transition"
			onclick={() => goto("/dashboard")}
		>
			Open Dashboard
		</Button>
	{/if}
</section>

<!-- Unique 3-Column Highlights -->
<section class="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-10 text-left">
	<div class="space-y-4 bg-gradient-to-b from-white to-zinc-100 p-6 rounded-lg shadow-md">
		<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
			<span class="text-blue-600 text-xl">🔐</span>
		</div>
		<h3 class="text-xl font-semibold text-zinc-900">Secure Namespaces</h3>
		<p class="text-zinc-600">
			Keep your files safe and organized with private or public namespaces — share only what you want.
		</p>
	</div>
	<div class="space-y-4 bg-gradient-to-b from-white to-zinc-100 p-6 rounded-lg shadow-md">
		<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
			<span class="text-green-600 text-xl">👥</span>
		</div>
		<h3 class="text-xl font-semibold text-zinc-900">Team Collaboration</h3>
		<p class="text-zinc-600">
			Invite teammates, assign roles, and work together on files in real time — no more email clutter.
		</p>
	</div>
	<div class="space-y-4 bg-gradient-to-b from-white to-zinc-100 p-6 rounded-lg shadow-md">
		<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
			<span class="text-purple-600 text-xl">🚀</span>
		</div>
		<h3 class="text-xl font-semibold text-zinc-900">Large File Power</h3>
		<p class="text-zinc-600">
			Upload, move, copy, and serve huge files fast — no size anxiety, only smooth transfers.
		</p>
	</div>
</section>

<!-- New About Section -->
<section class="bg-blue-50 py-20">
	<div class="max-w-4xl mx-auto text-center px-6">
		<h3 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
			Why Trelae Teams?
		</h3>
		<p class="text-zinc-700 text-lg max-w-2xl mx-auto">
			Trelae Teams is built for modern teams who handle rich assets: design files, videos, docs — all in one place.
			Forget messy drives, scattered links, and confusing permission trails.
			Control, share, and scale — without limits.
		</p>
	</div>
</section>

<!-- Footer -->
<footer class="bg-white border-t py-6 mt-12 text-center text-sm text-zinc-500">
	© {new Date().getFullYear()} Trelae Teams. Your Files. Perfected.
</footer>