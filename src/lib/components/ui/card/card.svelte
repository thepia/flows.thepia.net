<script lang="ts">
import { cn } from '../../../utils';

export let className: string = '';

$: classes = cn(
  'rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm',
  className
);
</script>

<div class={classes}>
  <slot />
</div>