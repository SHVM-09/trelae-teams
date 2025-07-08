<script lang="ts">
  import { signOut } from "@auth/sveltekit/client";
  import { Button } from "$lib/components/ui/button";
  import { LogOut } from "lucide-svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const user = data.session?.user;
</script>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Welcome Card -->
  <div class="rounded-2xl border shadow-sm p-6 bg-white flex items-center gap-6">
    <img
      src={user?.image ?? "/placeholder-avatar.png"}
      alt="User Avatar"
      class="w-16 h-16 rounded-full border object-cover"
    />

    <div class="flex-1">
      <h2 class="text-xl font-semibold text-gray-900">
        Welcome back, {user?.name ?? "User"} 👋
      </h2>
      <p class="text-gray-600">{user?.email}</p>
    </div>

    <Button variant="outline" size="sm" onclick={signOut} class="gap-2 flex items-center">
      <LogOut class="w-4 h-4" />
      Sign Out
    </Button>
  </div>

  <!-- Dashboard Actions -->
  <div class="grid md:grid-cols-2 gap-6">
    <div class="rounded-xl border p-5 bg-white hover:shadow transition cursor-pointer">
      <h3 class="text-lg font-medium text-gray-900">Create Course</h3>
      <p class="text-sm text-gray-600 mt-1">Start building your next course</p>
    </div>

    <div class="rounded-xl border p-5 bg-white hover:shadow transition cursor-pointer">
      <h3 class="text-lg font-medium text-gray-900">View All Videos</h3>
      <p class="text-sm text-gray-600 mt-1">Browse and manage your uploaded videos</p>
    </div>
  </div>
</div>
