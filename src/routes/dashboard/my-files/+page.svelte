<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Trash, Folder } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDeleteDialog from '../confirmDeleteDialog.svelte';
    import UploadFile from '../uploadFile.svelte';

	type File = {
		id: string;
		name: string;
		location: string;
		status: string;
		createdAt: string;
	};

	let myFiles: File[] = $state([]);
	let confirmOpen = $state(false);
	let confirmBulkOpen = $state(false);
	let fileToDelete: File | null = $state(null);
	let selectedIds: string[] = $state([]);
	let allSelected = $state(false);
    let currentLocation = $state('');

	onMount(async () => {
		const res = await fetch('/api/files');
		const data = await res.json();
		myFiles = data.files;
	});

	function askDelete(file: File) {
		fileToDelete = file;
		confirmOpen = true;
	}

	function askBulkDelete() {
		if (selectedIds.length === 0) {
			toast.error("No files selected.");
			return;
		}
		confirmBulkOpen = true;
	}

	async function confirmDelete() {
		if (!fileToDelete) return;
		await fetch('/api/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'delete', fileId: fileToDelete.id })
		});
		myFiles = myFiles.filter(f => f.id !== fileToDelete?.id);
		toast.success(`Deleted ${fileToDelete.name}`);
		fileToDelete = null;
		confirmOpen = false;
	}

	async function confirmBulkDelete() {
		await fetch('/api/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'bulk-delete', fileIds: selectedIds })
		});
		myFiles = myFiles.filter(f => !selectedIds.includes(f.id));
		toast.success(`Deleted ${selectedIds.length} files`);
		selectedIds = [];
		allSelected = false;
		confirmBulkOpen = false;
	}

	async function downloadFile(id: string) {
		const res = await fetch('/api/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'download', fileId: id })
		});
		const { url } = await res.json();
		window.open(url, '_blank');
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = [];
			allSelected = false;
		} else {
			selectedIds = myFiles.map(f => f.id);
			allSelected = true;
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(i => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		allSelected = myFiles.length > 0 && myFiles.every(f => selectedIds.includes(f.id));
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-12 space-y-12">
		<section class="rounded-xl border border-zinc-200 bg-white shadow-sm h-[calc(100vh-12rem)] overflow-y-auto relative">
			<div class="flex items-center justify-between gap-3 mb-4 sticky top-0 bg-zinc-50 z-10 p-6">
                <div class="flex items-center gap-2">
                    <Folder class="w-5 h-5 text-green-600" />
                    <h3 class="text-lg font-semibold text-zinc-900">My Files</h3>
                </div>
                <UploadFile
                    {currentLocation}
					onReflectUpload={(file: File) => {
						myFiles = [...myFiles, file];
					}}
                />
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full text-sm">
                    <thead class="border-b">
                        <tr>
                            <th class="px-4 py-2 text-left w-10">
                                <span class="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onchange={toggleSelectAll}
                                        class="size-4 rounded border-zinc-300 text-blue-600"
                                    />
                                </span>
                            </th>
                            <th class="px-4 py-2 text-left font-medium text-zinc-600 w-52 relative">
                                {#if selectedIds.length > 0}
                                    <Button size="sm" variant="secondary" class="h-6 text-xs w-32 rounded absolute top-1" onclick={askBulkDelete}>
                                        Delete selected ({selectedIds.length})
                                    </Button>
                                {:else} Name {/if}
                            </th>
                            <th class="px-4 py-2 text-left font-medium text-zinc-600">Location</th>
                            <th class="px-4 py-2 text-left font-medium text-zinc-600">Status</th>
                            <th class="px-4 py-2 text-left font-medium text-zinc-600">Created</th>
                            <th class="px-4 py-2 text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if myFiles.length}
                            {#each myFiles as file}
                                <tr class="border-b hover:bg-zinc-50 transition last:border-b-0">
                                    <td class="px-4 py-3 w-10">
                                        <span class="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(file.id)}
                                                onclick={(e) => { e.stopPropagation(); toggleSelect(file.id) }}
                                                class="size-4 rounded border-zinc-300 text-blue-600"
                                            />
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 font-medium text-zinc-900">{file.name}</td>
                                    <td class="px-4 py-3 text-zinc-600">
                                        {file.location || '/'}
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class={`inline-block rounded px-2 py-0.5 text-xs ${
                                            file.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : file.status === 'uploaded'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                        }`}>
                                            {file.status}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-zinc-600">{new Date(file.createdAt).toLocaleDateString()}</td>
                                    <td class="px-4 py-3 text-right flex gap-2 justify-end">
                                        <Button size="icon" variant="ghost" class="size-6" onclick={() => downloadFile(file.id)}>
                                            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                                            </svg>
                                        </Button>
                                        <Button size="icon" variant="ghost" class="size-6" onclick={() => askDelete(file)}>
                                            <Trash class="size-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            {/each}
                        {:else}
                            <tr>
                                <td colspan="5" class="px-4 py-6 text-center text-zinc-500">
                                    No files found. Upload your first file!
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
			</div>
		</section>

	<!-- Confirmation Dialog -->
	<ConfirmDeleteDialog
		bind:open={confirmOpen}
		title="Delete File?"
		descriptionHTML={`Are you sure you want to delete <strong>${fileToDelete?.name}</strong>? This cannot be undone.`}
		confirmLabel="Delete"
		onConfirm={confirmDelete}
	/>

    <ConfirmDeleteDialog
        bind:open={confirmBulkOpen}
        title="Delete Selected Files?"
        descriptionHTML={`Delete <strong>${selectedIds.length}</strong> selected files? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmBulkDelete}
    />
</div>