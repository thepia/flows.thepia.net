<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  className?: string;
  children?: import('svelte').Snippet;
}

let { className = '', children }: Props = $props();

let classes = $derived(cn('p-6 pt-0', className));
</script>

<div class={classes}>
  {@render children?.()}
</div>