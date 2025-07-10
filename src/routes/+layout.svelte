<script lang="ts">
    import { page } from "$app/state";
    import { Toaster } from 'svelte-sonner';
    let { children } = $props();
    import "../app.css";
</script>
<Toaster />
{@render children()}
