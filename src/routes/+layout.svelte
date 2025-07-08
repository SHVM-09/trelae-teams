<script lang="ts">
    import { page } from "$app/state";
    // import Header from "$lib/custom-components/Header.svelte";
    let { children } = $props();
    import "../app.css";
</script>

{@render children()}
