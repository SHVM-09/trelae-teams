<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	console.log("Checkout Page Props:", data);

	const userEmail = data?.session?.user?.email;

	async function subscribe(plan: string) {
		if (!userEmail) {
			alert("No user email found!");
			return;
		}

		const res = await fetch("/api/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ plan, email: userEmail })
		});

		if (!res.ok) {
			alert("Something failed");
			return;
		}

		console.log("Subscription response:", res);

		const { url } = await res.json();
		goto('/dashboard')
	}
</script>

<section class="max-w-4xl mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-4">Select a Plan</h1>
	<div class="grid md:grid-cols-3 gap-6">
		<div class="p-6 border rounded-lg text-center">
			<h2 class="text-xl font-bold mb-2">Basic</h2>
			<p class="mb-4 text-zinc-600">Up to 5 members</p>
			<p class="text-2xl font-bold mb-6">$10/mo</p>
			<Button class="w-full" onclick={() => subscribe("basic")}>Choose Basic</Button>
		</div>

		<div class="p-6 border-2 border-blue-600 rounded-lg text-center">
			<h2 class="text-xl font-bold mb-2 text-blue-600">Pro</h2>
			<p class="mb-4 text-zinc-600">Up to 20 members</p>
			<p class="text-2xl font-bold mb-6">$30/mo</p>
			<Button class="w-full" onclick={() => subscribe("pro")}>Choose Pro</Button>
		</div>

		<div class="p-6 border rounded-lg text-center">
			<h2 class="text-xl font-bold mb-2">Enterprise</h2>
			<p class="mb-4 text-zinc-600">Unlimited members</p>
			<p class="text-2xl font-bold mb-6">Custom</p>
			<Button class="w-full" onclick={() => subscribe("enterprise")}>Contact Sales</Button>
		</div>
	</div>
</section>