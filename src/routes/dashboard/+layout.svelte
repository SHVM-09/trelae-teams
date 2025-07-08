<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { Button } from "$lib/components/ui/button";
    import { BookOpenText, Cog, LayoutDashboard, ListVideo, LogOut, Menu } from "lucide-svelte";
    import { signOut } from "@auth/sveltekit/client";
    import {
        Avatar,
        AvatarImage,
        AvatarFallback,
    } from "$lib/components/ui/avatar";
    import type { LayoutProps } from "./$types";
    import { page } from "$app/state";

    let { data, children }: LayoutProps = $props();
    const user = data.session?.user;
</script>

<Sidebar.Provider>
    <Sidebar.Root>
        <Sidebar.Header>
            <h1 class="text-xl font-bold tracking-tight">Trelae-teams</h1>
        </Sidebar.Header>
        <Sidebar.Content class="flex flex-col justify-between h-full">
            <div class="space-y-4">
                <Sidebar.Group>
                    <div class="flex items-center gap-3 px-2">
                        <Avatar>
                            <AvatarImage
                                src={user?.image ?? ""}
                                alt={user?.name ?? "User"}
                            />
                            <AvatarFallback
                                >{user?.name?.[0] ?? "U"}</AvatarFallback
                            >
                        </Avatar>
                        <div>
                            <p class="text-sm font-medium truncate max-w-[180px]">{user?.name}</p>
                            <p class="text-xs text-muted-foreground truncate max-w-[180px]">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </Sidebar.Group>

                <Sidebar.Group>
                    <a
                        href="/dashboard"
                        class="flex px-4 py-2 text-sm rounded-md transition-colors items-center gap-2"
                        class:bg-gray-100={page.url.pathname === "/dashboard"}
                    >
                        <LayoutDashboard size={16}/>
                        Dashboard
                    </a>
                    <a
                        href="/dashboard/courses"
                        class="flex px-4 py-2 text-sm rounded-md transition-colors items-center gap-2"
                        class:bg-gray-100={page.url.pathname.startsWith(
                            "/dashboard/courses",
                        )}
                    >
                        <BookOpenText size={16}/>
                        Courses
                    </a>
                    <a
                        href="/dashboard/videos"
                        class="flex px-4 py-2 text-sm rounded-md transition-colors items-center gap-2"
                        class:bg-gray-100={page.url.pathname.startsWith(
                            "/dashboard/videos",
                        )}
                    >
                        <ListVideo size={16}/>
                        Videos
                    </a>
                    <a
                        href="/dashboard/settings"
                        class="flex px-4 py-2 text-sm rounded-md transition-colors items-center gap-2"
                        class:bg-gray-100={page.url.pathname.startsWith(
                            "/dashboard/settings",
                        )}
                    >
                        <Cog size={16}/>
                        Settings
                    </a>
                </Sidebar.Group>
            </div>
        </Sidebar.Content>

        <Sidebar.Footer class="p-4 border-t">
            <Button
                variant="outline"
                size="sm"
                class="w-full gap-2 justify-center"
                onclick={signOut}
            >
                <LogOut class="w-4 h-4" />
                Sign Out
            </Button>
        </Sidebar.Footer>
    </Sidebar.Root>

    <Sidebar.Trigger />

    <main class="flex-1 overflow-auto pl-2 pr-4 py-10">
        {@render children?.()}
    </main>
</Sidebar.Provider>
