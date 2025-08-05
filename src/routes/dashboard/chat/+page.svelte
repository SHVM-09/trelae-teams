<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';
  import ConfirmDeleteDialog from '../confirmDeleteDialog.svelte';
  import type { PageProps } from './$types';
  import { Trash, Reply, Link2, MessageSquare } from 'lucide-svelte';
  import { env } from "$env/dynamic/public";

  let { data }: PageProps = $props();

  const room = data.channel;
  const currentUserId = data.session?.user?.id;
  const isAdmin = data.members?.some((m: any) => m.id === currentUserId && m.role === 'admin') ?? false;

  let socket: ReturnType<typeof io>;
  let input = $state('');
  let messages = $state([...data.messages]);

  let clearing = $state(false);
  let confirmOpen = $state(false);

  let textareaEl: HTMLTextAreaElement | null = null;
  let emojiPanelEl = $state<HTMLDivElement | null>(null);
  let emojiBtnEl = $state<HTMLButtonElement | null>(null);
  let emojiOpen = $state(false);

  // ---- Reply state ----
  type ReplyRef = { key: string; user: string; snippet: string; createdAt?: string };
  let replyingTo = $state<ReplyRef | null>(null);

  const EMOJI = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
    '😉','😊','😇','😍','😘','😗','😚','😙','😋','😛',
    '😜','🤪','🤗','🤩','🤔','🤨','😐','😑','😶','🙄',
    '😏','😴','🤤','😪','😮','😲','😳','🥹','😎','🤝',
    '👍','👎','👏','🙏','🔥','💯','✨','🎉','✅','❌',
    '🤓','🥳','🫡','😬','🫶','🧠'
  ];

  onMount(() => {
    socket = io(env.PUBLIC_SOCKET_URL, {
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => socket.emit('join', room));

    socket.on('message', (msg) => {
      messages = [...messages, msg];
      // Only autoscroll if we're already near the bottom
      if (isNearBottom()) scrollToBottom();
    });

    socket.on('chat:cleared', () => messages = []);

    const onDocClick = (e: MouseEvent) => {
      if (!emojiOpen) return;
      const t = e.target as Node;
      if (emojiPanelEl && !emojiPanelEl.contains(t) && emojiBtnEl && !emojiBtnEl.contains(t)) {
        emojiOpen = false;
      }
    };
    document.addEventListener('mousedown', onDocClick);

    // Scroll to bottom on load
    scrollToBottom();

    return () => document.removeEventListener('mousedown', onDocClick);
  });

  onDestroy(() => {
    try { socket?.disconnect(); } catch {}
  });

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    // Prefix soft reply header (no backend change needed)
    let payloadText = text;
    if (replyingTo) {
      const ts = replyingTo.createdAt ? new Date(replyingTo.createdAt).toLocaleTimeString() : '';
      const header = `↩︎ ${replyingTo.user}${ts ? ` • ${ts}` : ''}: ${replyingTo.snippet}`;
      payloadText = `${header}\n\n${text}`;
    }

    const r = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: payloadText })
    });

    if (!r.ok) {
      console.error('Failed to send message', await r.text());
      return;
    }

    input = '';
    replyingTo = null;
    textareaEl?.focus();
  }

  async function confirmRemove() {
    clearing = true;
    try {
      const r = await fetch('/api/chat/clear', { method: 'POST' });
      if (!r.ok) throw new Error(await r.text());
      messages = [];
    } catch (e) {
      console.error('Failed to clear chat', e);
    } finally {
      clearing = false;
      confirmOpen = false;
    }
  }

  function isSelf(msg: any) {
    return msg.userId && currentUserId && msg.userId === currentUserId;
  }

  function msgKey(msg: any) {
    const base =
      msg.id ??
      (msg.userId && msg.createdAt ? `${msg.userId}-${msg.createdAt}` : `${msg.user ?? 'u'}-${msg.createdAt ?? Math.random()}`);
    return String(base).replaceAll(/[^a-zA-Z0-9_-]/g, '-');
  }

  function startReply(msg: any) {
    const key = msgKey(msg);
    const snippet = String(msg.message ?? '').slice(0, 140);
    replyingTo = { key, user: msg.user ?? 'Unknown', snippet, createdAt: msg.createdAt };
    // optional: peek original
    flashAndScrollToMessage(key);
    // focus composer
    textareaEl?.focus();
  }

  function jumpToOriginal() {
    if (!replyingTo) return;
    flashAndScrollToMessage(replyingTo.key);
  }

  function scrollToBottom() {
    const box = document.querySelector('.chat-box') as HTMLElement | null;
    if (box) setTimeout(() => box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }), 10);
  }

  function isNearBottom(threshold = 64) {
    const box = document.querySelector('.chat-box') as HTMLElement | null;
    if (!box) return true;
    const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
    return dist < threshold;
    }

  function flashAndScrollToMessage(key: string) {
    const el = document.getElementById(`msg-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-indigo-300', 'ring-offset-2');
    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-300', 'ring-offset-2'), 1400);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function addEmoji(ch: string) {
    if (!textareaEl) {
      input += ch;
      return;
    }
    const el = textareaEl;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    input = input.slice(0, start) + ch + input.slice(end);
    queueMicrotask(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + ch.length;
    });
  }

  /* ---------- reply-parsing helpers (ui only) ---------- */
  function parseReply(text: string) {
    // first line = header, rest = body
    const [rawHeader, ...rest] = text.split('\n\n');
    // strip the leading arrow + space
    const header = rawHeader.replace(/^↩︎\s*/, '');
    return { header, body: rest.join('\n\n') || text };
  }
  function hasReply(text: string) {
    return text.startsWith('↩︎ ');
  }
</script>

<!-- Confirm Clear -->
<ConfirmDeleteDialog
  bind:open={confirmOpen}
  title="Clear Chat?"
  descriptionHTML={`Are you sure you want to <strong>clear all messages</strong>? This cannot be undone.`}
  confirmLabel="Clear"
  destructive={true}
  onConfirm={confirmRemove}
/>

<section class="max-w-5xl mx-auto px-6 py-12 relative">

  <!-- ▸ page heading -->
  <header class="space-y-2 mb-6 relative">
    <h1 class="text-2xl font-extrabold tracking-tight text-indigo-500 flex items-center gap-2">
      <MessageSquare class="inline-block align-middle" /> Team Chat
    </h1>
    <p class="text-xs text-zinc-600">
      This is your team's persistent chat space — scoped to your current workspace and accessible by all members.
      Messages are saved permanently and only <strong>admins</strong> can clear the entire chat history.
    </p>
  </header>

  <div class="mb-4 flex items-center justify-end">
    <div class="flex items-center gap-2 text-xs text-zinc-500">
      <span class="size-2 rounded-full bg-green-500 inline-block"></span>
      <span>Connected</span>
    </div>
  </div>

  <!-- Messages -->
  <div class="chat-box h-[65vh] overflow-y-auto rounded-2xl border border-zinc-200 shadow-md p-4 md:p-6 space-y-4 bg-indigo-200/50">
    {#each messages as msg (msg.id ?? msg.createdAt ?? Math.random())}
      {#key msg}
        <div class={`group flex ${isSelf(msg) ? 'justify-end' : 'justify-start'}`}>
          <div
            id={"msg-" + msgKey(msg)}
            class={`relative inline-flex flex-col gap-1 rounded-2xl px-4 py-3 text-sm break-words min-w-[7rem] max-w-[80%]
              ${isSelf(msg) ? 'bg-indigo-500 text-white rounded-br-sm shadow-md' : 'bg-zinc-100 text-zinc-800 rounded-bl-sm shadow'}`}>

            <!-- Hover actions -->
            <div class={`absolute -top-3 ${isSelf(msg) ? 'right-1' : 'left-1'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition`}>
              <button
                class="h-6 w-6 flex items-center justify-center rounded-full bg-white/80 border hover:bg-white shadow {isSelf(msg) ? '!bg-indigo-500 border-indigo-500' : 'text-zinc-500'}"
                title="Reply"
                onclick={() => startReply(msg)}>
                <Reply size={14} />
              </button>
              <button
                class="h-6 w-6 flex items-center justify-center rounded-full bg-white/80 border hover:bg-white shadow {isSelf(msg) ? '!bg-indigo-500 border-indigo-500' : 'text-zinc-500'}"
                title="Jump to message"
                onclick={() => flashAndScrollToMessage(msgKey(msg))}>
                <Link2 size={14} />
              </button>
            </div>

            <div class="font-medium text-[11px] opacity-80 select-none">
              {isSelf(msg) ? 'you' : (msg.user ?? 'Unknown')}
            </div>

            {#if hasReply(msg.message)}
              {@const parsed = parseReply(msg.message)}
              <div class={`mb-2 inline-flex max-w-full items-start gap-1 rounded-xl p-2 text-[12px] italic
                          ${isSelf(msg) ? 'bg-zinc-50 text-zinc-500' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'}`}>
                <span class="shrink-0 text-black text-sm pr-2">↩︎</span>
                <span class="truncate">{parsed.header}</span>
              </div>
              <div class="whitespace-pre-wrap leading-relaxed">{parsed.body}</div>
            {:else}
              <div class="whitespace-pre-wrap leading-relaxed">{msg.message}</div>
            {/if}

            {#if msg.createdAt}
              <div class={`mt-0.5 text-[10px] ${isSelf(msg) ? 'text-indigo-100/80' : 'text-zinc-500/80'}`}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            {/if}
          </div>
        </div>
      {/key}
    {/each}
  </div>

  <!-- Composer -->
  <form class="mt-6 flex flex-col gap-2" onsubmit={(e) => { e.preventDefault(); sendMessage(); }}>
    {#if replyingTo}
      <div class="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-xs text-zinc-700 shadow">
        <div class="flex min-w-0 items-center gap-2">
          <span class="inline-block rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[11px]">Replying to</span>
          <span class="font-medium truncate">{replyingTo.user}</span>
          <span class="text-zinc-400">•</span>
          <span class="truncate italic text-zinc-500 max-w-[40ch]">“{replyingTo.snippet}”</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="text-indigo-500 hover:underline" onclick={jumpToOriginal}>Jump</button>
          <button type="button" class="text-zinc-500 hover:underline" onclick={() => replyingTo = null}>Cancel</button>
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <!-- Emoji -->
      <div class="relative">
        <button
          bind:this={emojiBtnEl}
          type="button"
          class="h-12 w-12 rounded-full border bg-white shadow-sm text-xl flex items-center justify-center hover:bg-zinc-50 transition"
          aria-haspopup="true"
          aria-expanded={emojiOpen}
          onclick={() => emojiOpen = !emojiOpen}
          title="Insert emoji">
          😊
        </button>

        {#if emojiOpen}
          <div
            bind:this={emojiPanelEl}
            class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 rounded-xl border bg-white shadow-lg p-2 pr-4 z-20">
            <div class="grid grid-cols-8 gap-1.5 text-xl leading-none">
              {#each EMOJI as e}
                <button
                  type="button"
                  class="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-zinc-100"
                  onclick={() => addEmoji(e)}
                  title={e}>
                  {e}
                </button>
              {/each}
            </div>
            <div class="pt-2 text-[11px] text-zinc-500 text-center">Click to insert • click outside to close</div>
          </div>
        {/if}
      </div>

      <!-- Textarea -->
      <div class="flex-1">
        <div class="h-12 flex items-center rounded-full border bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-200">
          <textarea
            bind:this={textareaEl}
            bind:value={input}
            rows="1"
            class="w-full resize-none text-sm outline-none placeholder:text-zinc-400 bg-transparent"
            placeholder="Type a message…"
            onkeydown={onKeyDown}></textarea>
        </div>
      </div>

      {#if isAdmin}
        <button
          type="button"
          class="h-12 w-12 rounded-full border bg-white shadow-sm text-xl flex items-center justify-center hover:bg-zinc-50 text-red-600 transition"
          onclick={() => confirmOpen = true}
          title="Clear chat">
          <Trash size={16} />
        </button>
      {/if}

      <button
        type="submit"
        class="h-12 px-5 shrink-0 rounded-full bg-indigo-500 text-white text-sm font-medium shadow hover:bg-indigo-700 transition">
        Send
      </button>
    </div>
  </form>
</section>

<style>
  .chat-box::-webkit-scrollbar { width: 10px; }
  .chat-box::-webkit-scrollbar-track { background: transparent; }
  .chat-box::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.12);
    border-radius: 9999px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
</style>