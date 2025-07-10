<script lang="ts">
  import { signOut } from "@auth/sveltekit/client";
  import { Button } from "$lib/components/ui/button";
  import { toast } from 'svelte-sonner';
  import {
    LogOut,
    Users,
    Folder,
    ShieldCheck,
    Link,
    UploadCloud,
    CreditCard,
    Trash
  } from "lucide-svelte";
  import {
		Avatar,
		AvatarImage,
		AvatarFallback
	} from "$lib/components/ui/avatar"
  import type { PageProps } from "./$types";
  import ConfirmDeleteDialog from './confirmDeleteDialog.svelte';
  import { onMount } from 'svelte';

  interface Member {
    id: string;
    name: string;
    email?: string;
    image?: string;
    role?: string;
    [key: string]: any;
  }

  let members: Member[] = $state([]);

  onMount(async () => {
		const res = await fetch('api/dashboard');
		const data = await res.json();
		members = data.members;
	});

	let confirmOpen = $state(false);
  let userToDelete: Member | null = $state(null);

  function askRemove(member: Member) {
    userToDelete = member;
    confirmOpen = true;
  }

  async function confirmRemove() {
    if (!userToDelete) return;
    await fetch('api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', userId: userToDelete.id })
    });
    members = members.filter(m => m.id !== userToDelete?.id);
    toast.success(`Removed ${userToDelete.name}`);
    confirmOpen = false;
    userToDelete = null;
  }

	async function changeRole(id: string, role: string) {
		await fetch('api/dashboard', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'update', userId: id, role })
		});
		members = members.map(m => m.id === id ? { ...m, role } : m);
	}

  let { data }: PageProps = $props();
  const user = data.session?.user;

  let selectedFile: File | null = $state(null);
  let uploading = $state(false);

  // File input ref (hidden)
  let fileInput: HTMLInputElement | null = $state(null);

  function openFilePicker() {
    fileInput?.click();
  }

  async function quickUpload() {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    uploading = true;

    // 1️⃣ Get presigned upload URL & create DB entry
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: selectedFile.name,
        visibility: 'private',
        location: ''
      })
    });

    if (!res.ok) {
      toast.error("Could not get upload URL.");
      uploading = false;
      return;
    }

    const { uploadUrl, fileId } = await res.json();

    // 2️⃣ Upload file directly with PUT
    await fetch(uploadUrl, {
      method: 'PUT',
      body: selectedFile,
      headers: {
        'Content-Type': selectedFile.type || 'application/octet-stream'
      }
    });

    // 3️⃣ Mark upload as complete in DB
    await fetch('/api/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    });

    toast.success(`Uploaded: ${selectedFile.name}`);
    selectedFile = null;
    uploading = false;
  }
</script>

