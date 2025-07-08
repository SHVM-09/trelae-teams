<script lang="ts">
    import { Button } from "$lib/components/ui/button";
</script>

<header
    class="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
>
    <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900"><a href="/">Trelae-teams</a></h1>
        <nav class="space-x-4">
            <a
                href="/"
                class="text-sm font-medium text-gray-700 hover:text-black"
                >Home</a
            >
            <a
                href="#features"
                class="text-sm font-medium text-gray-700 hover:text-black"
                >Features</a
            >
            <a
                href="#about"
                class="text-sm font-medium text-gray-700 hover:text-black"
                >About</a
            >
            <Button>
                <a href="/login">Login</a>
            </Button>
        </nav>
    </div>
</header>
