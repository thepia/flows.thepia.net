<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  className?: string;
  children?: import('svelte').Snippet;
}

let { className = '', children }: Props = $props();

let classes = $derived(cn('text-2xl font-semibold leading-none tracking-tight', className));
</script>

<h3 class={classes}>
  {@render children?.()}
</h3>