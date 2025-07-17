<script lang="ts">
import { cn } from '../../../utils';

export let className: string = '';

$: classes = cn('p-6 pt-0', className);
</script>

<div class={classes}>
  <slot />
</div>