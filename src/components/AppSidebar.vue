<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'

import {
  BookOpen,
  Bot,
  Settings2,
  SquareTerminal,
} from "lucide-vue-next"
import NavMain from '@/components/NavMain.vue'
import NavUser from '@/components/NavUser.vue'
import NavHeader from '@/components/NavHeader.vue'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useUserStore } from '@/stores'
import { storeToRefs } from 'pinia'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: "icon",
})

const userStore = useUserStore()
const { user } = storeToRefs(userStore)


const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        // {
        //   title: "Statistics",
        //   url: "/stats",
        // },
      ],
    },
    {
      title: "Tracking",
      url: "/",
      icon: Bot,
      items: [
        {
          title: "Timer",
          url: "/timer",
        },
        // {
        //   title: "Manual Entry",
        //   url: "/manual-entry",
        // },
        // {
        //   title: "History",
        //   url: "/history",
        // },
      ],
    },
    // {
    //   title: "Activities",
    //   url: "/",
    //   icon: BookOpen,
    //   items: [
    //     {
    //       title: "Tags & Labels",
    //       url: "/tags-and-labels",
    //     },
    //   ],
    // },
    // {
    //   title: "Settings",
    //   url: "/",
    //   icon: Settings2,
    //   items: [
    //     {
    //       title: "General",
    //       url: "/settings",
    //     },
    //   ],
    // },
  ]
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <NavHeader  />
    </SidebarHeader>
    <SidebarContent>
      <NavMain :items="data.navMain" />
    </SidebarContent>
    <SidebarFooter v-if="user">
      <NavUser :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
