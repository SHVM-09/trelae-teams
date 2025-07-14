<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { DropdownMenu } from 'bits-ui';
	import { Trash, Folder as FolderIcon, File as FileIcon, ArrowLeft, Copy, Move, LayoutGrid, Table, MoreVertical, Download, ExternalLink } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDeleteDialog from '../confirmDeleteDialog.svelte';
	import UploadFile from '../uploadFile.svelte';
	import CreateFolder from '../createFolder.svelte';
	import { onMount, onDestroy } from 'svelte';

	onMount(() => {
		function handlePasteShortcut(event: KeyboardEvent) {
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

			if (ctrlOrCmd && event.key.toLowerCase() === 'v') {
				// Only run if there's something copied
				if (copiedFileId) {
					event.preventDefault();
					toast.info('Pasting copied file shortcut...');
					pasteFile();
				}
			}

			if (ctrlOrCmd && event.key.toLowerCase() === 'm') {
				// Only run if there's something copied
				if (moveFileId) {
					event.preventDefault();
					toast.info('Moving selected file shortcut...');
					confirmMoveFile();
				}
			}
		}

		window.addEventListener('keydown', handlePasteShortcut);

		onDestroy(() => {
			window.removeEventListener('keydown', handlePasteShortcut);
		});
	});

	type File = {
		id: string;
		name: string;
		location: string;
		status: string;
		type: string;
		size: number;
		createdAt: string;
	};

	let confirmOpen = $state(false);
	let confirmBulkOpen = $state(false);
	let fileToDelete: File | null = $state(null);
	let selectedIds: string[] = $state([]);
	let allSelected = $state(false);
	let currentLocation = $state('');

	const { data } = $props();

	let myFiles: File[] = $state(
		data.files
			.filter((f: any) => f.location === currentLocation)
			.map((f: any) => ({
				id: f.id,
				name: f.name,
				location: f.location,
				status: f.status ?? 'unknown',
				type: f.type,
				size: f.size,
				createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : '',
			}))
	);

	async function loadFiles() {
		const res = await fetch(`/api/files`);
		const data = await res.json();
		// Filter by current location only
		myFiles = data.files.filter((f: File) => f.location === currentLocation);
	}

	function navigateUp() {
		if (!currentLocation) return;
		const parts = currentLocation.split('/').filter(Boolean);
		parts.pop();
		currentLocation = parts.join('/');
		loadFiles();
	}

	function openFolder(folder: File) {
		currentLocation = currentLocation ? `${currentLocation}/${folder.name}` : folder.name;
		loadFiles();
	}

	function openFilePreview(file: File) {
		goto(`/dashboard/my-files/${file.id}`);
	}

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
		const fileIds = myFiles.map(f => f.id);
		if (allSelected) {
			selectedIds = [];
			allSelected = false;
		} else {
			selectedIds = fileIds;
			allSelected = true;
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(i => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
		const fileIds = myFiles.map(f => f.id);
		allSelected = fileIds.length > 0 && fileIds.every(fid => selectedIds.includes(fid));
	}

	let copiedFileId: string | null = $state(null);
	let copiedFileName: string | null = $state(null);

	function copyFile(file: File) {
		if (file.type !== 'file') {
			toast.error('Only files can be copied.');
			return;
		}
		copiedFileId = file.id;
		copiedFileName = file.name;
		toast.success(`Copied ${file.name}. Go to target folder and click "paste here" or use command/ctrl + v.`);
	}

	async function pasteFile() {
		if (!copiedFileId) {
			toast.error('No file copied.');
			return;
		}

		const newLocation = currentLocation.trim() || "";

		const res = await fetch('/api/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'copy',
				fileId: copiedFileId,
				newLocation,
				name: copiedFileName
			})
		});

		if (res.ok) {
			toast.success(`File ${copiedFileName} pasted to /${currentLocation}`);
			loadFiles();
			copiedFileId = null;
		} else {
			toast.error('Paste failed.');
		}
	}

	let moveFileId: string | null = $state(null);
	let moveFileName: string | null = $state(null);

	function moveFile(file: File) {
		if (file.type !== 'file') {
			toast.error('Only files can be moved.');
			return;
		}
		moveFileId = file.id;
		moveFileName = file.name;
		toast.success(`Selected ${file.name}. Go to target folder and click "move here" or use command/ctrl + m.`);
	}

	async function confirmMoveFile() {
		if (!moveFileId) {
			toast.error('No file selected for move.');
			return;
		}

		const newLocation = currentLocation.trim() || '';

		const res = await fetch('/api/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'move',
				fileId: moveFileId,
				newLocation,
				newName: moveFileName
			})
		});

		if (res.ok) {
			toast.success(`File ${moveFileName} moved to /${currentLocation}`);
			loadFiles();
			moveFileId = null;
		} else {
			toast.error('Move failed.');
		}
	}

	function handleGridClick(file: File) {
	// Toggle selection on single click
		if (selectedIds.includes(file.id)) {
			selectedIds = selectedIds.filter(id => id !== file.id);
		} else {
			selectedIds = [...selectedIds, file.id];
		}
	}

	function openFileOrFolder(file: File) {
		// Double click opens
		if (file.type === 'folder') {
			openFolder(file);
		} else {
			openFilePreview(file);
		}
	}

	let isGridView = $state(false);

	onMount(() => {
		const saved = localStorage.getItem('file_view_mode');
		isGridView = saved === 'grid';
	});

	async function searchFiles(query: string) {
		if (!query.trim()) {
			loadFiles();
			return;
		}
		const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
		const data = await res.json();

		myFiles = [
			...data.folders.map((f: any) => ({
				id: f.id,
				name: f.name,
				location: f.location,
				type: 'folder',
				size: 0,
				createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : '',
				status: 'uploaded',
			})),
			...data.files.map((f: any) => ({
				id: f.id,
				name: f.name,
				location: f.location,
				type: 'file',
				size: Number(f.size),
				createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : '',
				status: 'uploaded',
			})),
		];
	}

	$effect(() => {
		localStorage.setItem('file_view_mode', isGridView ? 'grid' : 'table');
	});

	// Add this helper at top:
	function debounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
		let timer: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), delay);
		};
	}

	// Wrap your searchFiles in debounce:
	const debouncedSearch = debounce(searchFiles);
