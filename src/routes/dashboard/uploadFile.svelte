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

	async function startUpload() {
		if (!selectedFile) return;
		uploading = true;
		uploadProgress = 0;

		try {
			const res = await fetch('/api/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: selectedFile.name,
					location: currentLocation,
					visibility,
					type: 'file',
					size: selectedFile.size 
				})
			});

			if (!res.ok) throw new Error('Failed to get upload URL');
			const { uploadUrl, fileId, name } = await res.json();

			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('PUT', uploadUrl, true);
				xhr.setRequestHeader('Content-Type', selectedFile!.type || 'application/octet-stream');
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						uploadProgress = Math.round((e.loaded / e.total) * 100);
					}
				};
				xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
				xhr.onerror = reject;
				xhr.send(selectedFile);
			});

			await fetch('/api/upload', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId })
			});

			onReflectUpload({
				id: fileId,
				name,
				location: currentLocation,
				status: 'uploaded',
				type: 'file',
				size: selectedFile.size,
				createdAt: new Date().toISOString()
			});

			toast.success('Upload complete');
			reset();
		} catch (err) {
			toast.error('Upload failed');
		} finally {
			uploading = false;
		}
	}

	function reset() {
		dialogOpen = false;
		selectedFile = null;
		uploadProgress = 0;
	}
</script>

<Button onclick={() => (dialogOpen = true)}>
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
			<Dialog.Close class="absolute top-2 right-2 rounded-md p-1 text-zinc-500 hover:text-zinc-800">
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

			<Button
				class="mt-4 w-fit"
				disabled={!selectedFile || uploading}
				onclick={startUpload}
			>
				{uploading ? `${uploadProgress}% uploading...` : selectedFile ? `Upload File` : 'Choose File'}
			</Button>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>