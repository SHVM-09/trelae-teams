<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { Button } from "$lib/components/ui/button";
	import { LayoutDashboard, Folder, Users, MessageSquare, Globe, LogOut } from "lucide-svelte";
	import { signOut } from "@auth/sveltekit/client";
	import {
		Avatar,
		AvatarImage,
		AvatarFallback
	} from "$lib/components/ui/avatar";
	import type { LayoutProps } from "./$types";
	import { page } from "$app/state";

	let { data, children }: LayoutProps = $props();
	const user = data.session?.user;
</script>

<Sidebar.Provider>
	<Sidebar.Root class="w-64 min-h-screen border-r border-zinc-200 bg-white flex flex-col justify-between">

		<!-- Brand -->
		<div class="px-6 py-4 flex items-center justify-between border-b border-zinc-200">
			<a href="/dashboard" class="flex items-center gap-1">
				<h1 class="text-2xl font-bold tracking-tight text-zinc-900">
					Trelae<span class="text-zinc-600">Teams</span>
				</h1>
			</a>
		</div>

		<!-- User -->
		<div class="flex flex-col justify-between flex-1 px-4 py-6">
			<div class="flex items-center gap-3 mb-6">
				<Avatar class="shrink-0 rounded">
					<AvatarImage src={user?.image ?? "https://placehold.co/600x400"} alt={user?.name ?? "User"} />
					<AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
				</Avatar>
				<div class="truncate">
					<p class="text-sm font-semibold text-zinc-800 truncate">{user?.name}</p>
					<p class="text-xs text-zinc-500 truncate">{user?.email}</p>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex flex-col gap-1">

				<!-- Dashboard: user details + add to team -->
				<a
					href="/dashboard"
					class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
					class:bg-zinc-100={page.url.pathname === "/dashboard"}
				>
					<LayoutDashboard size={16} /> Dashboard
				</a>

				<!-- Personal Files: only user sees their files -->
				<a
					href="/dashboard/my-files"
					class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
					class:bg-zinc-100={page.url.pathname.startsWith("/my-files")}
				>
					<Folder size={16} /> My Files
				</a>
				{#if user?.teamId}
					<!-- Teams: channels + chat -->
					<a
						href="/dashboard/team"
						class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
						class:bg-zinc-100={page.url.pathname.startsWith("/team")}
					>
						<Users size={16} /> Team
					</a>

					<!-- Team Files: shared -->
					<a
						href="/dashboard/team-files"
						class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
						class:bg-zinc-100={page.url.pathname.startsWith("/team-files")}
					>
						<Folder size={16} /> Team Files
					</a>

					<!-- Direct Chat -->
					<a
						href="/dashboard/chat"
						class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
						class:bg-zinc-100={page.url.pathname.startsWith("/chat")}
					>
						<MessageSquare size={16} /> Chat
					</a>

					<!-- Public Files -->
					<a
						href="/dashboard/public-files"
						class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition hover:bg-zinc-100"
						class:bg-zinc-100={page.url.pathname.startsWith("/public")}
					>
						<Globe size={16} /> Public Files
					</a>
				{/if}

			</nav>
		</div>

		<!-- Footer -->
		<div class="px-4 py-4 border-t border-zinc-200">
			<Button
				size="sm"
				class="w-full flex items-center justify-center gap-2 border text-red-600 bg-red-50 border-red-600 hover:text-red-700 hover:bg-red-100 transition"
				onclick={signOut}
			>
				<LogOut class="w-4 h-4" /> Sign Out
			</Button>
		</div>

	</Sidebar.Root>

	<!-- Sidebar Toggle -->
	<Sidebar.Trigger />

	<main class="flex-1 overflow-auto pl-2 p-4">
		{@render children?.()}
	</main>
</Sidebar.Provider>