</script>

<div class="max-w-6xl mx-auto px-6 py-12 space-y-12">
	<section class="rounded-xl border border-zinc-200 bg-white shadow-sm h-[calc(100vh-12rem)] overflow-y-auto relative">
		<div class="flex items-center justify-between gap-3 mb-4 sticky top-0 bg-zinc-50 z-10 p-6">
			<div class="flex items-center gap-2">
				{#if currentLocation}
					<Button size="icon" variant="ghost" onclick={navigateUp}>
						<ArrowLeft class="w-4 h-4" />
					</Button>
				{/if}
				<h3 class="text-lg font-semibold text-zinc-900 flex items-center gap-1">
					My Files

					{#if currentLocation}
						<span class="flex items-center gap-1 text-sm text-zinc-500">
							{#each currentLocation.split('/').filter(Boolean) as part, i}
								<span>/ {part}</span>
							{/each}
						</span>
					{/if}
				</h3>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="text"
					placeholder="Search..."
					class="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					oninput={(e) => {
						debouncedSearch((e.target as HTMLInputElement).value);
					}}
				/>
				<CreateFolder
					{currentLocation}
					onReflectFolder={() => loadFiles()}
				/>
				<UploadFile
					{currentLocation}
					onReflectUpload={() => loadFiles()}
				/>
				<div class="flex gap-1 border rounded-md overflow-hidden cursor-pointer">
					<button
						class="p-2.5 flex items-center gap-1 text-sm font-medium
							{!isGridView ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'} transition"
						onclick={() => isGridView = false}>
						<Table class="size-3.5" />
					</button>
					<button
						class="p-2.5 flex items-center gap-1 text-sm font-medium
							{isGridView ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'} transition"
						onclick={() => isGridView = true}>
						<LayoutGrid class="size-3.5" />
					</button>
				</div>
				{#if copiedFileId}
					<Button variant="outline" onclick={pasteFile}>
						Paste here
					</Button>
				{/if}
				{#if moveFileId}
					<Button
						variant="outline"
						onclick={confirmMoveFile}
						disabled={myFiles.find(f => f.id === moveFileId)?.location === currentLocation}
						title={myFiles.find(f => f.id === moveFileId)?.location === currentLocation
							? 'File is already in this location'
							: 'Move file here'}
					>
						Move here
					</Button>
				{/if}
			</div>
		</div>
		{#if !isGridView}
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
							<th class="px-4 py-2 text-left font-medium text-zinc-600">Type</th>
							<th class="px-4 py-2 text-left font-medium text-zinc-600">Size</th>
							<th class="px-4 py-2 text-left font-medium text-zinc-600">Status</th>
							<th class="px-4 py-2 text-left font-medium text-zinc-600">Created At</th>
							<th class="px-4 py-2 text-right"></th>
						</tr>
					</thead>
					<tbody>
						{#if myFiles.length}
							{#each myFiles as file}
								<tr
									class="border-b hover:bg-zinc-50 transition last:border-b-0 cursor-pointer {file.type === 'folder' ? 'bg-zinc-50 hover:bg-zinc-100' : ''} {moveFileId === file.id ? 'opacity-50' : ''}"
									onclick={() => {
										file.type === 'folder' ? openFolder(file) : openFilePreview(file);
									}}
								>
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
									<td class="px-4 py-3 font-medium text-zinc-900 flex items-center gap-2 truncate">
										{#if file.type === 'folder'}
											<FolderIcon class="w-4 h-4" />
										{:else}
											<FileIcon class="w-4 h-4" />
										{/if}
										{file.name}
									</td>
									<td class="px-4 py-3 text-zinc-600">{file.location ? `/${file.location}` : '/'}</td>
									<td class="px-4 py-3 text-zinc-600">{file.type}</td>
									<td class="px-4 py-3 text-zinc-600 text-nowrap">
										{file.type === 'folder' ? '-' : `${(Number(file.size) / 1024).toFixed(2)} KB`}
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
									<td class="px-4 py-3 text-zinc-600 text-nowrap">
										{#if file.createdAt && file.type !== 'folder'}
											{new Date(file.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
											({new Date(file.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
										{:else}
											-
										{/if}
									</td>
									<td class="px-4 py-3 text-right flex gap-2 justify-end">
										{#if file.type === 'file'}
											<Button size="icon" variant="ghost" class="size-6" onclick={(e) => { e.stopPropagation(); downloadFile(file.id); }}>
												<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
												</svg>
											</Button>
											<Button
												size="icon"
												variant="ghost"
												class="size-6"
												onclick={(e) => {
													e.stopPropagation();
													copyFile(file);
												}}
											>
												<Copy class="size-3.5" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												class="size-6"
												onclick={(e) => {
													e.stopPropagation();
													moveFile(file);
												}}
											>
												<Move class="size-3.5" />
											</Button>
										{/if}
										<Button size="icon" variant="ghost" class="size-6" onclick={(e) => { e.stopPropagation(); askDelete(file); }}>
											<Trash class="size-3.5" />
										</Button>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="8" class="px-4 py-6 text-center text-lg font-light text-zinc-500">
									Empty! Create a folder or upload a file here.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 gap-y-4 p-4 pt-8 relative">
			{#if myFiles.length}
				{#each myFiles as file}
					<div
						class="border p-4 rounded-lg shadow-sm flex flex-col gap-2 bg-white relative {moveFileId === file.id ? 'opacity-50' : ''} {selectedIds.includes(file.id) ? '!bg-blue-50' : ''} transition h-fit"
					>
						<div class="flex flex-col">
							{#if file.type === 'folder'}
								<FolderIcon class="size-20" />
							{:else}
								<FileIcon class="size-20" />
							{/if}
							<span class="font-medium truncate ps-2 mt-2">{file.name}</span>
							<div class="text-xs text-zinc-500 ps-2 flex justify-between">
								{file.location ? `/${file.location}` : 'root'} <span>{file.type === 'folder' ? '' : `${(Number(file.size) / 1024).toFixed(2)} KB`}</span>
							</div>
						</div>

						<div class="absolute top-2 right-2 z-10">
							<div class="flex items-center gap-1">
								<Button
									size="icon"
									variant="ghost"
									onclick={(e) => {
										e.stopPropagation();
										openFileOrFolder(file);
									}}
									class="size-6 p-2"
									title={file.type === 'folder' ? 'Open Folder' : 'Open File'}
								>
									<ExternalLink class="size-4" />
								</Button>
								<DropdownMenu.Root>
									<DropdownMenu.Trigger class="rounded-md p-1 text-zinc-500 hover:bg-zinc-200" aria-label="File actions">
										<MoreVertical class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										class="min-w-28 rounded-md border border-zinc-200 bg-white p-1 font-normal shadow-lg text-xs"
										align="end"
									>
										<DropdownMenu.RadioGroup>
											{#if file.type === 'file'}
												<DropdownMenu.RadioItem
													value="download"
													class="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm hover:bg-zinc-100"
													onclick={() => downloadFile(file.id)}
												>
													<Download size="16" /> Download
												</DropdownMenu.RadioItem>
												<DropdownMenu.RadioItem
													value="copy"
													class="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm hover:bg-zinc-100"
													onclick={() => copyFile(file)}
												>
													<Copy size="16" /> Copy
												</DropdownMenu.RadioItem>
												<DropdownMenu.RadioItem
													value="move"
													class="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm hover:bg-zinc-100"
													onclick={() => moveFile(file)}
												>
													<Move size="16" /> Move
												</DropdownMenu.RadioItem>
											{/if}
											<DropdownMenu.RadioItem
												value="delete"
												class="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-600/10"
												onclick={() => askDelete(file)}
											>
												<Trash size="16" /> Delete
											</DropdownMenu.RadioItem>
										</DropdownMenu.RadioGroup>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</div>

						<div
							class="absolute inset-0 rounded-lg {selectedIds.includes(file.id) ? 'ring-2 ring-blue-500 border-blue-300' : ''}"
							onclick={() => handleGridClick(file)}
							role="presentation"
						></div>
					</div>
				{/each}
				{#if selectedIds.length > 0}
					<div class="absolute -top-2 right-4 z-20">
						<Button size="sm" variant="secondary" onclick={askBulkDelete}>
							Delete Selected ({selectedIds.length})
						</Button>
					</div>
				{/if}
			{:else}
				<p class="text-zinc-500 col-span-full text-center">Empty! Create a folder or upload a file here.</p>
			{/if}
		</div>
		{/if}
	</section>

	<ConfirmDeleteDialog
		bind:open={confirmOpen}
		title="Delete Item?"
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