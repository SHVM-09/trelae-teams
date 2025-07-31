<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Dialog } from 'bits-ui';
  import { toast } from 'svelte-sonner';
  import { Trash, Lock, X, Copy, Users } from 'lucide-svelte';

  import ConfirmDeleteDialog from '../confirmDeleteDialog.svelte';
  import type { PageProps } from './$types';

  /* ─── initial data ──────────────────────────────────────────────── */
  let { data }: PageProps = $props();
  const user = data.session?.user;

  let members  = $state(data.members);
  let invites  = $state(data.invites);

  /* ─── member removal helpers ───────────────────────────────────── */
  let confirmOpen   = $state(false);
  let userToDelete  = $state<{ id:string; name:string; email:string; role:string }|null>(null);

  function askRemove(m:{ id:string; name:string; email:string; role:string }) {
    userToDelete = m; confirmOpen = true;
  }
  async function confirmRemove() {
    if (!userToDelete) return;
    const ok = await fetch('/api/dashboard', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action:'delete', userId:userToDelete.id })
    }).then(r=>r.ok);
    if (ok) {
      members = members.filter(p=>p.id!==userToDelete?.id);
      toast.success(`Removed ${userToDelete!.name}`);
    } else toast.error('Failed to remove member');
    confirmOpen = false; userToDelete = null;
  }

  /* ─── role toggle ──────────────────────────────────────────────── */
  async function changeRole(id:string, role:string) {
    const ok = await fetch('/api/dashboard', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ action:'update', userId:id, role })
    }).then(r=>r.ok);
    if (ok) members = members.map(m=>m.id===id?{...m, role}:m);
    else toast.error('Role update failed');
  }

  /* ─── invite deletion ──────────────────────────────────────────── */
  async function deleteInvite(id:string) {
    const ok = await fetch('/api/invite', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id })
    }).then(r=>r.ok);
    if (ok) { invites = invites.filter(i=>i.id!==id); toast.success('Invite deleted'); }
    else toast.error('Failed to delete invite');
  }

  /* ─── public password (read & update) ──────────────────────────── */
  let teamInfo = $state<{ teamId:string; password:string }|null>(null);

  onMount(async () => {
    if (user?.role !== 'admin') return;
    const res = await fetch('/api/team');         // GET endpoint that returns {teamId,password}
    if (res.ok) teamInfo = await res.json();
  });

  let publicPassword      = $state('');
  let savingPassword      = $state(false);
  let passwordDialogOpen  = $state(false);

  async function savePublicPassword() {
    const pwd = publicPassword.trim();
    if (!pwd) return toast.error('Password cannot be empty');

    savingPassword = true;
    try {
      const ok = await fetch('/api/team', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ password: pwd })
      }).then(r=>r.ok);

      if (!ok) throw new Error();
      toast.success('Public password updated');
      // 🔄 refresh card instantly
      if (teamInfo) teamInfo = { ...teamInfo, password: pwd };
      publicPassword = '';
      passwordDialogOpen = false;
    } catch { toast.error('Save failed'); }
    finally { savingPassword = false; }
  }

  function copy(txt:string) {
    navigator.clipboard.writeText(txt);
    toast.success('Copied');
  }
</script>

