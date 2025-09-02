<script lang="ts">
  import { signOut } from "@auth/sveltekit/client";
  import { Button } from "$lib/components/ui/button";
  import { toast } from 'svelte-sonner';
  import {
    Users,
    Folder,
    ShieldCheck,
    Globe,
    UploadCloud,
    CreditCard,
    Trash,
    LayoutDashboard
  } from "lucide-svelte";
  import {
		Avatar,
		AvatarImage,
		AvatarFallback
	} from "$lib/components/ui/avatar"
  import type { PageProps } from "./$types";
  import ConfirmDeleteDialog from './confirmDeleteDialog.svelte';
  import {goto} from "$app/navigation";
  import { onMount } from "svelte";

  interface Member {
    id: string;
    name: string | null;
    email?: string;
    image?: string;
    role?: string | null;
    [key: string]: any;
  }

  let { data }: PageProps = $props();

  let limits = $state(data.limits);

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    teamId?: string | null;
    [key: string]: any;
  }

  const user: User | undefined = data.session?.user;
  let members: Member[] = $state(data.members);

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
        location: '',
        type: 'file',
        size: selectedFile.size
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

  let invites = $state(data.invites);

  async function deleteInvite(inviteId: string) {
    const res = await fetch('/api/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inviteId })
    });

    if (res.ok) {
      invites = invites.filter(inv => inv.id !== inviteId);
      toast.success('Invite deleted');
    } else {
      toast.error('Failed to delete invite');
    }
  }

  let confirmPlanOpen = $state(false);
  let deletingPlan    = $state(false);

  async function confirmDeletePlan() {
    deletingPlan = true;
    try {
      const res = await fetch('/api/plan', { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Plan deleted successfully');
      // optional: sign-out or redirect after deletion
      goto('/', { replaceState: true });
    } catch (e) {
      toast.error('Failed to delete plan');
    } finally {
      deletingPlan   = false;
      confirmPlanOpen = false;
    }
  }

  let confirmLeaveOpen = $state(false);
  let leavingTeam      = $state(false);

  async function confirmLeaveTeam() {
    leavingTeam = true;
    try {
      const res = await fetch("/api/team/leave", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("You’ve left the team");
      goto("/", { replaceState: true });
    } catch {
      toast.error("Unable to leave team");
    } finally {
      leavingTeam   = false;
      confirmLeaveOpen = false;
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
</script>

<div class="max-w-5xl mx-auto px-6 py-12 space-y-6 relative">

  <!-- ▸ page heading -->
  <header class="relative flex gap-2">
      <div class="space-y-2">
        <h1 class="text-2xl font-extrabold tracking-tight text-fuchsia-500 flex items-center gap-2">
          <LayoutDashboard class="inline-block align-middle" /> Dashboard
        </h1>
        <p class="text-xs text-zinc-600">
          Your central hub — get an overview of your activity, manage your personal and team files, and access all key tools from a single, streamlined space.
        </p>
      </div>
      {#if limits}
        <div class="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm min-w-xs">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-medium text-zinc-700">
              Usage:
            </p>
            <span
              class={`px-2.5 py-1 rounded-full text-xs font-medium ${
                limits.usedPercent < 70
                  ? "bg-green-100 text-green-800"
                  : limits.usedPercent < 90
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {limits.usedPercent.toFixed(0)}%
            </span>
          </div>

          <div class="w-full h-3 bg-zinc-200 rounded-full overflow-hidden">
            <div
              class={`h-3 rounded-full transition-all ${
                limits.usedPercent < 70
                  ? "bg-gradient-to-r from-green-400 to-green-500"
                  : limits.usedPercent < 90
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                  : "bg-gradient-to-r from-red-500 to-rose-600"
              }`}
              style={`width: ${limits.usedPercent}%`}
            ></div>
          </div>

          <div class="flex justify-center text-[10px] text-zinc-600 mt-1">
            <span>{formatBytes(limits.used)} / {formatBytes(limits.limit)}</span>
          </div>
        </div>
      {/if}
  </header>

  <!-- Welcome -->
  <section
    class="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
  >
    <!-- avatar & user info -->
    <div class="flex items-center gap-5">
      <Avatar class="size-20 sm:size-24 md:size-28 rounded-full ring-1 ring-zinc-200 shadow-sm shrink-0">
        <AvatarImage
          src={user?.image ?? "https://placehold.co/600x400"}
          alt={user?.name ?? "User"}
          class="object-cover"
        />
        <AvatarFallback class="text-2xl sm:text-3xl">{user?.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>

      <div>
        <h1 class="text-xl sm:text-2xl font-medium tracking-tight text-zinc-900">
          {user?.name ?? "User"}
        </h1>
        <p class="text-xs text-zinc-500 truncate max-w-[220px] sm:max-w-xs">{user?.email}</p>
        {#if user?.role}
          <span
            class={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-medium capitalize ${
              user.role.trim() === "admin"
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {user.role.trim()}
          </span>
        {/if}
        <span
          class={`rounded-full capitalize inline-flex items-center text-xs font-medium px-3 py-1
            ${data.session?.user?.plan === 'pro'
              ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
              : data.session?.user?.plan === 'enterprise'
              ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white'
              : data.session?.user?.plan === 'basic'
              ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
              : 'bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-700'}
          `}
        >
          {data.session?.user?.plan || 'free'}
        </span>
      </div>
    </div>

    <!-- sign out -->
    <div class="flex flex-col gap-4">
      <div class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 p-[1px]" >
        <button
          onclick={() => signOut()}
          class="rounded-full w-full bg-white text-sm font-medium px-4 py-2 hover:bg-zinc-50 transition-colors"
        >
          <span class="bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
            Sign out
          </span>
        </button>
      </div>

      {#if user?.teamId}
        {#if user?.role === 'admin'}
          <!-- Delete Team (admin) -->
          <div class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 p-[1px]">
            <button
              class="rounded-full w-full bg-white text-sm font-medium px-4 py-2 hover:bg-zinc-50 transition-colors text-red-600"
              onclick={() => confirmPlanOpen = true}>
              Delete Team
            </button>
          </div>
        {:else}
          <!-- Leave Team (member) ─── NEW -->
          <div class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 p-[1px]">
            <button
              class="rounded-full w-full bg-white text-sm font-medium px-4 py-2 hover:bg-zinc-50 transition-colors text-red-600"
              onclick={() => confirmLeaveOpen = true}>
              Leave Team
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </section>

  <!-- Quick Actions -->
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#if user?.teamId && user?.role?.trim() !== "member"}
      <!-- Invite -->
      <a href="/dashboard/team/invite" class="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between mb-4">
          <Users class="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
          <span class="text-xs rounded-full bg-blue-50 text-blue-600 px-2 py-0.5">Team</span>
        </div>
        <h3 class="text-base font-semibold text-zinc-900 mb-1">Invite Members</h3>
        <p class="text-sm text-zinc-600">Send invite links and grow your workspace.</p>
      </a>
    {/if}

    <!-- My Files -->
    <a href="/dashboard/my-files" class="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition h-fit">
      <div class="flex items-center justify-between mb-4">
        <Folder class="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
        <span class="text-xs rounded-full bg-green-50 text-green-600 px-2 py-0.5">Private</span>
      </div>
      <h3 class="text-base font-semibold text-zinc-900 mb-1">My Files</h3>
      <p class="text-sm text-zinc-600">Upload, organize & manage your files securely.</p>
    </a>

    {#if user?.teamId}
      <!-- Team Files -->
      <a href="/dashboard/team-files" class="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between mb-4">
          <Folder class="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
          <span class="text-xs rounded-full bg-purple-50 text-purple-600 px-2 py-0.5">Shared</span>
        </div>
        <h3 class="text-base font-semibold text-zinc-900 mb-1">Team Files</h3>
        <p class="text-sm text-zinc-600">Access & collaborate on team-level files.</p>
      </a>

      <!-- Public Files -->
      <a href="/public-files" class="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition max-h-fit">
        <div class="flex items-center justify-between mb-4">
          <Globe class="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
          <span class="text-xs rounded-full bg-amber-50 text-amber-600 px-2 py-0.5">Public</span>
        </div>
        <h3 class="text-base font-semibold text-zinc-900 mb-1">Public Files</h3>
        <p class="text-sm text-zinc-600">Browse files shared publicly by your team.</p>
      </a>
    {:else}
      <!-- Upgrade -->
      <a href="/dashboard/checkout" class="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition">
        <div class="flex items-center justify-between mb-4">
          <CreditCard class="w-6 h-6 text-yellow-600 group-hover:scale-110 transition-transform" />
          <span class="text-xs rounded-full bg-yellow-50 text-yellow-600 px-2 py-0.5">Upgrade</span>
        </div>
        <h3 class="text-base font-semibold text-zinc-900 mb-1">Upgrade to Teams</h3>
        <p class="text-sm text-zinc-600">Create teams for collaboration.</p>
      </a>
    {/if}

    <!-- Upload CTA -->
    <div
      class="group flex flex-col justify-between rounded-xl border border-dashed border-zinc-300 p-6 hover:bg-zinc-50 transition cursor-pointer shadow-sm md:col-span-2"
      onclick={openFilePicker}
      role="presentation"
    >
      <div class="flex items-center justify-between mb-6">
        <UploadCloud class="w-6 h-6 text-zinc-500 group-hover:text-zinc-700 group-hover:scale-110 transition-transform" />
        <span class="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full">Quick</span>
      </div>

      <div class="flex-1">
        <h3 class="text-lg font-semibold text-zinc-900 mb-2">Upload New File</h3>
        <p class="text-sm text-zinc-600 mb-6">Click to add new files to My Files instantly.</p>
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
          onclick={(e) => {
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

  {#if user?.teamId}
    {#if members.length}
      <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <Users class="w-5 h-5 text-blue-600" />
          <h3 class="text-lg font-semibold text-zinc-900">Members</h3>
        </div>

        <div class="overflow-x-auto -mx-6">
          <table class="min-w-full text-sm">
            <thead class="border-b">
              <tr>
                <th class="px-4 ps-6 py-2 text-left font-medium text-zinc-600">Name</th>
                <th class="px-4 py-2 text-left font-medium text-zinc-600">Email</th>
                <th class="px-4 py-2 text-left font-medium text-zinc-600">Role</th>
                <th class="px-4 py-2 text-right"></th>
                <th class="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {#each members as member}
                <tr class="border-b hover:bg-zinc-50 transition last:border-b-0">
                  <td class="px-4 ps-6 py-3 font-medium text-zinc-900">{member.name}</td>
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
          <Users class="w-5 h-5 text-blue-600" />
          <h3 class="text-lg font-semibold text-zinc-900">Members</h3>
        </div>

        <div class="overflow-x-auto -mx-6">
          <table class="min-w-full text-sm">
            <thead class="border-b">
              <tr>
                <th class="px-4 ps-6 py-2 text-left font-medium text-zinc-600">Name</th>
                <th class="px-4 py-2 text-left font-medium text-zinc-600">Email</th>
                <th class="px-4 py-2 text-left font-medium text-zinc-600">Role</th>
                <th class="px-4 py-2 text-right"></th>
                <th class="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b hover:bg-zinc-50 transition last:border-b-0">
                <td colspan="5" class="px-4 py-3 text-center"> No members yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    {#if user?.role === 'admin'}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#if invites.length}
          <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div class="flex items-center gap-3 mb-4">
              <Users class="w-5 h-5 text-indigo-600" />
              <h3 class="text-lg font-semibold text-zinc-900">Invites</h3>
            </div>

            <div class="overflow-x-auto -mx-6">
              <table class="min-w-full text-sm">
                <thead class="border-b">
                  <tr>
                    <th class="px-4 ps-6 py-2 text-left font-medium text-zinc-600">Email</th>
                    <th class="px-4 py-2 text-left font-medium text-zinc-600">Sent&nbsp;At</th>
                    <th class="px-4 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {#each invites as invite}
                    <tr class="border-b hover:bg-zinc-50 transition last:border-b-0">
                      <td class="px-4 ps-6 py-3 font-medium text-zinc-900">
                        {invite.email}
                      </td>
                      <td class="px-4 py-3 text-zinc-600 text-nowrap">
                        {invite.createdAt
                          ? new Date(invite.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : ''}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          class="size-6"
                          onclick={() => deleteInvite(invite.id)}
                        >
                          <Trash class="size-3.5" />
                        </Button>
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
              <h3 class="text-lg font-semibold text-zinc-900">Invites</h3>
            </div>

            <p class="text-sm text-zinc-500 text-center">No pending invites</p>
          </section>
        {/if}

        <section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6 h-fit">
          <div class="flex items-center gap-3">
            <ShieldCheck class="w-5 h-5 text-indigo-600" />
            <h3 class="text-lg font-semibold text-zinc-900">
              Share Public-Files Access
            </h3>
          </div>

          <form
            onsubmit={async (e) => {
              e.preventDefault();
              const form     = e.currentTarget as HTMLFormElement;
              const formData = new FormData(form);
              const email    = formData.get('email')?.toString().trim();

              if (!email) {
                toast.error('Please enter an email address.');
                return;
              }

              const res = await fetch('/api/public-share', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ email })
              });

              if (res.ok) {
                toast.success('Public-files credentials sent.');
                form.reset();
              } else {
                toast.error(await res.text() || 'Failed to send email.');
              }
            }}
            class="flex items-center gap-4"
          >
            <input
              type="email"
              name="email"
              placeholder="recipient@example.com"
              class="w-full flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" class="whitespace-nowrap">Send</Button>
          </form>

          <p class="text-xs text-zinc-500 -mt-2">
            The recipient will receive your <strong>Team&nbsp;ID</strong> and
            public-files password so they can unlock your team’s public files.
          </p>
        </section>
      </div>
    {/if}
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

<!-- Confirm delete *team plan* – admin only -->
<ConfirmDeleteDialog
  bind:open       ={confirmPlanOpen}
  title           ="Delete Team Plan?"
  descriptionHTML ="This will permanently delete the <strong>team, team & public files, chat</strong>. All members will be downgraded to the free tier. This action cannot be undone."
  confirmLabel    ={deletingPlan ? 'Deleting…' : 'Delete Plan'}
  destructive     ={true}
  onConfirm       ={confirmDeletePlan}
/>

<!-- Leave Team dialog (member) ─── NEW -->
<ConfirmDeleteDialog
  bind:open         ={confirmLeaveOpen}
  title             ="Leave Team?"
  descriptionHTML   ="You’ll be removed from the team. You can re-join later If admin invites you again."
  confirmLabel      ={leavingTeam ? "Leaving…" : "Leave Team"}
  destructive       ={true}
  onConfirm         ={confirmLeaveTeam}
/>