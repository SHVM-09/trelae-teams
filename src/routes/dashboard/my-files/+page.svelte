<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { DropdownMenu } from 'bits-ui';
	import { Trash, Folder as FolderIcon, File as FileIcon, ArrowLeft, Copy, Move, LayoutGrid, Table, MoreVertical, Download, ExternalLink, RefreshCw } from 'lucide-svelte';
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
	let rotate = $state(false);
</script>

<svelte:head>
	<title>My Files | Trelae Teams</title>
	<meta name="description" content="Manage your personal files securely in your private space." />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="max-w-5xl mx-auto py-12 space-y-12 px-8">

	<!-- ▸ page heading -->
	<header class="space-y-2 relative">
		<h1 class="text-2xl font-extrabold tracking-tight text-green-500 flex items-center gap-2">
		<FolderIcon class="inline-block align-middle" /> My Files
		</h1>
		<p class="text-xs text-zinc-600">
			This is your personal file space — secure and accessible only by you. Upload, manage, and organize your files and folders confidently, knowing they remain private and under your control.
		</p>
	</header>

	<section class="rounded-xl border border-zinc-200 bg-white shadow-sm h-[calc(100vh-12rem)] overflow-y-auto relative">
		<div class="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 mb-4 sticky top-0 bg-zinc-50 z-10 p-6">
			<div class="flex flex-wrap items-center gap-2 min-w-0">
				{#if currentLocation}
					<Button size="icon" variant="ghost" onclick={navigateUp} aria-label="Navigate up">
						<ArrowLeft class="w-4 h-4" />
					</Button>
				{/if}
				<h2 class="text-lg font-semibold text-zinc-900 flex flex-wrap items-center gap-1 truncate">
					My Files
					{#if currentLocation}
						<span class="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
							{#each currentLocation.split('/')
								.filter(Boolean) as part, i}
								<span>/ {part}</span>
							{/each}
						</span>
					{/if}
				</h2>
			</div>
			<div class="flex flex-wrap justify-end gap-2">
				<label for="file-search" class="sr-only">Search files</label>
				<input
					type="text"
					id="file-search"
					placeholder="Search..."
					class="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
					oninput={(e) => {
						debouncedSearch((e.target as HTMLInputElement).value);
					}}
				/>
				<CreateFolder {currentLocation} onReflectFolder={() => loadFiles()} />
				<UploadFile {currentLocation} onReflectUpload={() => loadFiles()} />
				<div class="flex gap-1 border rounded-md overflow-hidden cursor-pointer">
					<button
						class="p-2.5 flex items-center gap-1 text-sm font-medium
						{!isGridView ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'} transition"
						aria-label="Switch to table view"
						onclick={() => isGridView = false}>
						<Table class="size-3.5" />
					</button>
					<button
						class="p-2.5 flex items-center gap-1 text-sm font-medium
						{isGridView ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'} transition"
						aria-label="Switch to grid view"
						onclick={() => isGridView = true}>
						<LayoutGrid class="size-3.5" />
					</button>
				</div>
				{#if copiedFileId}
					<Button variant="outline" onclick={pasteFile} aria-label="Paste here">Paste here</Button>
				{/if}
				{#if moveFileId}
					<Button
						variant="outline"
						onclick={confirmMoveFile}
						disabled={myFiles.find(f => f.id === moveFileId)?.location === currentLocation}
						aria-label="Move file here"
						title={myFiles.find(f => f.id === moveFileId)?.location === currentLocation ? 'File is already in this location' : 'Move file here'}>
						Move here
					</Button>
				{/if}
				<Button
					variant="outline"
					aria-label="Refresh file list"
					onclick={() => {
						rotate = true;
						loadFiles();
						toast.success('Refreshed file list');
						setTimeout(() => rotate = false, 500);
					}}
				>
					<RefreshCw class="size-4 {rotate ? 'animate-spin' : ''}" />
				</Button>
			</div>
		</div>

		{#if !isGridView}
			<div class="overflow-x-auto h-[84%]">
				<table class="min-w-full text-sm">
					<thead class="border-b">
						<tr>
							<th class="px-4 py-2 text-left w-10">
								<span class="flex items-center justify-center">
									<label for="select-all" class="sr-only">Select All</label>
									<input
										type="checkbox"
										id="select-all"
										checked={allSelected}
										onchange={toggleSelectAll}
										class="size-4 rounded border-zinc-300 text-blue-600"
									/>
								</span>
							</th>
							<th class="px-4 py-2 text-left font-medium text-zinc-600 w-52 relative">
								{#if selectedIds.length > 0}
									<Button size="sm" variant="secondary" class="h-6 text-xs w-32 rounded absolute top-1" onclick={askBulkDelete} aria-label="Delete selected files">
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
												<label for={`file-${file.id}`} class="sr-only">Select file {file.name}</label>
												<input
													type="checkbox"
													id={`file-${file.id}`}
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
											<Button size="icon" variant="ghost" class="size-6" onclick={(e) => { e.stopPropagation(); downloadFile(file.id); }} aria-label="Download file">
												<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
												</svg>
											</Button>
											<Button
												size="icon"
												variant="ghost"
												class="size-6"
												aria-label="Copy file"
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
												aria-label="Move file"
												onclick={(e) => {
													e.stopPropagation();
													moveFile(file);
												}}
											>
												<Move class="size-3.5" />
											</Button>
										{/if}
										<Button size="icon" variant="ghost" class="size-6" onclick={(e) => { e.stopPropagation(); askDelete(file); }} aria-label="Delete file">
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
					class="group relative flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow transition hover:shadow-lg hover:border-zinc-300 min-h-44 {moveFileId === file.id ? 'opacity-50' : ''} {selectedIds.includes(file.id) ? 'ring-2 ring-blue-500 !bg-blue-50/60' : ''}"
					onclick={() => handleGridClick(file)}
					role="presentation"
				>
					<div
					class="mx-auto flex size-20 items-center justify-center rounded-xl text-white shadow-inner shadow-black/10 {file.type === 'folder' ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500' : 'bg-gradient-to-br from-fuchsia-400 via-pink-500 to-rose-500'}"
					>
					{#if file.type === 'folder'}
						<FolderIcon class="size-8" stroke-width="1.6" />
					{:else}
						<FileIcon class="size-8" stroke-width="1.6" />
					{/if}
					</div>

					<div class="space-y-0.5 text-center">
					<p class="truncate text-sm font-medium text-zinc-900">{file.name}</p>
					<p class="flex justify-center text-xs text-zinc-500 text-center">
						<span class="truncate">{file.location ? '/' + file.location : 'root'}</span>
					</p>
					<span class="block text-center text-[10px] text-zinc-500">{file.type === 'folder' ? '' : `${(Number(file.size) / 1024).toFixed(2)} KB`}</span>
					</div>

					<div class="absolute top-2 right-2 z-10">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class="rounded-md p-1 hover:bg-zinc-200" aria-label="File actions">
							<MoreVertical class="size-4 text-zinc-600" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
							class="min-w-32 rounded-md border border-zinc-200 bg-white p-1 shadow-lg text-xs z-20"
							align="end"
							>
							<DropdownMenu.Item onclick={(e) => { e.stopPropagation(); openFileOrFolder(file); }} class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100">
								<ExternalLink class="size-4" />Open
							</DropdownMenu.Item>
							{#if file.type === 'file'}
								<DropdownMenu.Item onclick={(e) => { e.stopPropagation(); downloadFile(file.id) }} class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100">
								<Download size="14" />Download
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={(e) => { e.stopPropagation(); copyFile(file) }} class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100">
								<Copy size="14" />Copy
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={(e) => { e.stopPropagation(); moveFile(file) }} class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100">
								<Move size="14" />Move
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Item onclick={(e) => { e.stopPropagation(); askDelete(file) }} class="flex items-center gap-2 rounded px-2 py-1 text-red-600 hover:bg-red-600/10">
								<Trash size="14" />Delete
							</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
				{/each}
				{#if selectedIds.length > 0}
					<div class="absolute -top-2 right-4 z-20">
						<Button size="sm" class="font-light opacity-75 hover:opacity-100" variant="secondary" onclick={askBulkDelete} aria-label="Delete selected files">
							Delete Selected ({selectedIds.length})
						</Button>
					</div>
				{/if}
			{:else}
				<p class="col-span-full py-10 text-center text-zinc-500">Empty! Create a folder or upload a file here.</p>
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