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
	<Sidebar.Root class="w-64 min-h-screen border-r border-zinc-200 flex flex-col justify-between">

		<!-- Brand -->
		<div class="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-white">
			<a href="/dashboard" class="select-none text-2xl font-extrabold tracking-tight
			                           bg-gradient-to-br from-pink-500 via-purple-500 to-fuchsia-500
			                           bg-clip-text text-transparent">
				Teams
			</a>
		</div>

		<!-- USER BOX + LINKS -->
		<div class="flex-1 flex flex-col justify-between px-4 py-6 space-y-6 overflow-y-auto bg-white">
			<!-- user -->
			<div class="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
				<Avatar class="size-10 rounded-md ring-1 ring-zinc-200 shrink-0">
					<AvatarImage
						src={user?.image ?? 'https://placehold.co/128'}
						alt={user?.name ?? 'User'}
						class="object-cover"
					/>
					<AvatarFallback>{user?.name?.[0] ?? 'U'}</AvatarFallback>
				</Avatar>

				<div class="truncate">
					<p
						class="truncate text-sm font-semibold text-zinc-700"
					>
						{user?.name}
					</p>
					<p class="truncate text-xs text-zinc-500">{user?.email}</p>
				</div>
			</div>

			<!-- Navigation -->
			<nav class="flex flex-col gap-3">
			<!-- Dashboard -->
			<a
				href="/dashboard"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
				page.url.pathname === "/dashboard"
					? "border-fuchsia-500"
					: "border-transparent hover:border-fuchsia-500"
				}`}
			>
				<LayoutDashboard class="size-4 text-zinc-500 group-hover:text-fuchsia-500 transition" />
				Dashboard
			</a>

			<!-- My Files -->
			<a
				href="/dashboard/my-files"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
				page.url.pathname.startsWith("/dashboard/my-files")
					? "border-green-500"
					: "border-transparent hover:border-green-500"
				}`}
			>
				<Folder class="size-4 text-zinc-500 group-hover:text-green-500 transition" />
				My Files
			</a>

			{#if user?.teamId}
				<!-- Team -->
				<a
				href="/dashboard/team"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
					page.url.pathname.startsWith("/dashboard/team")
					? "border-blue-500"
					: "border-transparent hover:border-blue-500"
				}`}
				>
				<Users class="size-4 text-zinc-500 group-hover:text-blue-500 transition" />
				Team
				</a>

				<!-- Team Files -->
				<a
				href="/dashboard/team-files"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
					page.url.pathname.startsWith("/dashboard/team-files")
					? "border-purple-500"
					: "border-transparent hover:border-purple-500"
				}`}
				>
				<Folder class="size-4 text-zinc-500 group-hover:text-purple-500 transition" />
				Team Files
				</a>

				<!-- Chat -->
				<a
				href="/dashboard/chat"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
					page.url.pathname.startsWith("/dashboard/chat")
					? "border-indigo-500"
					: "border-transparent hover:border-indigo-500"
				}`}
				>
				<MessageSquare class="size-4 text-zinc-500 group-hover:text-indigo-500 transition" />
				Chat
				</a>

				<!-- Public Files -->
				<a
				href="/public-files"
				class={`group relative flex items-center gap-3 rounded-lg px-4 py-3 border-l-4 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:shadow-md transition-all ${
					page.url.pathname.startsWith("/public-files")
					? "border-orange-500"
					: "border-transparent hover:border-orange-500"
				}`}
				>
				<Globe class="size-4 text-zinc-500 group-hover:text-orange-500 transition" />
				Public Files
				</a>
			{/if}
			</nav>
		</div>

		<!-- Footer -->
		<div class="px-4 py-4 border-t border-zinc-200 bg-white">
				<div
					class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 p-[1px]"
				>
					<Button
						onclick={() => signOut()}
						class="rounded-full w-full bg-white px-4 py-1 text-sm font-medium hover:bg-zinc-50 transition-colors"
					>
						<span class="bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
							Log out
						</span>
					</Button>
				</div>
		</div>

	</Sidebar.Root>

	<!-- Sidebar Toggle -->
	<Sidebar.Trigger />
	<!-- ▸ MAIN CONTENT -->
	<main
		class="relative min-h-screen bg-white overflow-x-hidden w-full"
	>
		<!-- Grid lines -->
		<div class="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,#f2f2f2_1px,transparent_1px),linear-gradient(to_bottom,#f2f2f2_1px,transparent_1px)] pointer-events-none z-0 opacity-50"></div>

		<!-- Radial gradient background -->
		<div class="absolute top-[2%] left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse_at_center,_rgba(220,100,245,0.4),_transparent_70%)] z-0"></div>

		{@render children?.()}
	</main>
</Sidebar.Provider>