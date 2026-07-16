<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  className?: string;
  children?: import('svelte').Snippet;
}

let { className = '', children }: Props = $props();

let classes = $derived(cn('flex flex-col space-y-1.5 p-6', className));
</script>

<div class={classes}>
  {@render children?.()}
</div>