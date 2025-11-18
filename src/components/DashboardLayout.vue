<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background"
      >
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
                <BreadcrumbItem>
                  <BreadcrumbPage v-if="index === breadcrumbs.length - 1" class="font-semibold text-primary">
                    {{ crumb.name }}
                  </BreadcrumbPage>
                  <BreadcrumbLink v-else :href="crumb.path">
                    {{ crumb.name }}
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
              </template>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main class="flex flex-1 flex-col gap-4 p-4 overflow-auto bg-indigo-400">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useBreadcrumbs } from '@/composables/useBreadcrumbs';
import AppSidebar from '@/components/AppSidebar.vue';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb/';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const { breadcrumbs } = useBreadcrumbs();
</script>
