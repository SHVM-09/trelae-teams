<script lang="ts">
	import { AlertDialog } from 'bits-ui';

	let {
		open = $bindable(false),
		title = 'Delete File?',
		descriptionHTML = 'Are you sure you want to delete this file? This action cannot be undone.',
		confirmLabel = 'Delete',
		cancelLabel = 'Cancel',
		destructive = true,
		onConfirm,
		onCancel = () => {
			open = false;
		}
	}: {
		open: boolean;
		title?: string;
		descriptionHTML?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onConfirm: () => void;
		onCancel?: () => void;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />

		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border bg-white p-6 shadow-lg"
			onclick={(e) => e.stopPropagation()}
		>
			<AlertDialog.Title class="text-xl font-semibold text-zinc-800">
				{title}
			</AlertDialog.Title>

			<AlertDialog.Description class="mt-2 text-sm text-zinc-600">
				{@html descriptionHTML}
			</AlertDialog.Description>

			<div class="mt-5 flex justify-end gap-2">
				<AlertDialog.Cancel
					class="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200"
					onclick={onCancel}
				>
					{cancelLabel}
				</AlertDialog.Cancel>

				<AlertDialog.Action
					class={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-800 hover:bg-zinc-900'}`}
					onclick={onConfirm}
				>
					{confirmLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>