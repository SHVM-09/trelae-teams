<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import type { PageProps } from "./$types";
    let { data }: PageProps = $props();
</script>

<!-- Hero Section -->
<section class="max-w-7xl mx-auto px-6 py-24 text-center">
    <h2
        class="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 mb-6"
    >
        Visual Learning, Reinvented
    </h2>
    <p class="text-lg text-gray-600 mb-8">
        Vistora helps instructors share rich video tutorials with interactive
        modules and track progress effortlessly.
    </p>
    {#if !data.session}
        <Button class="text-md px-6 py-4" onclick={() => goto("/login")}>
            Get Started
        </Button>
    {:else}
        <p class="text-md text-gray-600 mb-4">
            Welcome back, {data.session.user?.name}!
        </p>
        <Button class="text-md px-6 py-4" onclick={() => goto("/dashboard")}>
            Go to Dashboard
        </Button>
    {/if}
</section>

<!-- Features -->
<section
    id="features"
    class="max-w-7xl mx-auto px-6 py-20 grid gap-12 md:grid-cols-3 text-center"
>
    <div>
        <h3 class="text-xl font-semibold mb-2">Multi-Resolution Streaming</h3>
        <p class="text-gray-600">
            Fast CloudFront video delivery with quality selector.
        </p>
    </div>
    <div>
        <h3 class="text-xl font-semibold mb-2">Role-Based Access</h3>
        <p class="text-gray-600">
            Admins, instructors, and viewers get exactly what they need.
        </p>
    </div>
    <div>
        <h3 class="text-xl font-semibold mb-2">Progress Tracking</h3>
        <p class="text-gray-600">
            Track watch history and completion for every user.
        </p>
    </div>
</section>

<!-- About -->
<section id="about" class="bg-gray-100 py-20">
    <div class="max-w-4xl mx-auto text-center px-6">
        <h3 class="text-3xl font-bold mb-4">Built for modern educators</h3>
        <p class="text-gray-700">
            Whether you’re teaching a course or sharing internal training
            content, Vistora helps you deliver engaging video experiences with
            powerful tools like role management, progress tracking, and secure
            content delivery.
        </p>
    </div>
</section>

<!-- Footer -->
<footer class="bg-white border-t py-6 mt-12 text-center text-sm text-gray-500">
    © {new Date().getFullYear()} Vistora. All rights reserved.
</footer>