<div class="max-w-6xl mx-auto px-6 py-12 space-y-12">
  <!-- Welcome -->
  <section class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-4">
      <Avatar class="shrink-0 size-28 rounded-lg">
					<AvatarImage src={user?.image ?? "https://placehold.co/600x400"} alt={user?.name ?? "User"} />
					<AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
			</Avatar>
      <div>
        <h1 class="text-3xl font-bold text-zinc-900">
          {user?.name ?? "user"}
        </h1>
        <p class="text-sm text-zinc-500">{user?.email}</p>
        {#if user?.role}
          <span
            class={`inline-block mt-2 rounded px-3 py-0.5 text-sm font-medium ${
              user.role.trim() === "admin"
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {user.role.trim()}
          </span>
        {/if}
      </div>
    </div>
    <Button
      variant="outline"
      size="sm"
      class="gap-2 flex items-center self-end"
      onclick={signOut}
    >
      <LogOut class="w-4 h-4" /> Sign Out
    </Button>
  </section>

  <!-- Quick Actions -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
    {#if user?.teamId && user?.role?.trim() !== "member"}
      <!-- Invite -->
      <a href="/dashboard/teams/invite" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group">
        <div class="flex items-center justify-between mb-4">
          <Users class="w-6 h-6 text-blue-600 group-hover:scale-110 transition" />
          <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Team</span>
        </div>
        <h3 class="text-lg font-semibold text-zinc-900 mb-1">Invite Members</h3>
        <p class="text-sm text-zinc-600">Send invite links and grow your workspace.</p>
      </a>
    {/if}

    <!-- My Files (always visible) -->
    <a href="/dashboard/my-files" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group">
      <div class="flex items-center justify-between mb-4">
        <Folder class="w-6 h-6 text-green-600 group-hover:scale-110 transition" />
        <span class="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Private</span>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 mb-1">My Files</h3>
      <p class="text-sm text-zinc-600">Upload, organize & manage your files securely.</p>
    </a>

    {#if user?.teamId}
      <!-- Team Files -->
      <a href="/teams/files" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group">
        <div class="flex items-center justify-between mb-4">
          <ShieldCheck class="w-6 h-6 text-purple-600 group-hover:scale-110 transition" />
          <span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Shared</span>
        </div>
        <h3 class="text-lg font-semibold text-zinc-900 mb-1">Team Files</h3>
        <p class="text-sm text-zinc-600">Access & collaborate on team-level files.</p>
      </a>
    {/if}

    <!-- Public Files (always visible) -->
    <a href="/public" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group max-h-fit">
      <div class="flex items-center justify-between mb-4">
        <Link class="w-6 h-6 text-amber-600 group-hover:scale-110 transition" />
        <span class="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Public</span>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 mb-1">Public Files</h3>
      <p class="text-sm text-zinc-600">Browse files shared publicly by your team.</p>
    </a>

    <!-- Upload CTA (always visible) -->
    <div
      class="flex flex-col justify-between rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 hover:bg-zinc-100 transition group md:col-span-2 cursor-pointer shadow-sm"
      onclick={openFilePicker}
      role="presentation"
    >
      <div class="flex items-center justify-between mb-6">
        <UploadCloud class="w-6 h-6 text-zinc-500 group-hover:text-zinc-700 transition" />
        <span class="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full">Quick</span>
      </div>

      <div class="flex-1">
        <h3 class="text-xl font-semibold text-zinc-900 mb-2">Upload New File</h3>
        <p class="text-sm text-zinc-600 mb-6">
          Click to add new files to My Files instantly.
        </p>
      </div>

      <div class="flex-1 flex items-center justify-end gap-4">

        {#if selectedFile}
          <div class="flex-1 items-center rounded-md bg-zinc-100 px-4 py-2 text-sm text-zinc-700 font-medium border truncate">
            {selectedFile.name}
          </div>
        {/if}

        <Button
          class="w-fit"
          disabled={uploading || !selectedFile}
          onclick={(e)=> {
            e.stopPropagation();
            quickUpload();
          }}
        >
          {uploading
            ? 'Uploading...'
            : selectedFile
              ? 'Upload File'
              : 'Choose File'}
        </Button>

      </div>

      <!-- Hidden input -->
      <input
        type="file"
        bind:this={fileInput}
        class="hidden"
        onchange={(e) => {
          const target = e.target as HTMLInputElement;
          selectedFile = target.files ? target.files[0] : null;
        }}
      />
    </div>
  </section>

  {#if members.length}
    <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <Users class="w-5 h-5 text-blue-600" />
        <h3 class="text-lg font-semibold text-zinc-900">Members</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b">
            <tr>
              <th class="px-4 py-2 text-left font-medium text-zinc-600">Name</th>
              <th class="px-4 py-2 text-left font-medium text-zinc-600">Email</th>
              <th class="px-4 py-2 text-left font-medium text-zinc-600">Role</th>
              <th class="px-4 py-2 text-right"></th>
              <th class="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {#each members as member}
              <tr class="border-b hover:bg-zinc-50 transition last:border-b-0">
                <td class="px-4 py-3 font-medium text-zinc-900">{member.name}</td>
                <td class="px-4 py-3 text-zinc-600">{member.email}</td>
                <td class="px-4 py-3">
                  <span class={`inline-block rounded px-2 py-0.5 text-xs ${
                    member.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td class="px-4 py-3">
                  {#if user?.role === 'admin' && member.id !== user.id}
                    <Button size="sm" class="ml-2 text-xs w-24 h-6" onclick={() => changeRole(member.id, member.role === 'admin' ? 'member' : 'admin')}>
                      {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                    </Button>
                  {/if}
                </td>
                <td class="px-4 py-3 text-right">
                  {#if user?.role === 'admin' && member.id !== user.id}
                    <Button
                      size="icon"
                      variant="ghost"
                      class="size-6"
                      onclick={() => askRemove(member)}
                    >
                      <Trash class="size-3.5" />
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else}
    <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <Users class="w-5 h-5 text-zinc-500" />
        <h3 class="text-lg font-semibold text-zinc-900">No Members Yet</h3>
      </div>
    </section>
  {/if}
</div>

<ConfirmDeleteDialog
	bind:open={confirmOpen}
	title="Remove Member?"
	descriptionHTML={`Are you sure you want to remove <strong>${userToDelete?.name}</strong>? This cannot be undone.`}
	confirmLabel="Remove"
	destructive={true}
	onConfirm={confirmRemove}
/>