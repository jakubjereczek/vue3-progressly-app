<script setup lang="ts">
import { Crown, Check, X, Zap, Shield, Sparkles, BarChart3, FileDown } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/composables';

const { t } = useTranslation();

const standardFeatures = [
  { key: 'feature_categories_5', included: true },
  { key: 'feature_daily_3', included: true },
  { key: 'feature_all_views', included: true },
  { key: 'feature_stats', included: true },
  { key: 'feature_unlimited_categories', included: false },
  { key: 'feature_unlimited_daily', included: false },
  { key: 'feature_analytics', included: false },
  { key: 'feature_export', included: false },
  { key: 'feature_priority_support', included: false },
];

const premiumFeatures = [
  { key: 'feature_unlimited_categories', included: true },
  { key: 'feature_unlimited_daily', included: true },
  { key: 'feature_all_views', included: true },
  { key: 'feature_stats', included: true },
  { key: 'feature_analytics', included: true },
  { key: 'feature_export', included: true },
  { key: 'feature_priority_support', included: true },
  { key: 'feature_early_access', included: true },
];

const highlights = [
  {
    icon: Infinity,
    key: 'highlight_unlimited',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    key: 'highlight_analytics',
    color: 'text-chart-3',
    bg: 'bg-chart-3/10',
  },
  {
    icon: FileDown,
    key: 'highlight_export',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Shield,
    key: 'highlight_support',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
];
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-4xl mx-auto flex flex-col gap-8 pb-8">
      <div class="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 text-sm">
        <Zap class="w-4 h-4 text-warning flex-shrink-0" />
        <p class="text-foreground">{{ t('app.module.upgrade.coming_soon_notice') }}</p>
      </div>

      <Card
        class="relative overflow-hidden rounded-2xl border border-border/40 p-10 flex flex-col items-center text-center gap-4"
      >
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"
        />
        <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div class="relative flex flex-col items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Crown class="w-7 h-7 text-primary" />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-center gap-2">
              <h1 class="text-2xl font-bold">{{ t('app.module.upgrade.hero.title') }}</h1>
              <Badge class="gap-1 text-xs">
                <Sparkles class="w-3 h-3" />
                {{ t('app.module.upgrade.hero.badge') }}
              </Badge>
            </div>
            <p class="text-muted-foreground text-sm max-w-md">
              {{ t('app.module.upgrade.hero.subtitle') }}
            </p>
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card class="rounded-2xl border border-border/40 p-6 flex flex-col gap-6">
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="text-base font-semibold">{{ t('app.module.upgrade.plan.standard.name') }}</span>
              <Badge variant="secondary" class="text-xs">{{ t('app.module.upgrade.plan.current') }}</Badge>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-bold">{{ t('app.module.upgrade.plan.standard.price') }}</span>
            </div>
            <p class="text-xs text-muted-foreground">{{ t('app.module.upgrade.plan.standard.desc') }}</p>
          </div>

          <Separator />

          <ul class="flex flex-col gap-2.5">
            <li
              v-for="f in standardFeatures"
              :key="f.key"
              class="flex items-center gap-2.5 text-sm"
              :class="f.included ? 'text-foreground' : 'text-muted-foreground/50'"
            >
              <span
                class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                :class="f.included ? 'bg-success/15' : 'bg-muted'"
              >
                <Check v-if="f.included" class="w-2.5 h-2.5 text-success" />
                <X v-else class="w-2.5 h-2.5 text-muted-foreground/40" />
              </span>
              {{ t(`app.module.upgrade.features.${f.key}`) }}
            </li>
          </ul>

          <Button variant="outline" disabled class="w-full mt-auto">
            {{ t('app.module.upgrade.plan.standard.cta') }}
          </Button>
        </Card>

        <Card
          class="relative rounded-2xl border border-primary/30 bg-primary/[0.03] p-6 flex flex-col gap-6 overflow-hidden"
        >
          <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

          <div class="relative flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Crown class="w-4 h-4 text-primary" />
                <span class="text-base font-semibold">{{ t('app.module.upgrade.plan.premium.name') }}</span>
              </div>
              <Badge class="text-xs gap-1">
                <Zap class="w-3 h-3" />
                {{ t('app.module.upgrade.plan.recommended') }}
              </Badge>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-bold">{{ t('app.module.upgrade.plan.premium.price') }}</span>
              <span class="text-sm text-muted-foreground">{{ t('app.module.upgrade.plan.per_month') }}</span>
            </div>
            <p class="text-xs text-muted-foreground">{{ t('app.module.upgrade.plan.premium.desc') }}</p>
          </div>

          <Separator class="border-primary/20" />

          <ul class="relative flex flex-col gap-2.5">
            <li v-for="f in premiumFeatures" :key="f.key" class="flex items-center gap-2.5 text-sm text-foreground">
              <span class="flex-shrink-0 w-4 h-4 rounded-full bg-success/15 flex items-center justify-center">
                <Check class="w-2.5 h-2.5 text-success" />
              </span>
              {{ t(`app.module.upgrade.features.${f.key}`) }}
            </li>
          </ul>

          <Button class="relative w-full mt-auto gap-2" disabled>
            <Crown class="w-4 h-4" />
            {{ t('app.module.upgrade.plan.premium.cta') }}
            <Badge variant="secondary" class="ml-auto text-xs">
              {{ t('app.module.upgrade.coming_soon') }}
            </Badge>
          </Button>
        </Card>
      </div>

      <div class="flex flex-col gap-4">
        <div class="text-center">
          <h2 class="text-lg font-semibold">{{ t('app.module.upgrade.highlights.title') }}</h2>
          <p class="text-sm text-muted-foreground mt-0.5">{{ t('app.module.upgrade.highlights.subtitle') }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            v-for="h in highlights"
            :key="h.key"
            class="rounded-xl border border-border/40 p-4 flex items-start gap-4"
          >
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', h.bg]">
              <component :is="h.icon" :class="['w-5 h-5', h.color]" />
            </div>
            <div class="flex flex-col gap-0.5">
              <p class="text-sm font-semibold">{{ t(`app.module.upgrade.highlights.${h.key}.title`) }}</p>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ t(`app.module.upgrade.highlights.${h.key}.desc`) }}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card
        class="relative rounded-2xl border border-primary/20 bg-primary/5 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div class="relative flex flex-col gap-1.5 text-center sm:text-left">
          <p class="text-base font-semibold">{{ t('app.module.upgrade.cta.title') }}</p>
          <p class="text-sm text-muted-foreground">{{ t('app.module.upgrade.cta.subtitle') }}</p>
        </div>
        <Button class="relative gap-2 flex-shrink-0" disabled>
          <Crown class="w-4 h-4" />
          {{ t('app.module.upgrade.cta.button') }}
          <Badge variant="secondary" class="ml-1 text-xs">
            {{ t('app.module.upgrade.coming_soon') }}
          </Badge>
        </Button>
      </Card>
    </div>
  </div>
</template>
