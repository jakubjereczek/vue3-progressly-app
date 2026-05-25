<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

withDefaults(
  defineProps<{
    text: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    maxWidth?: string;
  }>(),
  { side: 'top', maxWidth: '200px' },
);
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="inline-flex items-center text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none"
          tabindex="-1"
        >
          <HelpCircle class="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        :side="side"
        hide-arrow
        class="text-xs leading-relaxed text-center"
        :style="{ maxWidth }"
      >
        {{ text }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
