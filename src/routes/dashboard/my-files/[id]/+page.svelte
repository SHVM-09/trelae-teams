<script lang="ts">
	import { Folder as FolderIcon, File as FileIcon, Copy, Check } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	const { data } = $props();
	const file = data.file;
	const downloadUrl: string | null = data.downloadUrl;

	let downloading = $state(false);
	let copied = $state(false);

	async function download() {
		downloading = true;
		try {
			window.open(downloadUrl!, '_blank');
		} finally {
			downloading = false;
		}
	}

	function getFileExtension(name: string) {
		return name.split('.').pop()?.toLowerCase() || '';
	}

	const ext = getFileExtension(file.name);
	const isPDF = ext === 'pdf';
	const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
	const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext);

	async function copyId() {
		await navigator.clipboard.writeText(file.id);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="max-w-7xl mx-auto py-24 relative z-10 px-6">
	<a href="/dashboard/my-files" class="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		Back to My Files
	</a>

	<h1 class="text-3xl font-bold text-zinc-900 flex items-center gap-2 mb-4">
        <FileIcon />
		{file.name}
	</h1>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
		<!-- LEFT: DETAILS -->
		<div class="md:col-span-1 space-y-4 border rounded p-6 bg-white shadow-sm h-[520px]">
			<div>
				<p class="text-zinc-500 text-xs uppercase font-semibold mb-1 flex items-center justify-between">
					ID
				</p>
				<p class="font-mono break-all text-zinc-800 text-sm flex items-center gap-2">
                    {file.id}
                    <Button
						size="icon"
						variant="ghost"
						onclick={copyId}
						class="size-5 p-1"
						title="Copy ID"
					>
                        {#if copied}
                            <Check class="size-3 text-green-600" />
                        {:else}
                            <Copy class="size-3" />
                        {/if}
					</Button>
                </p>
			</div>

			<div>
				<p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Type</p>
				<p class="text-zinc-800">{file.type}</p>
			</div>

			<div>
				<p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Location</p>
				<p class="text-zinc-800 italic">{file.location ? `/${file.location}` : '/'}</p>
			</div>

			<div>
				<p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Size</p>
				<p class="text-zinc-800">
					{file.type === 'folder' ? '-' : `${(file.size / 1024).toFixed(2)} KB`}
				</p>
			</div>

			<div>
                <p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Status</p>
                <span
                    class={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        file.status === 'uploaded'
                            ? 'bg-green-100 text-green-800'
                            : file.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                    }`}
                >
                    {file.status}
                </span>
            </div>

            <div>
                <p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Visibility</p>
                <span
                    class={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        file.visibility === 'private'
                            ? 'bg-zinc-200 text-zinc-800'
                            : file.visibility === 'team'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                    }`}
                >
                    {file.visibility}
                </span>
            </div>

            <div>
                <p class="text-zinc-500 text-xs uppercase font-semibold mb-1">Created</p>
                <p class="text-zinc-800">
                    {#if file.createdAt}
                        {new Date(file.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })},
                        {new Date(file.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    {:else}
                        -
                    {/if}
                </p>
            </div>

			{#if file.type === 'file'}
				<Button
					disabled={downloading}
					onclick={download}
					class="mt-4"
				>
				    {downloading ? 'Downloading...' : 'Download File'}
				</Button>
			{/if}
		</div>

		<!-- RIGHT: PREVIEW -->
		<div class="md:col-span-2 border rounded p-4 bg-zinc-50 shadow-inner flex items-center justify-center h-[520px]">
			{#if file.type === 'file' && downloadUrl}
				{#if isPDF}
					<iframe
						src={downloadUrl}
						title={file.name}
						class="w-full h-full rounded border"
					></iframe>
				{:else if isImage}
					<img
						src={downloadUrl}
						alt={file.name}
						class="w-full h-full rounded border shadow"
					/>
				{:else if isVideo}
					<video src={downloadUrl} class="w-full h-full rounded" controls>
						<track kind="captions" label="No captions" />
					</video>
				{:else}
					<div class="flex flex-col items-center justify-center p-12 border rounded bg-white">
						<FileIcon class="w-10 h-10 text-zinc-400 mb-3" />
						<p class="text-zinc-600 text-sm">Preview not available for this file type</p>
					</div>
				{/if}
			{:else}
				<p class="text-zinc-400 text-sm">No preview for folders.</p>
			{/if}
		</div>
	</div>
</div>