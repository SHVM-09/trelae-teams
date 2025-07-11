<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { Plus, X } from 'lucide-svelte';

	let {
		currentLocation = '',
        visibility = 'private',
		onReflectFolder = () => {}
	} = $props();

	let dialogOpen = $state(false);
	let folderName = $state('');
	let creating = $state(false);

	async function createFolder() {
		if (!folderName.trim()) {
			toast.error('Folder name required');
			return;
		}
		creating = true;
		try {
			const res = await fetch('/api/folder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: folderName.trim(),
					location: currentLocation,
                    visibility
				})
			});
			if (!res.ok) throw new Error('Failed to create folder');
			const { id, name } = await res.json();

			onReflectFolder({
				id,
				name,
				location: currentLocation,
				status: 'uploaded',
				type: 'folder',
				size: 0,
				createdAt: new Date().toISOString()
			});
			toast.success(`Folder "${name}" created`);
			reset();
		} catch (err) {
			toast.error('Failed to create folder');
		} finally {
			creating = false;
		}
	}

	function reset() {
		dialogOpen = false;
		folderName = '';
	}
</script>

<Button onclick={() => (dialogOpen = true)}>
	<Plus class="size-4 mr-2" /> New Folder
</Button>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/70" />
		<Dialog.Content
			onclick={(e) => e.stopPropagation()}
			class="fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-7 shadow-popover"
		>
			<Dialog.Title class="text-xl font-semibold tracking-tight text-zinc-800 mb-4">Create Folder</Dialog.Title>
			<Dialog.Close class="absolute top-2 right-2 rounded-md p-1 text-zinc-500 hover:text-zinc-800">
				<X size="16" />
			</Dialog.Close>

			<input
				type="text"
				placeholder="Folder name"
				class="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
				bind:value={folderName}
			/>

			<Button
				class="mt-4"
				disabled={!folderName.trim() || creating}
				onclick={createFolder}
			>
				{creating ? 'Creating...' : 'Create Folder'}
			</Button>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>