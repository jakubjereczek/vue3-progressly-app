import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteRecordNormalized } from 'vue-router';

export interface Breadcrumb {
  name: string;
  path: string;
}

export function useBreadcrumbs() {
  const route = useRoute();

  const breadcrumbs = computed<Breadcrumb[]>(() => {
    return route.matched
      .filter((r: RouteRecordNormalized) => r.meta && r.meta.breadcrumb)
      .map((r: RouteRecordNormalized) => ({
        name: r.meta.breadcrumb as string,
        path: r.path,
      }));
  });

  return {
    breadcrumbs,
  };
}
