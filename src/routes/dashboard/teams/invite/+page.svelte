<script lang="ts">
	import { Users, Clock } from 'lucide-svelte';

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
		} else {
			const msg = await res.text();
			error = msg || 'Something went wrong. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Invite Team Members | Trelae Teams</title>
</svelte:head>

<div class="relative isolate overflow-hidden bg-gray-900 py-16 sm:py-24 lg:py-32 lg:my-12 rounded-xl">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none">
			<div class="max-w-xl lg:max-w-lg">
				<h1 class="text-4xl font-semibold tracking-tight text-white">Invite a new team member</h1>
				<p class="mt-4 text-lg text-gray-300">
					Send an invitation link to your teammate’s email and let them join your team.
				</p>

				{#if success}
					<div class="mt-6 rounded-md bg-green-500/10 border border-green-400/20 px-4 py-3 text-sm text-green-300">
						Invite sent successfully!
					</div>
				{/if}

				{#if error}
					<div class="mt-6 rounded-md bg-red-500/10 border border-red-400/20 px-4 py-3 text-sm text-red-300">
						{error}
					</div>
				{/if}

				<div class="mt-6 flex max-w-md gap-x-4">
					<label for="invite-email" class="sr-only">Email address</label>
					<input
						id="invite-email"
						type="email"
						placeholder="email@example.com"
						bind:value={email}
						class="min-w-0 flex-auto rounded-md bg-white/5 px-3.5 py-2 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
					/>
					<button
						type="button"
						onclick={sendInvite}
						class="flex-none rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>
						Send Invite
					</button>
				</div>
			</div>

			<dl class="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:pt-2">
				<div class="flex flex-col items-start">
					<div class="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
						<Users class="size-6 text-white" />
					</div>
					<dt class="mt-4 text-base font-semibold text-white">Collaborate faster</dt>
					<dd class="mt-2 text-base text-gray-400">Bring your team together in one place to manage everything easily.</dd>
				</div>
				<div class="flex flex-col items-start">
					<div class="rounded-md bg-white/5 p-2 ring-1 ring-white/10">
						<Clock class="size-6 text-white" />
					</div>
					<dt class="mt-4 text-base font-semibold text-white">Instant access</dt>
					<dd class="mt-2 text-base text-gray-400">Invitees receive an email and can start collaborating right away.</dd>
				</div>
			</dl>
		</div>
	</div>

	<div class="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6" aria-hidden="true">
		<div class="aspect-1155/678 w-[72rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
			style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)">
		</div>
	</div>
</div>