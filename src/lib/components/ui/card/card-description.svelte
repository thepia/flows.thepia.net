<script lang="ts">
import { cn } from '../../../utils';

export let className: string = '';

$: classes = cn('text-sm text-gray-500 dark:text-gray-400', className);
</script>

<p class={classes}>
  <slot />
</p>