<!-- ═════════════════ MAIN PAGE ═════════════════ -->
<div class="max-w-5xl mx-auto py-12 space-y-12 px-8">

  <!-- ▸ page heading -->
  <header class="space-y-2 relative">
    <h1 class="text-2xl font-extrabold tracking-tight text-blue-500 flex items-center gap-2">
     <Users class="inline-block align-middle" /> Team
    </h1>
    <p class="text-xs text-zinc-600">
      Manage members, invitations, and public-access credentials for your workspace.
    </p>
  </header>

  <!-- ─── Members ─── -->
  <section class="rounded-lg border border-zinc-200 bg-white shadow-sm p-6 relative overflow-auto">
    <h2 class="text-xl font-semibold text-zinc-900 mb-4">Team</h2>
    <table class="w-full text-sm">
      <thead class="border-b">
        <tr>
          <th class="px-4 py-2 text-left">Name</th>
          <th class="px-4 py-2 text-left">Email</th>
          <th class="px-4 py-2 text-left">Role</th>
          <th class="px-4 py-2 text-right"></th>
          <th class="px-4 py-2 text-right"></th>
        </tr>
      </thead>
      <tbody>
        {#if members.length}
          {#each members as m}
            <tr class="border-b last:border-b-0 hover:bg-zinc-50">
              <td class="px-4 py-2 font-medium">{m.name}</td>
              <td class="px-4 py-2">{m.email}</td>
              <td class="px-4 py-2">
                <span class={`inline-block rounded px-2 py-0.5 text-xs ${
                    m.role==='admin'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>
                  {m.role}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                {#if user?.role==='admin' && m.id!==user.id}
                  <Button size="sm" class="h-6 w-24 text-xs"
                          onclick={() => changeRole(m.id, m.role==='admin'?'member':'admin')}>
                    {m.role==='admin'?'Make Member':'Make Admin'}
                  </Button>
                {/if}
              </td>
              <td class="px-4 py-2 text-right">
                {#if user?.role==='admin' && m.id!==user.id}
                  <Button size="icon" variant="ghost" class="size-6"
                          onclick={() => askRemove({
                            id: m.id,
                            name: m.name ?? '',
                            email: m.email,
                            role: m.role ?? ''
                          })}>
                    <Trash class="size-4"/>
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

  <!-- ─── Public Access card ─── -->
  {#if user?.role==='admin' && teamInfo}
    <section class="rounded-lg border border-zinc-200 bg-white/90 shadow-sm p-6 space-y-6 relative">
      <h2 class="text-xl font-semibold text-zinc-900">Public&nbsp;Access</h2>

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Team ID -->
        <div>
          <p class="text-xs font-medium text-zinc-500 uppercase mb-1">Team&nbsp;ID</p>
          <div class="flex items-center gap-2 break-all">
            <span class="font-mono text-sm text-zinc-800">{teamInfo.teamId}</span>
            <button class="p-1.5 rounded-md hover:bg-zinc-100" title="Copy Team ID"
                    onclick={() => copy(teamInfo?.teamId || '')}>
              <Copy class="size-4 text-zinc-500"/>
            </button>
          </div>
        </div>

        <!-- Public Password -->
        <div>
          <p class="text-xs font-medium text-zinc-500 uppercase mb-1">Public&nbsp;Password</p>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-zinc-800">{teamInfo.password}</span>
            <button class="p-1.5 rounded-md hover:bg-zinc-100" title="Copy Password"
                    onclick={() => copy(teamInfo?.password || '')}>
              <Copy class="size-4 text-zinc-500"/>
            </button>
          </div>
        </div>
      </div>

      <!-- change button -->
      <Button class="mt-2 w-fit" onclick={() => passwordDialogOpen = true}>
        <Lock class="size-4 mr-2"/> Change&nbsp;Public&nbsp;Password
      </Button>
    </section>
  {/if}

  <!-- ─── Invites ─── -->
  <section class="rounded-lg border border-zinc-200 bg-white shadow-sm p-6 relative overflow-auto">
    <h2 class="text-xl font-semibold text-zinc-900 mb-4">Pending&nbsp;Invites</h2>
    <table class="w-full text-sm">
      <thead class="border-b">
        <tr>
          <th class="px-4 py-2 text-left">Email</th>
          <th class="px-4 py-2 text-left">Sent&nbsp;At</th>
          <th class="px-4 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if invites.length}
          {#each invites as i}
            <tr class="border-b last:border-b-0 hover:bg-zinc-50">
              <td class="px-4 py-2 font-medium">{i.email}</td>
              <td class="px-4 py-2">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : ''}</td>
              <td class="px-4 py-2 text-right">
                {#if user?.role==='admin'}
                  <Button variant="ghost" size="icon" class="size-6" onclick={() => deleteInvite(i.id)}>
                    <Trash class="size-4"/>
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

<!-- ─── Confirm member removal dialog ─── -->
<ConfirmDeleteDialog
  bind:open={confirmOpen}
  title="Remove Member?"
  descriptionHTML={`Are you sure you want to remove <strong>${userToDelete?.name}</strong>? This cannot be undone.`}
  confirmLabel="Remove"
  destructive
  onConfirm={confirmRemove}
/>

<!-- ─── Public-password dialog ─── -->
<Dialog.Root bind:open={passwordDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/70"/>
    <Dialog.Content
      onclick={(e)=>e.stopPropagation()}
      class="fixed top-[50%] left-[50%] z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2
             rounded-lg border bg-white p-7 shadow-popover space-y-4">
      <Dialog.Title class="text-xl font-semibold text-zinc-800">Set&nbsp;Public&nbsp;Password</Dialog.Title>

      <input
        class="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        placeholder="Enter new password"
        bind:value={publicPassword}
      />

      <div class="flex justify-end gap-2">
        <Button variant="secondary" onclick={()=>passwordDialogOpen=false}>Cancel</Button>
        <Button disabled={!publicPassword.trim()||savingPassword} onclick={savePublicPassword}>
          {savingPassword ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <Dialog.Close class="absolute top-2 right-2 rounded-md p-1 text-zinc-500 hover:text-zinc-800">
        <X size="16"/>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>