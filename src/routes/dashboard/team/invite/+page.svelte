<script lang="ts">
	import { Users, Clock, Send } from 'lucide-svelte';

	let email = $state('');
	let success = $state(false);
	let error = $state('');

	async function sendInvite() {
		error = '';
		success = false;

		if (!email.trim()) {
			error = 'Please enter a valid email address.';
			return;
		}

		const res = await fetch('/api/invite', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});

		if (res.ok) {
			success = true;
			email = '';
			setTimeout(() => {
				success = false;
			}, 3000);
		} else {
			const msg = await res.text();
			error = msg || 'Something went wrong. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Invite Team Members | Trelae Teams</title>
</svelte:head>

<main class="relative max-w-5xl mx-auto px-6 py-14 space-y-10">
	<!-- Grid lines -->
	<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] pointer-events-none z-0 opacity-50"></div>

	<!-- Radial highlight -->
	<div class="absolute top-8 left-1/2 -translate-x-1/2 w-[85vw] h-[55vh] bg-[radial-gradient(ellipse_at_center,_rgba(144,89,255,0.15),_transparent_70%)] z-0"></div>

	<!-- Header -->
	<header class="space-y-2 relative z-10">
		<h1 class="text-2xl font-extrabold tracking-tight text-blue-600 flex items-center gap-2">
			<Send class="inline-block" /> Invite member
		</h1>
		<p class="text-xs text-zinc-600 leading-relaxed max-w-xl">
			Invite your teammates to collaborate on projects, share files, and communicate effectively within your team.
			Use the form below to send an invitation link to their email address.
		</p>
	</header>

	<!-- Form Section -->
	<section class="relative z-10 max-w-4xl rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 px-8 py-14 shadow-sm ring-1 ring-zinc-100/40">
		<div class="grid grid-cols-1 gap-16 items-start">
			<!-- Form -->
			<div class="space-y-6">
				<h2 class="text-3xl font-semibold text-zinc-900">Invite a new team member</h2>
				<p class="text-sm text-zinc-600 -mt-4">
					Send an invitation link to your teammate’s email and let them join your team instantly.
				</p>

				{#if success}
					<div class="rounded-md bg-green-100/50 border border-green-300 px-4 py-3 text-sm text-green-800">
						Invite sent successfully!
					</div>
				{/if}

				{#if error}
					<div class="rounded-md bg-red-100/50 border border-red-300 px-4 py-3 text-sm text-red-800">
						{error}
					</div>
				{/if}

				<div class="flex max-w-md gap-3">
					<input
						id="invite-email"
						type="email"
						placeholder="teammate@example.com"
						bind:value={email}
						class="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onclick={sendInvite}
						class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-600"
					>
						<Send class="w-4 h-4" />
						Send
					</button>
				</div>
			</div>

			<!-- Benefits -->
			<dl class="grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:pt-2">
				<div class="flex flex-col items-start">
					<div class="rounded-md bg-blue-100 p-2 ring-1 ring-blue-200">
						<Users class="w-5 h-5 text-blue-600" />
					</div>
					<dt class="mt-4 text-base font-semibold text-zinc-900">Collaborate faster</dt>
					<dd class="mt-1 text-xs text-zinc-600">Bring your team together in one place to manage everything seamlessly.</dd>
				</div>

				<div class="flex flex-col items-start">
					<div class="rounded-md bg-blue-100 p-2 ring-1 ring-blue-200">
						<Clock class="w-5 h-5 text-blue-600" />
					</div>
					<dt class="mt-4 text-base font-semibold text-zinc-900">Instant access</dt>
					<dd class="mt-1 text-xs text-zinc-600">Invitees receive an email and can start collaborating right away.</dd>
				</div>
			</dl>
		</div>
	</section>
</main>