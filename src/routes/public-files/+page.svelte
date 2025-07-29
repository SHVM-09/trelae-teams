<script lang="ts">
  // ---------- imports ----------
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { DropdownMenu } from 'bits-ui';
  import Header from '$lib/custom-components/Header.svelte';
  import ConfirmDeleteDialog from '../dashboard/confirmDeleteDialog.svelte';
  import CreateFolder from '../dashboard/createFolder.svelte';
  import UploadFile from '../dashboard/uploadFile.svelte';
  import {
    Trash,
    Folder as FolderIcon,
    File as FileIcon,
    ArrowLeft,
    Copy,
    Move,
    LayoutGrid,
    Table,
    MoreVertical,
    Download,
    ExternalLink,
    RefreshCw
  } from 'lucide-svelte';

  // ---------- props & reactive state ----------
  const { data } = $props();
  const canEdit  = data.canEdit ?? false;      // ← NEW flag

  // password-gate vars
  let password = $state('');
  let teamId   = $state('');
  let accessGranted: boolean = data.accessGranted;

  // file-manager vars
  let publicFiles: any[] = $state([]);         // fully loaded + filtered list (for currentLocation)
  let currentLocation   = $state('');          // "folder/subfolder" path string

  type FileRec = {
    id: string;
    name: string;
    location: string;
    status: string | null;
    type: 'file' | 'folder';
    size: number;
    createdAt: string | null;
  };

  // selection / dialogs
  let selectedIds: string[] = $state([]);
  let allSelected           = $state(false);
  let confirmOpen           = $state(false);
  let confirmBulkOpen       = $state(false);
  let fileToDelete: FileRec | null = $state(null);

  // clipboard-like operations
  let copiedFileId: string | null  = $state(null);
  let copiedFileName: string | null= $state(null);
  let moveFileId: string | null    = $state(null);
  let moveFileName: string | null  = $state(null);

  // view mode (grid / table)
  let isGridView = $state(false);
  let rotate     = $state(false);

  // ---------- helpers ----------
  function debounce<T extends (...a: any[]) => void>(fn: T, delay = 400) {
    let t: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  // ---------- initialisation ----------
  onMount(() => {
    // restore view pref
    isGridView = localStorage.getItem('file_view_mode') === 'grid';

    // load files if already authorised
    if (accessGranted) loadFiles();

    // keyboard shortcuts (paste / move)
    const handleKeys = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const cmd = mac ? e.metaKey : e.ctrlKey;
      const k   = e.key.toLowerCase();
      if (cmd && k === 'v' && copiedFileId) { e.preventDefault(); pasteFile(); }
      if (cmd && k === 'm' && moveFileId)   { e.preventDefault(); confirmMoveFile(); }
    };
    window.addEventListener('keydown', handleKeys);
    onDestroy(() => window.removeEventListener('keydown', handleKeys));
  });

  $effect(() => { localStorage.setItem('file_view_mode', isGridView ? 'grid' : 'table'); });

  // ---------- auth (public password) ----------
  async function requestAccess() {
    const res = await fetch('/public/access', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, password })
    });
    if (res.ok) {
      location.reload();           // server sets cookies; reload to re-run load() & hydrate
    } else {
      toast.error('Invalid credentials');
    }
  }

  // ---------- file loading & filtering ----------
  function loadFiles() {
    if (!data?.files) return;
    publicFiles = data.files.filter((f: any) => f.location === currentLocation);
  }

  // fetch fresh list from server (keeps same filtering)
  async function refreshFiles() {
    rotate = true;
    const res  = await fetch('/api/files?visibility=public');
    const json = await res.json();
    data.files = json.files;
    loadFiles();
    setTimeout(() => rotate = false, 500);
  }

  // ---------- navigation ----------
  function openFolder(file: FileRec) {
    currentLocation = currentLocation ? `${currentLocation}/${file.name}` : file.name;
    loadFiles();
  }
  function navigateUp() {
    if (!currentLocation) return;
    const parts = currentLocation.split('/').filter(Boolean); parts.pop();
    currentLocation = parts.join('/');
    loadFiles();
  }
  function openFilePreview(file: FileRec) {
    goto(`/dashboard/public-files/${file.id}`);
  }

  // ---------- selection helpers ----------
  function toggleSelectAll() {
    const ids = publicFiles.map(f => f.id);
    if (allSelected) { selectedIds = []; } else { selectedIds = ids; }
    allSelected = !allSelected;
  }
  function toggleSelect(id: string) {
    selectedIds = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
    allSelected = publicFiles.length > 0 && publicFiles.every(f => selectedIds.includes(f.id));
  }

  // ---------- CRUD actions (copy / move / delete / download) ----------
  function copyFile(file: FileRec) {
    if (file.type !== 'file') return toast.error('Only files can be copied');
    copiedFileId = file.id; copiedFileName = file.name;
    toast.success(`Copied ${file.name}. Navigate & paste (⌘/Ctrl+V).`);
  }

  async function pasteFile() {
    if (!copiedFileId) return toast.error('Nothing copied');
    const res = await fetch('/api/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'copy', fileId: copiedFileId, newLocation: currentLocation, name: copiedFileName, visibility: 'public' })
    });
    if (res.ok) { toast.success('Pasted'); refreshFiles(); copiedFileId = null; }
    else        { toast.error('Paste failed'); }
  }

  function moveFile(file: FileRec) {
    if (file.type !== 'file') return toast.error('Only files can be moved');
    moveFileId = file.id; moveFileName = file.name;
    toast.success('Navigate & move (⌘/Ctrl+M)');
  }
  async function confirmMoveFile() {
    if (!moveFileId) return toast.error('No file selected');
    const res = await fetch('/api/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', fileId: moveFileId, newLocation: currentLocation, newName: moveFileName, visibility: 'public' })
    });
    if (res.ok) { toast.success('Moved'); refreshFiles(); moveFileId = null; }
    else        { toast.error('Move failed'); }
  }

  function askDelete(file: FileRec) { fileToDelete = file; confirmOpen = true; }
  function askBulkDelete() {
    if (selectedIds.length === 0) return toast.error('No files selected');
    confirmBulkOpen = true;
  }
  async function confirmDelete() {
    if (!fileToDelete) return;
    await fetch('/api/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', fileId: fileToDelete.id })
    });
    publicFiles = publicFiles.filter(f => f.id !== fileToDelete!.id);
    toast.success(`Deleted ${fileToDelete.name}`);
    confirmOpen = false; fileToDelete = null;
  }
  async function confirmBulkDelete() {
    await fetch('/api/files', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk-delete', fileIds: selectedIds })
    });
    publicFiles = publicFiles.filter(f => !selectedIds.includes(f.id));
    toast.success(`Deleted ${selectedIds.length} files`);
    selectedIds = []; allSelected = false; confirmBulkOpen = false;
  }

  async function downloadFile(id: string) {
    const res   = await fetch(`api/public/download?fileId=${id}`);
    if (!res.ok) {
      toast.error('Download failed');
      return;
    }
    const { url } = await res.json();
    window.open(url, '_blank');
  }

  // ---------- search ----------
  const debouncedSearch = debounce(async (q: string) => {
    if (!q.trim()) return refreshFiles();
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&visibility=public`);
    const d = await r.json();
    publicFiles = [
      ...d.folders.map((f: any) => ({ ...f, status:'uploaded', type:'folder' })),
      ...d.files  .map((f: any) => ({ ...f, status:'uploaded', type:'file'   }))
    ];
  });
</script>

<Header session={
  data.session
    ? {
        ...data.session,
        user: data.session.user
          ? {
              ...data.session.user,
              name: data.session.user.name ?? undefined,
              image: data.session.user.image ?? undefined,
              email: data.session.user.email ?? undefined
            }
          : undefined
      }
    : data.session
}/>

{#if !accessGranted}
  <!-- ---------- PUBLIC FILE ACCESS GATE ---------- -->
  <div class="max-w-md mx-auto mt-28 p-8 bg-white shadow-xl border border-zinc-200 rounded-xl space-y-6 text-center">
    <!-- Heading -->
    <div class="space-y-2">
      <h2 class="text-2xl font-bold text-zinc-900">Access Public Files</h2>
      <p class="text-zinc-600 text-sm leading-relaxed">
        These files are shared by a team using Trelae. To view or download them, please enter the team ID and access password provided to you.
      </p>
    </div>

    <!-- Input fields -->
    <div class="space-y-4 text-left">
      <label for="team-id" class="block text-sm font-medium text-zinc-700">Team ID</label>
      <input
        class="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
        id="team-id"
        placeholder="Enter Team ID"
        bind:value={teamId}
      />

      <label for="access-password" class="block text-sm font-medium text-zinc-700">Access Password</label>
      <input
        type="password"
        id="access-password"
        class="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="Enter Password"
        bind:value={password}
      />
    </div>

    <!-- Submit button -->
    <Button
      class="w-full py-2 text-sm font-medium shadow-sm hover:shadow transition"
      onclick={requestAccess}
    >
      Unlock Files
    </Button>
  </div>
{:else}
  <!-- ---------- FILE MANAGER ---------- -->
  <div class="max-w-6xl mx-auto px-6 py-12 space-y-12">
    <section class="rounded-xl border border-zinc-200 bg-white shadow-sm h-[calc(100vh-12rem)] overflow-y-auto relative">
      <!-- toolbar -->
      <div class="flex items-center justify-between gap-3 sticky top-0 bg-zinc-50 p-6 z-10">
        <div class="flex items-center gap-2">
          {#if currentLocation}
            <Button size="icon" variant="ghost" onclick={navigateUp}><ArrowLeft class="size-4"/></Button>
          {/if}
          <h3 class="text-lg font-semibold text-zinc-900 flex items-center gap-1">
            Public Files
            {#if currentLocation}
              <span class="flex items-center gap-1 text-sm text-zinc-500">
                {#each currentLocation.split('/') as part}
                  <span>/ {part}</span>
                {/each}
              </span>
            {/if}
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <input class="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                 placeholder="Search…" oninput={(e)=>debouncedSearch((e.target as HTMLInputElement).value)}/>
          {#if canEdit}
            <CreateFolder {currentLocation} visibility="public" onReflectFolder={refreshFiles}/>
            <UploadFile   {currentLocation} visibility="public" onReflectUpload={refreshFiles}/>
          {/if}
          <div class="flex gap-1 border rounded-md overflow-hidden">
            <button class="p-2.5 { !isGridView ? 'bg-zinc-900 text-white':'bg-zinc-100'}" onclick={()=>isGridView=false}><Table class="size-3.5"/></button>
            <button class="p-2.5 {  isGridView ? 'bg-zinc-900 text-white':'bg-zinc-100'}" onclick={()=>isGridView=true}><LayoutGrid class="size-3.5"/></button>
          </div>
          {#if canEdit && copiedFileId}<Button variant="outline" onclick={pasteFile}>Paste here</Button>{/if}
          {#if canEdit && moveFileId}
            <Button variant="outline" onclick={confirmMoveFile}
                    disabled={publicFiles.find(f=>f.id===moveFileId)?.location===currentLocation}>
              Move here
            </Button>
          {/if}
          <Button variant="outline" onclick={refreshFiles}><RefreshCw class="size-4 {rotate?'animate-spin':''}"/></Button>
        </div>
      </div>

      <!-- ---------- VIEW ---------- -->
      {#if !isGridView}
        <!-- TABLE VIEW -->
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="border-b">
              <tr>
                <th class="w-10 px-4 py-2">
                  {#if canEdit}<input type="checkbox" class="size-4" checked={allSelected} onchange={toggleSelectAll}/>{/if}
                </th>
                <th class="w-52 px-4 py-2 text-left relative">
                  {#if canEdit && selectedIds.length}
                    <Button size="sm" variant="secondary" class="absolute top-1 h-6 text-xs w-32"
                            onclick={askBulkDelete}>Delete selected ({selectedIds.length})</Button>
                  {:else} Name {/if}
                </th>
                <th class="px-4 py-2 text-left font-medium">Location</th>
                <th class="px-4 py-2 text-left font-medium">Type</th>
                <th class="px-4 py-2 text-left font-medium">Size</th>
                <th class="px-4 py-2 text-left font-medium">Status</th>
                <th class="px-4 py-2 text-left font-medium">Created</th>
                <th class="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {#if publicFiles.length}
                {#each publicFiles as file}
                  <tr class="border-b hover:bg-zinc-50 cursor-pointer {file.type==='folder'?'bg-zinc-50':''}"
                      onclick={()=>file.type==='folder'?openFolder(file):openFilePreview(file)}>
                    <td class="w-10 px-4 py-3">
                      {#if canEdit}
                        <input type="checkbox" class="size-4" checked={selectedIds.includes(file.id)} onclick={(e)=>{e.stopPropagation();toggleSelect(file.id)}}/>
                      {/if}
                    </td>
                    <td class="px-4 py-3 flex items-center gap-2 truncate">
                      {#if file.type === 'folder'}
                        <FolderIcon class="size-4" />
                      {:else}
                        <FileIcon class="size-4" />
                      {/if}
                      {file.name}
                    </td>
                    <td class="px-4 py-3 text-zinc-600">{file.location?`/${file.location}`:'/'}</td>
                    <td class="px-4 py-3 text-zinc-600">{file.type}</td>
                    <td class="px-4 py-3 text-zinc-600">{file.type==='folder'?'-':`${(Number(file.size)/1024).toFixed(2)} KB`}</td>
                    <td class="px-4 py-3">
                      <span class="inline-block rounded px-2 py-0.5 text-xs {file.status==='pending'?'bg-yellow-100 text-yellow-800':file.status==='uploaded'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}">
                        {file.status}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-zinc-600">{file.createdAt?new Date(file.createdAt).toLocaleDateString():'-'}</td>
                    <td class="px-4 py-3 text-right flex gap-2 justify-end">
                      <Button size="icon" variant="ghost" class="size-6" onclick={(e)=>{e.stopPropagation();downloadFile(file.id);}}><Download class="size-4"/></Button>
                      {#if canEdit && file.type==='file'}
                        <Button size="icon" variant="ghost" class="size-6" onclick={(e)=>{e.stopPropagation();copyFile(file);}}><Copy class="size-3.5"/></Button>
                        <Button size="icon" variant="ghost" class="size-6" onclick={(e)=>{e.stopPropagation();moveFile(file);}}><Move class="size-3.5"/></Button>
                      {/if}
                      {#if canEdit}
                        <Button size="icon" variant="ghost" class="size-6" onclick={(e)=>{e.stopPropagation();askDelete(file);}}><Trash class="size-3.5"/></Button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr><td colspan="8" class="py-6 text-center text-zinc-500">
                  {canEdit?'Empty! Upload or create a folder.':'No public files.'}
                </td></tr>
              {/if}
            </tbody>
          </table>
        </div>
      {:else}
        <!-- GRID VIEW -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 pt-8 relative">
          {#if publicFiles.length}
            {#each publicFiles as file}
              <div class="border p-4 rounded-lg shadow-sm bg-white relative {selectedIds.includes(file.id)?'ring-2 ring-blue-500':''}" onclick={()=>file.type==='folder'?openFolder(file):openFilePreview(file)} role="presentation">
                {#if file.type === 'folder'}
                  <FolderIcon class="size-20" />
                {:else}
                  <FileIcon class="size-20" />
                {/if}
                <span class="font-medium truncate mt-2 block">{file.name}</span>
                <div class="text-xs text-zinc-500 flex justify-between">
                  {file.location?`/${file.location}`:'root'}<span>{file.type==='folder'?'':`${(Number(file.size)/1024).toFixed(2)} KB`}</span>
                </div>
                <div class="absolute top-2 right-2">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger class="rounded p-1 text-zinc-500 hover:bg-zinc-200"><MoreVertical class="size-4"/></DropdownMenu.Trigger>
                    <DropdownMenu.Content class="min-w-28 rounded-md border bg-white p-1 shadow-lg" align="end">
                      <DropdownMenu.Item onclick={()=>downloadFile(file.id)} class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-zinc-100"><Download size="14"/>Download</DropdownMenu.Item>
                      {#if canEdit && file.type==='file'}
                        <DropdownMenu.Item onclick={()=>copyFile(file)} class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-zinc-100"><Copy size="14"/>Copy</DropdownMenu.Item>
                        <DropdownMenu.Item onclick={()=>moveFile(file)} class="flex items-center gap-2 px-2 py-1 text-sm hover:bg-zinc-100"><Move size="14"/>Move</DropdownMenu.Item>
                      {/if}
                      {#if canEdit}
                        <DropdownMenu.Item onclick={()=>askDelete(file)} class="flex items-center gap-2 px-2 py-1 text-sm text-red-600 hover:bg-red-600/10"><Trash size="14"/>Delete</DropdownMenu.Item>
                      {/if}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>
              </div>
            {/each}
            {#if canEdit && selectedIds.length}
              <div class="absolute -top-2 right-4">
                <Button size="sm" variant="secondary" onclick={askBulkDelete}>Delete Selected ({selectedIds.length})</Button>
              </div>
            {/if}
          {:else}
            <p class="col-span-full text-center text-zinc-500">
              {canEdit?'Empty! Upload or create a folder here.':'No public files.'}
            </p>
          {/if}
        </div>
      {/if}
    </section>

    <!-- dialogs -->
    <ConfirmDeleteDialog bind:open={confirmOpen}  title="Delete Item?"      descriptionHTML={`Delete <strong>${fileToDelete?.name}</strong>?`} confirmLabel="Delete" onConfirm={confirmDelete}/>
    <ConfirmDeleteDialog bind:open={confirmBulkOpen} title="Delete Selected?" descriptionHTML={`Delete <strong>${selectedIds.length}</strong> items?`} confirmLabel="Delete" onConfirm={confirmBulkDelete}/>
  </div>
{/if}