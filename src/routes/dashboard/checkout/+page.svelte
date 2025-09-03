<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { goto } from "$app/navigation";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const userEmail = data?.session?.user?.email;
	const isInTeam = data?.session?.user?.teamId;
	const currentPlan = data?.session?.user?.plan; // e.g. 'free' | 'basic' | etc.
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

<svelte:head>
	<title>Checkout - My Files</title>
	<meta name="description" content="Checkout page for My Files" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

{#if isInTeam && currentPlan}
	<section class="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 relative z-10">
		<div class="max-w-2xl w-full text-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
			<p class="text-2xl font-medium text-emerald-700">
				You're currently on the
				<strong class="capitalize">{currentPlan}</strong> plan with your team.
			</p>
			<p class="mt-4 text-zinc-600 text-xs sm:text-sm leading-relaxed font-light">
				Your team has access to all features available in this plan. If you need more members, storage, or advanced capabilities, consider upgrading from the dashboard.
				<br />
				The upgrade options will be available soon.
			</p>
		</div>
	</section>
{:else}
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

		<!-- Row 1: Free plan (smaller, centered) -->
		<div class="relative z-10 mt-16 mx-auto w-full max-w-md">
			<div class="rounded-2xl bg-white p-px bg-gradient-to-tr from-emerald-200 via-teal-200 to-cyan-200 shadow-sm">
				<div class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-6 sm:p-8 text-center h-auto">
					<div class="inline-flex items-center gap-2 mx-auto mb-2 rounded-full px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
						New Launch Offer
					</div>
					<h3 class="text-base font-semibold text-emerald-600">Free</h3>
					<p class="mt-4 flex items-baseline justify-center gap-x-2">
						<span class="text-4xl font-bold text-zinc-900">$0</span>
						<span class="text-sm text-zinc-500">/ month</span>
					</p>
					<p class="mt-4 text-zinc-600">Up to 5 team members</p>
					<ul class="mt-6 space-y-2 text-sm text-zinc-600 text-left">
						<li>✔ No credit card required</li>
						<li>✔ 5 GB storage</li>
						<li>✔ Core features</li>
					</ul>
					<Button class="mt-8 w-full cursor-pointer" onclick={() => subscribe("free")}>
						Activate Free
					</Button>
				</div>
			</div>
		</div>

		<!-- Row 2: Paid plans (coming soon) -->
		<div class="relative z-10 mt-12 grid max-w-lg mx-auto grid-cols-1 gap-y-10 lg:max-w-5xl lg:grid-cols-3 sm:gap-x-8 items-start font-light">
			<!-- Basic Plan (COMING SOON) -->
			<div class="rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-200 via-fuchsia-200 to-purple-200 shadow-sm">
				<div class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 sm:p-10 text-center h-auto">
					<h3 class="text-base font-semibold text-indigo-600">Basic</h3>
					<p class="mt-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Coming soon</p>
					<p class="mt-4 flex items-baseline justify-center gap-x-2">
						<span class="text-4xl font-bold text-zinc-900">$10</span>
						<span class="text-sm text-zinc-500">/ month</span>
					</p>
					<p class="mt-4 text-zinc-600">Up to 10 team members</p>
					<ul class="mt-6 space-y-2 text-sm text-zinc-600 text-left">
						<li>✔ Basic support</li>
						<li>✔ 50 GB storage</li>
						<li>✔ Access to dashboard</li>
					</ul>
					<Button class="mt-8 w-full opacity-60 cursor-not-allowed" disabled title="Coming soon">
						Choose Basic
					</Button>
				</div>
			</div>

			<!-- Pro Plan (COMING SOON) -->
			<div class="scale-105 z-20 rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-400 via-pink-400 to-fuchsia-500 shadow-lg">
				<div class="rounded-xl bg-zinc-900 p-8 sm:p-10 text-center h-auto">
					<h3 class="text-base font-semibold text-indigo-200">Pro</h3>
					<p class="mt-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">Coming soon</p>
					<p class="mt-4 flex items-baseline justify-center gap-x-2">
						<span class="text-4xl font-bold text-white">$30</span>
						<span class="text-sm text-zinc-400">/ month</span>
					</p>
					<p class="mt-4 text-zinc-300">Up to 30 team members</p>
					<ul class="mt-6 space-y-2 text-sm text-zinc-300 text-left">
						<li>✔ Priority support</li>
						<li>✔ 500 GB storage</li>
						<li>✔ Admin dashboard + analytics</li>
					</ul>
					<Button class="mt-8 w-full bg-indigo-500 text-white hover:bg-indigo-400 opacity-60 cursor-not-allowed" disabled title="Coming soon">
						Choose Pro
					</Button>
				</div>
			</div>

			<!-- Enterprise Plan (COMING SOON) -->
			<div class="rounded-2xl bg-white p-px bg-gradient-to-tr from-indigo-200 via-fuchsia-200 to-purple-200 shadow-sm">
				<div class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 sm:p-10 text-center h-auto">
					<h3 class="text-base font-semibold text-indigo-600">Enterprise</h3>
					<p class="mt-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">Coming soon</p>
					<p class="mt-4 flex items-baseline justify-center gap-x-2">
						<span class="text-4xl font-bold text-zinc-900">$60</span>
						<span class="text-sm text-zinc-500">/ month</span>
					</p>
					<p class="mt-4 text-zinc-600">Up to 100 team members</p>
					<ul class="mt-6 space-y-2 text-sm text-zinc-600 text-left">
						<li>✔ Dedicated support</li>
						<li>✔ 1 TB storage</li>
						<li>✔ Custom integrations</li>
					</ul>
					<Button class="mt-8 w-full opacity-60 cursor-not-allowed" disabled title="Coming soon">
						Choose Enterprise
					</Button>
				</div>
			</div>
		</div>
	</section>
{/if}