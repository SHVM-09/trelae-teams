<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Dialog } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Upload, X } from 'lucide-svelte';

	let {
		currentLocation = '',
		visibility = 'private',
		onReflectUpload = () => {}
	} = $props();

	let dialogOpen = $state(false);
	let selectedFile: File | null = $state(null);
	let uploading = $state(false);
	let uploadProgress = $state(0);

	// Storage limits fetched once when dialog opens
	let limits: { used: number; limit: number; usedPercent: number } | null = $state(null);

	async function fetchLimits() {
		try {
			const res = await fetch('/api/limits');
			if (!res.ok) throw new Error('Failed to fetch limits');
			limits = await res.json();
		} catch (e) {
			console.error(e);
			toast.error('Unable to check storage limits');
			limits = null;
		}
	}

	async function startUpload() {
		if (!selectedFile) return;

		// Check against limit before upload
		if (limits && selectedFile.size + limits.used > limits.limit) {
			toast.error("Storage limit exceeded. Please upgrade your plan.");
			return;
		}

		uploading = true;
		uploadProgress = 0;

		try {
			// Step 1: request upload (server will choose single vs multipart)
			const initRes = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: selectedFile.name,
					location: currentLocation,
					visibility,
					type: 'file',                 // keep your existing DB "type"
					fileType: selectedFile.type,  // pass MIME for multipart
					size: selectedFile.size
				})
			});
			if (!initRes.ok) throw new Error('Failed to get upload URL');
			const start = await initRes.json();

			// === SINGLE PUT path =====================================
			if (start.uploadUrl) {
				await new Promise<void>((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhr.open('PUT', start.uploadUrl, true);
					xhr.setRequestHeader('Content-Type', selectedFile!.type || 'application/octet-stream');
					xhr.upload.onprogress = (e) => {
						if (e.lengthComputable) {
							uploadProgress = Math.round((e.loaded / e.total) * 100);
						}
					};
					xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('PUT failed')));
					xhr.onerror = () => reject(new Error('PUT network error'));
					xhr.send(selectedFile);
				});

				// finalize
				await fetch('/api/upload', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fileId: start.fileId })
				});

				onReflectUpload({
					id: start.fileId,
					name: start.name,
					location: currentLocation,
					status: 'uploaded',
					type: 'file',
					size: selectedFile.size,
					createdAt: new Date().toISOString()
				});

				toast.success('Upload complete');
				reset();
				return;
			}

			// === MULTIPART path ======================================
			const totalSize = selectedFile.size;
			let uploadedBytes = 0;
			const parts: { partNumber: number; etag: string }[] = [];

			for (const { partNumber, url } of start.urls.sort(
				(a: { partNumber: number; url: string }, b: { partNumber: number; url: string }) => a.partNumber - b.partNumber
			)) {
				const startByte = (partNumber - 1) * start.partSize;
				const endByte = Math.min(startByte + start.partSize, totalSize);
				const blobPart = selectedFile.slice(startByte, endByte);

				const etag: string = await new Promise((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhr.open('PUT', url, true);
					xhr.upload.onprogress = (e) => {
						if (e.lengthComputable) {
							const currentPartProgress = e.loaded;
							const overall = uploadedBytes + currentPartProgress;
							uploadProgress = Math.min(99, Math.round((overall / totalSize) * 100)); // keep 1% for finalize state
						}
					};
					xhr.onload = () => {
						if (xhr.status >= 200 && xhr.status < 300) {
							const header = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag');
							if (!header) return reject(new Error(`Missing ETag for part ${partNumber}`));
							resolve(header.replaceAll('"', ''));
						} else {
							reject(new Error(`Part ${partNumber} upload failed`));
						}
					};
					xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
					xhr.send(blobPart);
				});

				uploadedBytes += blobPart.size;
				parts.push({ partNumber, etag });
			}

			// finalize multipart
			const finalizeRes = await fetch('/api/upload', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fileId: start.fileId,
					uploadId: start.uploadId,
					parts
				})
			});
			if (!finalizeRes.ok) throw new Error('Failed to finalize multipart upload');
			uploadProgress = 100;

			onReflectUpload({
				id: start.fileId,
				name: start.name,
				location: currentLocation,
				status: 'uploaded',
				type: 'file',
				size: selectedFile.size,
				createdAt: new Date().toISOString()
			});

			toast.success('Upload complete');
			reset();
		} catch (err) {
			console.error(err);
			toast.error('Upload failed');
		} finally {
			uploading = false;
		}
	}

	function reset() {
		dialogOpen = false;
		selectedFile = null;
		uploadProgress = 0;
		limits = null;
	}
</script>

<Button onclick={() => { dialogOpen = true; fetchLimits(); }}>
	<Plus class="size-4 mr-2" /> Upload File
</Button>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/70" />
		<Dialog.Content
			onclick={(e) => e.stopPropagation()}
			class="fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-7 shadow-popover"
		>
			<Dialog.Title class="text-xl font-semibold tracking-tight text-zinc-800 mb-4">Upload File</Dialog.Title>
			<Dialog.Close class="absolute top-2 right-2 rounded-md p-1 text-zinc-500 hover:text-zinc-800" aria-label="Close">
				<X size="16" />
			</Dialog.Close>

			<label
				for="file"
				class="flex flex-col cursor-pointer min-h-32 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100"
			>
				<Upload class="size-4" />
				<p>{selectedFile?.name || 'click to select a file'}</p>
				<input
					id="file"
					type="file"
					class="hidden"
					onchange={(e) => {
						const f = (e.target as HTMLInputElement).files?.[0];
						if (f) selectedFile = f;
					}}
				/>
			</label>

			<!-- Storage warning -->
			{#if limits && selectedFile && selectedFile.size + limits.used > limits.limit}
				<p class="mt-2 text-xs text-red-600">
					This file will exceed your plan limit. Please upgrade to upload or delete existing files.
				</p>
			{/if}

			<!-- PROGRESS BAR UI -->
			{#if uploading}
				<div class="mt-4">
					<div class="flex items-center justify-between mb-1">
						<span class="text-xs font-medium text-zinc-600">
							{uploadProgress < 100 ? 'Uploading…' : 'Finalizing…'}
						</span>
						<span class="text-xs tabular-nums text-zinc-700">{uploadProgress}%</span>
					</div>

					<div
						class="h-2 w-full rounded-full bg-zinc-200 overflow-hidden"
						role="progressbar"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={uploadProgress}
						aria-label="Upload progress"
					>
						<div
							class="h-full rounded-full transition-[width] duration-200 ease-linear bg-gradient-to-r from-blue-500 to-blue-600"
							style={`width:${uploadProgress}%;`}
						></div>
					</div>

					<p class="mt-2 text-[11px] text-zinc-500">
						Please keep this dialog open while the file uploads.
					</p>
				</div>
			{/if}

			<Button
				class="mt-4 w-fit"
				disabled={!selectedFile || uploading || (limits && selectedFile.size + limits.used > limits.limit)}
				onclick={startUpload}
			>
				{uploading ? `uploading...` : selectedFile ? `Upload File` : 'Choose File'}
			</Button>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>