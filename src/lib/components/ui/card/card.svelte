<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  className?: string;
  children?: import('svelte').Snippet;
}

let { className = '', children }: Props = $props();

let classes = $derived(
  cn(
    'rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm',
    className
  )
);
</script>

<div class={classes}>
  {@render children?.()}
</div>