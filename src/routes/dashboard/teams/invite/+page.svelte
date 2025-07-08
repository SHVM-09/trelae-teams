<script lang="ts">
	import { Button } from '$lib/components/ui/button';

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

<div class="max-w-xl mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">Invite a new team member</h1>
	<p class="text-zinc-600 mb-8">
		Send an invitation link to your teammate’s email.
	</p>

	{#if success}
		<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-green-800">
			Invite sent successfully!
		</div>
	{/if}

	{#if error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-800">
			{error}
		</div>
	{/if}

	<div class="flex flex-col gap-4">
		<input
			type="email"
			placeholder="email@example.com"
			bind:value={email}
			class="w-full border rounded-md px-4 py-2 text-sm"
		/>

		<Button class="w-full" onclick={sendInvite}>Send Invite</Button>
	</div>
</div>