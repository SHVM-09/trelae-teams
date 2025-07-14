<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
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

		const { url } = await res.json();
		goto("/dashboard");
	}
</script>

<section class="relative isolate bg-white px-6 lg:px-8">
	<div class="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl" aria-hidden="true">
		<div class="mx-auto aspect-1155/678 w-[72rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
			style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)">
		</div>
	</div>

	<div class="mx-auto max-w-4xl text-center pt-12">
		<p class="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
			Select a plan that fits your team
		</p>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
			Choose the plan that’s best suited to your team’s growth and unlock premium features.
		</p>
	</div>

	<div class="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 lg:max-w-4xl lg:grid-cols-3 sm:gap-x-8">
		<!-- Basic Plan -->
		<div class="rounded-3xl bg-white/60 p-8 ring-1 ring-gray-900/10 shadow-sm sm:p-10 text-center">
			<h3 class="text-base font-semibold text-indigo-600">Basic</h3>
			<p class="mt-4 flex items-baseline justify-center gap-x-2">
				<span class="text-4xl font-bold text-gray-900">$10</span>
				<span class="text-sm text-gray-500">/mo</span>
			</p>
			<p class="mt-4 text-gray-600">Up to 5 team members</p>
			<ul class="mt-6 space-y-2 text-sm text-gray-600 text-left">
				<li>✔ Basic support</li>
				<li>✔ 5 GB storage</li>
				<li>✔ Access to dashboard</li>
			</ul>
			<Button class="mt-8 w-full" onclick={() => subscribe("basic")}>
				Choose Basic
			</Button>
		</div>

		<!-- Pro Plan -->
		<div class="relative rounded-3xl bg-gray-900 p-8 shadow-2xl ring-1 ring-gray-900/10 sm:p-10 text-center">
			<h3 class="text-base font-semibold text-indigo-400">Pro</h3>
			<p class="mt-4 flex items-baseline justify-center gap-x-2">
				<span class="text-4xl font-bold text-white">$30</span>
				<span class="text-sm text-gray-400">/mo</span>
			</p>
			<p class="mt-4 text-gray-300">Up to 20 team members</p>
			<ul class="mt-6 space-y-2 text-sm text-gray-300 text-left">
				<li>✔ Priority support</li>
				<li>✔ 100 GB storage</li>
				<li>✔ Admin dashboard + analytics</li>
			</ul>
			<Button class="mt-8 w-full bg-indigo-500 text-white hover:bg-indigo-400" onclick={() => subscribe("pro")}>
				Choose Pro
			</Button>
		</div>

		<!-- Enterprise Plan -->
		<div class="rounded-3xl bg-white/60 p-8 ring-1 ring-gray-900/10 shadow-sm sm:p-10 text-center">
			<h3 class="text-base font-semibold text-indigo-600">Enterprise</h3>
			<p class="mt-4 flex items-baseline justify-center gap-x-2">
				<span class="text-4xl font-bold text-gray-900">Custom</span>
			</p>
			<p class="mt-4 text-gray-600">Unlimited members & usage</p>
			<ul class="mt-6 space-y-2 text-sm text-gray-600 text-left">
				<li>✔ Dedicated support</li>
				<li>✔ Unlimited storage</li>
				<li>✔ Custom integrations</li>
			</ul>
			<Button class="mt-8 w-full" onclick={() => subscribe("enterprise")}>
				Contact Sales
			</Button>
		</div>
	</div>
</section>