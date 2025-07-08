<script lang="ts">
  import { signOut } from "@auth/sveltekit/client";
  import { Button } from "$lib/components/ui/button";
  import {
    LogOut,
    Users,
    Folder,
    ShieldCheck,
    Link,
    UploadCloud,
    CreditCard
  } from "lucide-svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const user = data.session?.user;
</script>

<div class="max-w-6xl mx-auto px-6 py-12 space-y-12">
  <!-- Welcome -->
  <section class="rounded-xl bg-gradient-to-br from-white to-zinc-50 p-8 border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-4">
      <img
        src={user?.image ?? "https://placehold.co/600x400"}
        alt="Avatar"
        class="size-28 rounded-lg border object-cover"
      />
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
    <a href="/files" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group">
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
    <a href="/public" class="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 hover:shadow-md transition group">
      <div class="flex items-center justify-between mb-4">
        <Link class="w-6 h-6 text-amber-600 group-hover:scale-110 transition" />
        <span class="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Public</span>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 mb-1">Public Files</h3>
      <p class="text-sm text-zinc-600">Browse files shared publicly by your team.</p>
    </a>

    <!-- Upload CTA (always visible) -->
    <a href="/files/upload" class="flex flex-col justify-between rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 hover:bg-zinc-100 transition group md:col-span-2">
      <div class="flex items-center justify-between mb-4">
        <UploadCloud class="w-6 h-6 text-zinc-500 group-hover:text-zinc-700 transition" />
        <span class="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full">Quick</span>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 mb-1">Upload New File</h3>
      <p class="text-sm text-zinc-600">Add new files to your workspace instantly.</p>
    </a>
  </section>
</div>