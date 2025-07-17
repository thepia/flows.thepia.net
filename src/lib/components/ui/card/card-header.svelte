<script lang="ts">
import { cn } from '../../../utils';

export let className: string = '';

$: classes = cn('flex flex-col space-y-1.5 p-6', className);
</script>

<div class={classes}>
  <slot />
</div>