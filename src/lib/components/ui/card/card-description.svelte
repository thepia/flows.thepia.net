<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  className?: string;
  children?: import('svelte').Snippet;
}

let { className = '', children }: Props = $props();

let classes = $derived(cn('text-sm text-gray-500 dark:text-gray-400', className));
</script>

<p class={classes}>
  {@render children?.()}
</p>