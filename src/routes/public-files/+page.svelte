<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { DropdownMenu } from 'bits-ui';
  import Header from '$lib/custom-components/Header.svelte';
  import ConfirmDeleteDialog from '../dashboard/confirmDeleteDialog.svelte';
  import CreateFolder from '../dashboard/createFolder.svelte';
  import UploadFile from '../dashboard/uploadFile.svelte';
  import { Trash, Folder as FolderIcon, File as FileIcon, ArrowLeft, Copy, Move, LayoutGrid, Table, MoreVertical, Download, RefreshCw, ExternalLink, Globe } from 'lucide-svelte';

  const { data } = $props();
  const canEdit  = data.canEdit ?? false;

  // password-gate vars
  let password = $state('');
  let teamId   = $state('');
  let accessGranted: boolean = data.accessGranted;

  // file-manager vars
  let publicFiles: any[] = $state([]);
  let currentLocation   = $state('');

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

  function debounce<T extends (...a: any[]) => void>(fn: T, delay = 400) {
    let t: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  let showTip = $state(true);

  function dismissTip() {
    showTip = false;
    localStorage.setItem('public_tip_hide', '1');
  }

  onMount(() => {
    // restore view pref
    isGridView = localStorage.getItem('file_view_mode') === 'grid';
    if (localStorage.getItem('public_tip_hide') === '1') showTip = false;

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

  function loadFiles() {
    if (!data?.files) return;
    publicFiles = data.files.filter((f: any) => f.location === currentLocation);
  }

  async function refreshFiles() {
    rotate = true;
    const res  = await fetch('/api/files?visibility=public');
    const json = await res.json();
    data.files = json.files;
    loadFiles();
    setTimeout(() => rotate = false, 500);
  }

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

  function toggleSelectAll() {
    if (!canEdit) return; 
    const ids = publicFiles.map(f => f.id);
    if (allSelected) { selectedIds = []; } else { selectedIds = ids; }
    allSelected = !allSelected;
  }

  function toggleSelect(id: string) {
    if (!canEdit) return; 
    selectedIds = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
    allSelected = publicFiles.length > 0 && publicFiles.every(f => selectedIds.includes(f.id));
  }

  	function handleGridClick(f:FileRec){
      // single-click selects / deselects
      if (canEdit) toggleSelect(f.id);
    }
    function openFileOrFolder(f:FileRec){
      // double-click (or explicit icon) opens
      if (f.type === 'folder') {
        openFolder(f);
      }
    }

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

<svelte:head>
  <title>Public Files</title>
  <meta name="description" content="Browse and access public files shared by teams." />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

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

<div class="relative min-h-screen bg-white overflow-x-hidden">
	<!-- Grid lines -->
	<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f2f2f2_1px,transparent_1px),linear-gradient(to_bottom,#f2f2f2_1px,transparent_1px)] pointer-events-none z-0 opacity-50"></div>

	<!-- Radial gradient background -->
	<div class="absolute top-[2%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,_rgba(220,100,245,0.4),_transparent_70%)] z-0"></div>

  	<!-- ▸ page heading -->
    <header class="space-y-2 relative max-w-5xl mx-auto py-12 px-6">
      <h1 class="text-2xl font-extrabold tracking-tight text-orange-500 flex items-center gap-2">
      <Globe class="inline-block align-middle" /> Public Files
      </h1>
      <p class="text-xs text-zinc-600">
        This is public file storage for teams. You can view, download, and share files here to collaborate with others. Non Team members can access these files if they have the Team ID and access password.
      </p>
    </header>

  {#if !accessGranted}
    <div
      class="max-w-xl mx-auto mt-8 p-8 rounded-2xl border border-zinc-200 shadow-xl backdrop-blur bg-white/80 z-10 relative overflow-hidden"
    >
      <div
        class="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300 opacity-30 blur-2xl"
        aria-hidden="true"
      ></div>

      <div class="relative space-y-3 text-center">
        <h2 class="text-3xl font-bold tracking-tight text-zinc-900">
          Access Files
        </h2>
        <p class="text-xs leading-relaxed text-zinc-600 text-pretty">
          These files are shared by a team.
          To view or download them, please enter the Team ID and access password provided to you.
          Ask the team owner for these details if you don't have them.
        </p>
      </div>

      <div class="mt-6 space-y-5 relative z-10">
        <div class="space-y-2">
          <label for="team-id" class="block text-sm font-medium text-zinc-700">
            Team ID
          </label>
          <input
            id="team-id"
            placeholder="Enter Team ID"
            bind:value={teamId}
            class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div class="space-y-2">
            <label for="access-password" class="block text-sm font-medium text-zinc-700">
              Access Password
            </label>
            <input
              type="password"
              id="access-password"
              placeholder="Enter Password"
              bind:value={password}
              class="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition"
            />
        </div>
      </div>
      <div class="mt-10 flex items-center justify-center">
        <Button
          class="w-xs py-3 h-10 text-sm rounded-lg font-medium shadow-sm hover:shadow transition"
          onclick={requestAccess}
          aria-label="Unlock Files"
        >
          Unlock Files
        </Button>
      </div>
    </div>
  {:else}
    <div class="relative z-10 max-w-5xl mx-auto px-6 pb-4 space-y-12">
      <section class="rounded-xl border border-zinc-200 bg-white shadow-sm h-[calc(100vh-24rem)] overflow-y-auto relative">
        <div class="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur border-b border-zinc-200">
          <div
            class="flex {canEdit ? 'flex-col' : 'flex-row justify-between'} gap-4 md:flex-row md:items-center md:justify-between
                  px-4 md:px-6 py-4"
          >
            <!-- ▸ breadcrumb / back button -->
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              {#if currentLocation}
                <Button size="icon" variant="ghost" onclick={navigateUp} aria-label="Go back">
                  <ArrowLeft class="size-4" />
                </Button>
              {/if}

              <h2
                class="text-base sm:text-lg font-semibold text-zinc-900 flex items-center gap-1 truncate"
              >
                Public Files
                {#if currentLocation}
                  <span
                    class="flex items-center gap-1 text-xs sm:text-sm text-zinc-500 break-all"
                  >
                    {#each currentLocation.split('/') as part}
                      <span>/&nbsp;{part}</span>
                    {/each}
                  </span>
                {/if}
              </h2>
            </div>

            <!-- ▸ actions -->
            <div
              class="flex flex-wrap items-center gap-3 sm:gap-2 justify-end"
            >
            
            {#if canEdit}
                <!-- search grows on small screens -->
                <label for="file-search" class="sr-only">Search files</label>
                <input
                  id="file-search"
                  class="flex-1 min-w-[9rem] md:min-w-[12rem] lg:min-w-[15rem]
                        rounded-md border px-3 py-2 text-sm
                        focus:ring-2 focus:ring-blue-500"
                  placeholder="Search…"
                  oninput={(e) =>
                    debouncedSearch((e.target as HTMLInputElement).value)}
                />
                <CreateFolder
                  {currentLocation}
                  visibility="public"
                  onReflectFolder={refreshFiles}
                />
                <UploadFile
                  {currentLocation}
                  visibility="public"
                  onReflectUpload={refreshFiles}
                />
              {/if}

              <!-- view-mode toggles -->
              <div
                class="flex shrink-0 overflow-hidden rounded-md border"
              >
                <button
                  class="p-2.5 transition
                        { !isGridView
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100'}"
                  onclick={() => (isGridView = false)}
                  aria-label="Switch to table view"
                >
                  <Table class="size-3.5" />
                </button>
                <button
                  class="p-2.5 transition
                        { isGridView
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100'}"
                  onclick={() => (isGridView = true)}
                  aria-label="Switch to grid view"
                >
                  <LayoutGrid class="size-3.5" />
                </button>
              </div>

              {#if canEdit && copiedFileId}
                <Button variant="outline" onclick={pasteFile} class="shrink-0" aria-label="Paste file">
                  Paste&nbsp;here
                </Button>
              {/if}

              {#if canEdit && moveFileId}
                <Button
                  variant="outline"
                  onclick={confirmMoveFile}
                  disabled={
                    publicFiles.find((f) => f.id === moveFileId)?.location ===
                    currentLocation
                  }
                  aria-label="Move file"
                  class="shrink-0"
                >
                  Move&nbsp;here
                </Button>
                <Button
                  variant="outline"
                  onclick={refreshFiles}
                  class="shrink-0"
                  aria-label="Refresh files"
                 >
                    <RefreshCw
                      class="size-4 {rotate ? 'animate-spin' : ''}"
                    />
                </Button>
              {/if}
            </div>
          </div>
        </div>

        {#if !isGridView}
          <div class="overflow-x-auto h-[84%] mt-2">
            <table class="min-w-full text-sm">
              <thead class="border-b">
                <tr>
                  <th class="w-10 px-4 py-2">
                    {#if canEdit}
                    <label for="select-all" class="sr-only">Select all files</label>
                    <input id="select-all" type="checkbox" class="size-4" checked={allSelected} onchange={toggleSelectAll}/>{/if}
                  </th>
                  <th class="w-52 px-4 py-2 text-left relative font-medium">
                    {#if canEdit && selectedIds.length}
                      <Button size="sm" variant="secondary" class="absolute top-1 h-6 text-xs w-32"
                              onclick={askBulkDelete} aria-label="Delete selected files">
                              Delete selected ({selectedIds.length})
                      </Button>
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
                        onclick={()=>{if(file.type==='folder') openFolder(file)}}>
                      <td class="w-10 px-4 py-3">
                        {#if canEdit}
                          <label for="file-{file.id}" class="sr-only">Select file {file.name}</label>
                          <input id="file-{file.id}" type="checkbox" class="size-4" checked={selectedIds.includes(file.id)} onclick={(e)=>{e.stopPropagation();toggleSelect(file.id)}}/>
                        {/if}
                      </td>
                      <td class="px-4 py-3 flex items-center gap-2">
                        {#if file.type === 'folder'}
                          <FolderIcon class="size-4" />
                        {:else}
                          <FileIcon class="size-4" />
                        {/if}
                        <span class="max-w-40 truncate">{file.name}</span>
                      </td>
                      <td class="px-4 py-3 text-zinc-600">{file.location?`/${file.location}`:'/'}</td>
                      <td class="px-4 py-3 text-zinc-600">{file.type}</td>
                      <td class="px-4 py-3 text-zinc-600 text-nowrap">{file.type==='folder'?'-':`${(Number(file.size)/1024).toFixed(2)} KB`}</td>
                      <td class="px-4 py-3">
                        <span class="inline-block rounded px-2 py-0.5 text-xs {file.status==='pending'?'bg-yellow-100 text-yellow-800':file.status==='uploaded'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}">
                          {file.status}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-zinc-600 text-nowrap">
                        {file.createdAt
                          ? new Date(file.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td class="px-4 py-3 text-right flex gap-2 justify-end">
                        {#if canEdit && file.type==='file'}
                          <Button size="icon" variant="ghost" class="size-6" aria-label="Download file" onclick={(e)=>{e.stopPropagation();downloadFile(file.id);}}><Download class="size-4"/></Button>
                          <Button size="icon" variant="ghost" class="size-6" aria-label="Copy file" onclick={(e)=>{e.stopPropagation();copyFile(file);}}><Copy class="size-3.5"/></Button>
                          <Button size="icon" variant="ghost" class="size-6" aria-label="Move file" onclick={(e)=>{e.stopPropagation();moveFile(file);}}><Move class="size-3.5"/></Button>
                        {/if}
                        {#if canEdit}
                          <Button size="icon" variant="ghost" class="size-6" aria-label="Delete file" onclick={(e)=>{e.stopPropagation();askDelete(file);}}><Trash class="size-3.5"/></Button>
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
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 {canEdit ? 'pt-14' : 'pt-4'} relative">
            {#if publicFiles.length}
              {#each publicFiles as file (file.id)}
                <!-- single card -->
                <div
                  class="group relative flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow transition
                        hover:shadow-lg hover:border-zinc-300 min-h-44
                        {selectedIds.includes(file.id) ? 'ring-2 ring-blue-500 !bg-blue-50/60' : ''}"
                  onclick={() => handleGridClick(file)}
                  role="presentation"
                >
                  <!-- colourful icon tile -->
                  <div
                    class="mx-auto flex size-20 items-center justify-center rounded-xl
                                text-white shadow-inner shadow-black/10
                                {file.type === 'folder'
                                  ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500'
                                  : 'bg-gradient-to-br from-fuchsia-400 via-pink-500 to-rose-500'}"
                  >
                    {#if file.type === 'folder'}
                      <FolderIcon class="size-8" stroke-width="1.6" />
                    {:else}
                      <FileIcon class="size-8" stroke-width="1.6" />
                    {/if}
                  </div>

                  <!-- name + meta -->
                  <div class="space-y-0.5 text-center">
                    <p class="truncate text-sm font-medium text-zinc-900">{file.name}</p>
                    <p class="flex justify-center text-xs text-zinc-500 text-center">
                      <span class="truncate">{file.location ? '/' + file.location : 'root'}</span>
                      <!-- <span class="pl-1">{file.type === 'folder' ? '' : `${(Number(file.size) / 1024).toFixed(2)} KB`}</span> -->
                    </p>
                  </div>

                  <!-- 3-dot menu -->
                  <div class="absolute top-2 right-2">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger class="rounded-md p-1 hover:bg-zinc-200">
                        <MoreVertical class="size-4 text-zinc-600" />
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Content
                        class="min-w-32 rounded-md border border-zinc-200 bg-white p-1 shadow-lg text-xs z-20"
                        align="end"
                      >
                        {#if file.type === 'file'}
                          <DropdownMenu.Item onclick={(e) => {e.stopPropagation(); downloadFile(file.id)}}  class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100"><Download size="14" />Download</DropdownMenu.Item>
                          {#if canEdit}
                            <DropdownMenu.Item onclick={(e) => {e.stopPropagation(); copyFile(file)}}       class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100"><Copy size="14" />Copy</DropdownMenu.Item>
                            <DropdownMenu.Item onclick={(e) => {e.stopPropagation(); moveFile(file)}}       class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100"><Move size="14" />Move</DropdownMenu.Item>
                          {/if}
                        {:else}
                          <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); openFileOrFolder(file); }} class="flex items-center gap-2 rounded px-2 py-1 hover:bg-zinc-100">
                            <ExternalLink class="size-4" />Open
                          </DropdownMenu.Item>
                        {/if}
                        {#if canEdit}
                          <DropdownMenu.Item onclick={(e) => {e.stopPropagation(); askDelete(file)}} class="flex items-center gap-2 rounded px-2 py-1 text-red-600 hover:bg-red-600/10"><Trash size="14" />Delete</DropdownMenu.Item>
                        {/if}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>
                </div>
              {/each}

              <!-- bulk-delete floating chip -->
              {#if canEdit && selectedIds.length}
                <div class="absolute top-2 right-4">
                  <Button size="sm" variant="secondary" aria-label="Delete selected files" onclick={askBulkDelete}>Delete&nbsp;Selected&nbsp;({selectedIds.length})</Button>
                </div>
              {/if}
            {:else}
              <p class="col-span-full py-10 text-center text-zinc-500">No public files.</p>
            {/if}
          </div>
        {/if}
      </section>

      <ConfirmDeleteDialog bind:open={confirmOpen}  title="Delete Item?"      descriptionHTML={`Delete <strong>${fileToDelete?.name}</strong>?`} confirmLabel="Delete" onConfirm={confirmDelete}/>
      <ConfirmDeleteDialog bind:open={confirmBulkOpen} title="Delete Selected?" descriptionHTML={`Delete <strong>${selectedIds.length}</strong> items?`} confirmLabel="Delete" onConfirm={confirmBulkDelete}/>
    </div>

    {#if showTip}
      <div
        class="relative flex items-start gap-2 px-6 py-3 bg-blue-50
              text-blue-700 text-xs font-light border border-blue-200/60
              mx-6 lg:mx-auto max-w-4xl z-10 rounded-lg"
      >
        <p class="leading-snug pr-8">
          Click the <code class="font-mono bg-blue-200/50 p-1 rounded">⋮</code> menu on each item to open folders or download file.  
          Use the view toggle to switch between list and grid views.
        </p>

        <!-- dismiss button -->
        <button
          class="absolute right-3 top-3 text-zinc-500 hover:text-zinc-700
                rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          onclick={dismissTip}
          aria-label="Hide tip"
        >
          ✕
        </button>
      </div>
    {/if}
  {/if}

  	<!-- ─── Footer ─── -->
    <footer class="relative z-10 py-6 text-center text-xs text-zinc-500 bg-white/10 mt-24">
      © {new Date().getFullYear()} Teams. Your Files. Perfected.
    </footer>

</div>