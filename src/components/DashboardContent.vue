<template>
  <div
    class="bg-muted w-full rounded-xl overflow-hidden"
    :class="[
      'group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-[calc(100vh-32px-3rem)]',
      'h-[calc(100vh-32px-4rem)]',
    ]"
  >
    <slot />
  </div>
</template>
