<script lang="ts">
import { cn } from '../../../utils';

interface Props {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

let { orientation = 'horizontal', className = '' }: Props = $props();

let classes = $derived(
  cn(
    'shrink-0 bg-border',
    orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
    className
  )
);
</script>

<div class={classes} role="separator" aria-orientation={orientation}></div>

<style>
  :global(:root) {
    --border: 214 32% 91%;
  }
  
  :global(.dark) {
    --border: 217 19% 35%;
  }
  
  div {
    background-color: hsl(var(--border));
  }
</style>