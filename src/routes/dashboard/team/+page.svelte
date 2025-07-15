<script lang="ts">
  import { Trash } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import ConfirmDeleteDialog from '../confirmDeleteDialog.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const user = data.session?.user;

  let members = $state(data.members);
  let invites = $state(data.invites);

  let confirmOpen = $state(false);
  let userToDelete = $state<{ id: string; name: string; email: string; role: string } | null>(null);

  function askRemove(member: { id: string; name: string; email: string; role: string }) {
    userToDelete = member;
    confirmOpen = true;
  }

  async function confirmRemove() {
    if (!userToDelete) return;
    const res = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', userId: userToDelete.id })
    });
    if (res.ok) {
      members = members.filter(m => m.id !== userToDelete?.id);
      toast.success(`Removed ${userToDelete.name}`);
    } else {
      toast.error('Failed to remove member');
    }
    confirmOpen = false;
    userToDelete = null;
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', userId: id, role })
    });
    if (res.ok) {
      members = members.map(m => m.id === id ? { ...m, role } : m);
    } else {
      toast.error('Failed to update role');
    }
  }

  async function deleteInvite(id: string) {
    const res = await fetch('/api/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      invites = invites.filter(i => i.id !== id);
      toast.success('Invite deleted');
    } else {
      toast.error('Failed to delete invite');
    }
  }
</script>

<div class="max-w-4xl mx-auto py-12 space-y-12">
  <!-- Members Table -->
  <section class="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold text-zinc-900 mb-4">Team</h2>
    <table class="w-full text-sm">
      <thead class="border-b">
        <tr>
          <th class="text-left px-4 py-2">Name</th>
          <th class="text-left px-4 py-2">Email</th>
          <th class="text-left px-4 py-2">Role</th>
          <th class="text-right px-4 py-2"></th>
          <th class="text-right px-4 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {#if members.length}
          {#each members as m}
            <tr class="border-b hover:bg-zinc-50 last:border-b-0">
              <td class="px-4 py-2 font-medium">{m.name}</td>
              <td class="px-4 py-2">{m.email}</td>
              <td class="px-4 py-2">
                <span class={`inline-block rounded px-2 py-0.5 text-xs ${m.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {m.role}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                {#if user?.role === 'admin' && m.id !== user.id}
                  <Button size="sm" class="text-xs w-24 h-6" onclick={() => changeRole(m.id, m.role === 'admin' ? 'member' : 'admin')}>
                    {m.role === 'admin' ? 'Make Member' : 'Make Admin'}
                  </Button>
                {/if}
              </td>
              <td class="px-4 py-2 text-right">
                {#if user?.role === 'admin' && m.id !== user.id}
                  <Button size="icon" variant="ghost" class="size-6" onclick={() => askRemove({ id: m.id, name: m.name ?? '', email: m.email, role: m.role ?? '' })}>
                    <Trash class="size-4" />
                  </Button>
                {/if}
              </td>
            </tr>
          {/each}
        {:else}
          <tr><td colspan="5" class="py-4 text-center">No members yet.</td></tr>
        {/if}
      </tbody>
    </table>
  </section>

  <!-- Invites Table -->
  <section class="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold text-zinc-900 mb-4">Pending Invites</h2>
    <table class="w-full text-sm">
      <thead class="border-b">
        <tr>
          <th class="text-left px-4 py-2">Email</th>
          <th class="text-left px-4 py-2">Sent At</th>
          <th class="text-right px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if invites.length}
          {#each invites as i}
            <tr class="border-b hover:bg-zinc-50 last:border-b-0">
              <td class="px-4 py-2 font-medium">{i.email}</td>
              <td class="px-4 py-2">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : ''}</td>
              <td class="px-4 py-2 text-right">
                {#if user?.role === 'admin'}
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-6"
                    onclick={() => deleteInvite(i.id)}
                  >
                    <Trash class="size-4" />
                  </Button>
                {/if}
              </td>
            </tr>
          {/each}
        {:else}
          <tr><td colspan="3" class="py-4 text-center">No invites yet.</td></tr>
        {/if}
      </tbody>
    </table>
  </section>
</div>

<ConfirmDeleteDialog
  bind:open={confirmOpen}
  title="Remove Member?"
  descriptionHTML={`Are you sure you want to remove <strong>${userToDelete?.name}</strong>? This cannot be undone.`}
  confirmLabel="Remove"
  destructive={true}
  onConfirm={confirmRemove}
/>