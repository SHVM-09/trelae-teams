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
		goto("/");
	}
</script>

<section class="relative isolate overflow-hidden px-6 pb-24 pt-16 sm:pt-24 lg:px-8">
	<!-- Grid lines -->
	<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] pointer-events-none z-0 opacity-40"></div>

	<!-- Radial highlight -->
	<div class="absolute top-[5%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,_rgba(144,89,255,0.12),_transparent_70%)] z-0"></div>

	<!-- Text -->
	<div class="mx-auto max-w-4xl text-center relative z-10">
		<p class="text-3xl font-semibold tracking-tight text-zinc-900">
			Select a plan that fits your team
		</p>
		<p class="mt-2 max-w-2xl mx-auto text-sm text-zinc-600">
			Choose the plan that’s best suited to your team’s growth and unlock premium features.
		</p>
	</div>

	<!-- Plans -->
	<div class="relative z-10 mt-16 grid max-w-lg mx-auto grid-cols-1 gap-y-10 sm:mt-20 lg:max-w-5xl lg:grid-cols-3 sm:gap-x-8 items-center font-light">
		<!-- Basic Plan -->
		<div class="rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-200 via-fuchsia-200 to-purple-200 shadow-sm">
			<div class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 sm:p-10 text-center h-auto">
				<h3 class="text-base font-semibold text-indigo-600">Basic</h3>
				<p class="mt-4 flex items-baseline justify-center gap-x-2">
					<span class="text-4xl font-bold text-zinc-900">$10</span>
					<span class="text-sm text-zinc-500">/ month</span>
				</p>
				<p class="mt-4 text-zinc-600">Up to 5 team members</p>
				<ul class="mt-6 space-y-2 text-sm text-zinc-600 text-left">
					<li>✔ Basic support</li>
					<li>✔ 5 GB storage</li>
					<li>✔ Access to dashboard</li>
				</ul>
				<Button class="mt-8 w-full" onclick={() => subscribe("basic")}>
					Choose Basic
				</Button>
			</div>
		</div>

		<!-- Pro Plan -->
		<div class="scale-105 z-20 rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-400 via-pink-400 to-fuchsia-500 shadow-lg">
			<div class="rounded-xl bg-zinc-900 p-8 sm:p-10 text-center h-auto">
				<h3 class="text-base font-semibold text-indigo-200">Pro</h3>
				<p class="mt-4 flex items-baseline justify-center gap-x-2">
					<span class="text-4xl font-bold text-white">$30</span>
					<span class="text-sm text-zinc-400">/ month</span>
				</p>
				<p class="mt-4 text-zinc-300">Up to 20 team members</p>
				<ul class="mt-6 space-y-2 text-sm text-zinc-300 text-left">
					<li>✔ Priority support</li>
					<li>✔ 100 GB storage</li>
					<li>✔ Admin dashboard + analytics</li>
				</ul>
				<Button class="mt-8 w-full bg-indigo-500 text-white hover:bg-indigo-400" onclick={() => subscribe("pro")}>
					Choose Pro
				</Button>
			</div>
		</div>

		<!-- Enterprise Plan -->
		<div class="rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-200 via-fuchsia-200 to-purple-200 shadow-sm">
			<div class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 sm:p-10 text-center h-auto">
				<h3 class="text-base font-semibold text-indigo-600">Enterprise</h3>
				<p class="mt-4 flex items-baseline justify-center gap-x-2">
					<span class="text-4xl font-bold text-zinc-900">$60</span>
					<span class="text-sm text-zinc-500">/ month</span>
				</p>
				<p class="mt-4 text-zinc-600">Up to 50 team members</p>
				<ul class="mt-6 space-y-2 text-sm text-zinc-600 text-left">
					<li>✔ Dedicated support</li>
					<li>✔ Unlimited storage</li>
					<li>✔ Custom integrations</li>
				</ul>
				<Button class="mt-8 w-full" onclick={() => subscribe("enterprise")}>
				Choose Enterprise
				</Button>
			</div>
		</div>
	</div>
</section>