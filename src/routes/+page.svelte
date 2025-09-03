<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import Header from "$lib/custom-components/Header.svelte";
	import { goto } from "$app/navigation";
	import { Lock, Users, Rocket } from "lucide-svelte"; // ⬅️ Lucide icons

	const { data } = $props();
	const { session } = data.data;
</script>

<svelte:head>
	<title>Home | Trelae</title>
	<meta name="description" content="Teams is built for fast-moving teams who care about speed, security, and simplicity." />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<!-- Header -->
<Header session={session ? {
	user: {
		name: session.user?.name ?? undefined,
		email: session.user?.email ?? undefined,
		image: session.user?.image ?? undefined
	}
} : session} />

<!-- ─── Grid + Header ─── -->
<div class="relative min-h-screen bg-white overflow-x-hidden">
	<!-- Grid lines -->
	<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f2f2f2_1px,transparent_1px),linear-gradient(to_bottom,#f2f2f2_1px,transparent_1px)] pointer-events-none z-0 opacity-50"></div>

	<!-- Centered radial gradient behind Teams text -->
	<div class="absolute top-[2%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,_rgba(220,100,245,0.4),_transparent_70%)] z-0"></div>

	<!-- ─── Hero ─── -->
	<section class="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-16 text-center flex flex-col items-center">
		<img src="/teams-icon.png" alt="Teams Icon" class="h-28" />
		<p class="text-xs leading-relaxed max-w-xl text-zinc-700">
			Your Files. Perfected. <br />
			Built for fast-moving teams who care about <span class="font-semibold text-zinc-900">speed, security</span>, and <span class="font-semibold text-zinc-900">simplicity</span>.
		</p>

		{#if !session}
			<Button
				class="mt-8 px-8 py-4 text-sm rounded-tl-2xl rounded-br-2xl bg-black text-white shadow-md hover:brightness-110 transition-all"
				onclick={() => goto("/login")}
			>
				Experience Teams
			</Button>
		{:else}
			<p class="mt-6 text-md text-zinc-700/80 italic font-light">Welcome back, {session.user?.name}!</p>
			<Button
				class="mt-8 px-8 py-4 text-sm rounded-tl-2xl rounded-br-2xl bg-black text-white shadow-md hover:brightness-110 transition-all"
				onclick={() => goto("/dashboard")}
			>
				Open Dashboard
			</Button>
		{/if}
	</section>

	<!-- ─── Feature Cards (with gradient border + lucide icons) ─── -->
	<section class="relative z-10 max-w-5xl mx-auto px-6 py-28 flex flex-col md:flex-row gap-6 md:gap-10 items-start justify-center">
		<!-- Card 1 -->
		<div class="p-[1px] rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg hover:scale-[1.02] transition-all w-full md:w-[28%]">
			<div class="bg-white p-6 rounded-[calc(1rem-1px)] text-zinc-800 h-full">
				<Lock class="w-6 h-6 mb-3 text-blue-500" />
				<h2 class="text-lg font-semibold">Secure Namespaces</h2>
				<p class="mt-2 text-xs leading-relaxed text-zinc-600">
					Keep your files safe and organized with private or public namespaces — share only what you want.
				</p>
			</div>
		</div>

		<!-- Card 2 -->
		<div class="p-[1px] rounded-3xl bg-gradient-to-br from-green-500 via-teal-400 to-emerald-500 shadow-2xl hover:scale-[1.03] transition-all w-full md:w-[34%]">
			<div class="bg-white p-8 rounded-[calc(1.5rem-1px)] text-zinc-800 h-full">
				<Users class="w-7 h-7 mb-4 text-green-600" />
				<h2 class="text-xl font-semibold">Team Collaboration</h2>
				<p class="mt-3 text-xs leading-relaxed text-zinc-600">
					Invite teammates, assign roles, and work together on files in real time — no more email clutter.
				</p>
			</div>
		</div>

		<!-- Card 3 -->
		<div class="p-[1px] rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-fuchsia-500 shadow-lg hover:scale-[1.02] transition-all w-full md:w-[28%]">
			<div class="bg-white p-6 rounded-[calc(1rem-1px)] text-zinc-800 h-full">
				<Rocket class="w-6 h-6 mb-3 text-fuchsia-500" />
				<h2 class="text-lg font-semibold">Large File Power</h2>
				<p class="mt-2 text-xs leading-relaxed text-zinc-600">
					Upload, move, copy, and serve huge files fast — no size anxiety, only smooth transfers.
				</p>
			</div>
		</div>
	</section>

	<!-- ─── About Section ─── -->
	<section class="relative z-10 py-24">
		<div class="max-w-4xl mx-auto text-center px-6">
			<h3 class="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Why Teams?</h3>
			<p class="text-zinc-700 text-sm max-w-2xl mx-auto leading-relaxed">
				Teams is designed for modern teams who handle heavy assets — videos, designs, datasets, or docs.
				No cluttered drives. No guessing permissions. Just smooth, secure, organized file workflows.
			</p>
		</div>
	</section>

	<!-- ─── Footer ─── -->
	<footer class="relative z-10 py-6 text-center text-xs text-zinc-500 bg-white/10">
		© {new Date().getFullYear()} Teams. Your Files. Perfected.
	</footer>
</div>