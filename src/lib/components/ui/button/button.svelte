<script lang="ts">
import { cn } from '../../../utils';

export let variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' = 'default';
export let size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
export let className: string = '';
export let disabled: boolean = false;
export let href: string | undefined = undefined;

$: classes = cn(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    'default': 'bg-primary text-primary-foreground hover:bg-primary/90',
    'destructive': 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    'outline': 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    'secondary': 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    'ghost': 'hover:bg-accent hover:text-accent-foreground',
    'link': 'text-primary underline-offset-4 hover:underline'
  }[variant],
  {
    'default': 'h-10 px-4 py-2',
    'sm': 'h-9 rounded-md px-3',
    'lg': 'h-11 rounded-md px-8',
    'icon': 'h-10 w-10'
  }[size],
  className
);
</script>

{#if href}
  <a {href} class={classes} {disabled}>
    <slot />
  </a>
{:else}
  <button class={classes} {disabled} on:click>
    <slot />
  </button>
{/if}

<style>
  :global(:root) {
    --primary: 224 71% 4%;
    --primary-foreground: 210 20% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 84% 4.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 84% 4.9%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 20% 98%;
    --background: 0 0% 100%;
    --ring: 222 84% 4.9%;
    --input: 214 32% 91%;
  }
  
  :global(.dark) {
    --primary: 210 20% 98%;
    --primary-foreground: 222 84% 4.9%;
    --secondary: 222 84% 4.9%;
    --secondary-foreground: 210 20% 98%;
    --accent: 222 84% 4.9%;
    --accent-foreground: 210 20% 98%;
    --destructive: 0 62% 30%;
    --destructive-foreground: 210 20% 98%;
    --background: 222 84% 4.9%;
    --ring: 212 12% 84%;
    --input: 217 19% 35%;
  }
  
  button, a {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  button:hover, a:hover {
    background-color: hsl(var(--primary) / 0.9);
  }
  
  .outline {
    background-color: hsl(var(--background));
    border: 1px solid hsl(var(--input));
  }
  
  .outline:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .ghost {
    background-color: transparent;
    color: inherit;
  }
  
  .ghost:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
  
  .secondary {
    background-color: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
  }
  
  .secondary:hover {
    background-color: hsl(var(--secondary) / 0.8);
  }
</style>