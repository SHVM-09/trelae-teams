<script lang="ts">
	import { signIn } from "@auth/sveltekit/client";
	import { Button } from "$lib/components/ui/button";
    import Header from "$lib/custom-components/Header.svelte";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	let { data } = $props() as { data: { session?: { user?: { name?: string; image?: string; email?: string; namespaceId?: string; teamNamespaceId?: string; publicNamespaceId?: string } } } };

	onMount(() => {
		if (data.session) {
			goto("/dashboard");
		}
	});
</script>

<svelte:head>
	<title>Login | Trelae</title>
	<meta name="description" content="Sign in to access your Teams dashboard and manage your files securely." />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header session={data.session as { user?: { name?: string; image?: string; email?: string } } | null | undefined} />

<!-- ─── Grid + Gradient BG ─── -->
<div class="relative min-h-screen bg-white overflow-x-hidden">
	<!-- Grid lines -->
	<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f2f2f2_1px,transparent_1px),linear-gradient(to_bottom,#f2f2f2_1px,transparent_1px)] pointer-events-none z-0 opacity-50"></div>

	<!-- Radial gradient background -->
	<div class="absolute top-[2%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,_rgba(220,100,245,0.4),_transparent_70%)] z-0"></div>

	<!-- ─── Login Hero ─── -->
	<section class="relative z-10 flex flex-col justify-center items-center text-center pt-32 pb-16 px-4">
		<img src="/teams-icon.png" alt="Teams Icon" class="h-28" />
		<p class="text-xs leading-relaxed max-w-xl text-zinc-700">
			Access your files with ease. <br />
			Sign in securely with Google to collaborate, share, and manage everything in one place.
		</p>

		{#if !data.session}
			<Button
				size="lg"
				class="mt-16 px-8 py-4 text-sm rounded-tl-2xl rounded-br-2xl bg-black text-white shadow-md hover:brightness-110 transition-all flex justify-center items-center gap-2 cursor-pointer"
				onclick={() => signIn("google", { callbackUrl: "/dashboard" })}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="2443" height="2500" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262" id="google">
                    <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                    <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                    <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"></path>
                    <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
                </svg>
				<span>Sign in with Google</span>
			</Button>
		{/if}

		<a href="/" class="mt-4 inline-block text-sm text-zinc-500 hover:text-zinc-800 transition">← Back</a>
	</section>

	<!-- ─── Footer ─── -->
	<footer class="fixed z-10 py-6 text-center text-xs text-zinc-500 bg-white/10 bottom-0 w-full">
		© {new Date().getFullYear()} Teams. Your Files. Perfected.
	</footer>
</div>