<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <div
      class="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 relative overflow-hidden"
    >
      <div class="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary-foreground/[0.04]" />
      <div class="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-primary-foreground/[0.06]" />
      <div class="absolute -bottom-24 right-12 w-96 h-96 rounded-full bg-primary-foreground/[0.04]" />

      <div class="flex items-center gap-3 relative z-10">
        <div
          class="w-9 h-9 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center"
        >
          <ProgresslyIcon class="w-5 h-5" />
        </div>
        <span class="font-semibold text-xl tracking-tight">Progressly</span>
      </div>

      <div class="relative z-10 space-y-10">
        <div class="space-y-4">
          <h1 class="text-5xl font-bold leading-tight whitespace-pre-line">{{ t('app.core.auth.hero_title') }}</h1>
          <p class="text-lg text-primary-foreground/60 leading-relaxed max-w-sm">
            {{ t('app.core.auth.hero_subtitle') }}
          </p>
        </div>
      </div>

      <div class="relative z-10 text-primary-foreground/30 text-xs">&copy; 2026 Progressly</div>
    </div>

    <div class="flex flex-col items-center justify-center p-8 lg:p-16 bg-background">
      <div class="lg:hidden flex items-center gap-2 mb-10">
        <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <ProgresslyIcon class="w-4 h-4 text-primary-foreground" />
        </div>
        <span class="font-semibold text-lg tracking-tight">Progressly</span>
      </div>

      <div class="w-full max-w-sm">
        <div class="mb-8 space-y-1">
          <h2 class="text-2xl font-bold text-foreground">{{ t('app.core.register.title') }}</h2>
          <p class="text-muted-foreground text-sm">{{ t('app.core.register.description') }}</p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-5">
          <div class="space-y-1.5">
            <Label for="registerEmail" class="text-sm font-medium">{{ t('app.core.register.email_label') }}</Label>
            <Input
              id="registerEmail"
              v-model="registerEmail"
              type="email"
              autocomplete="email"
              placeholder="name@mail.com"
              class="h-11"
              required
            />
          </div>

          <div class="space-y-1.5">
            <Label for="registerPassword" class="text-sm font-medium">{{
              t('app.core.register.password_label')
            }}</Label>
            <Input
              id="registerPassword"
              v-model="registerPassword"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              class="h-11"
              required
            />
            <div v-if="passwordStrength" class="space-y-1.5">
              <div
                class="flex gap-1"
                role="progressbar"
                :aria-valuenow="passwordStrength.score"
                aria-valuemin="0"
                aria-valuemax="5"
                :aria-label="t(`app.core.register.password_strength.${passwordStrength.level}`)"
              >
                <div
                  v-for="(seg, i) in strengthSegments"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-all duration-300"
                  :class="passwordStrength.score >= seg.min ? seg.activeClass : 'bg-muted'"
                />
              </div>
              <p class="text-xs text-muted-foreground" aria-live="polite">
                {{ t(`app.core.register.password_strength.${passwordStrength.level}`) }}
              </p>
            </div>
          </div>

          <Button type="submit" class="w-full h-11 mt-2" :disabled="loading">
            <template v-if="loading">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              {{ t('app.core.register.loading') }}
            </template>
            <template v-else>{{ t('app.core.register.button') }}</template>
          </Button>

          <div v-if="error" role="alert" class="text-destructive text-sm text-center">{{ error }}</div>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {{ t('app.core.register.have_account_question') }}
          <router-link to="/login" class="text-primary font-medium hover:underline ml-1">
            {{ t('app.core.register.switch_to_login') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores';
import { useTranslation } from '@/composables/useTranslation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ProgresslyIcon from '@/components/ProgresslyIcon.vue';

const { t } = useTranslation();

const userStore = useUserStore();
const router = useRouter();

const registerEmail = ref('');
const registerPassword = ref('');

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const passwordStrength = computed<{ level: StrengthLevel; score: number } | null>(() => {
  const p = registerPassword.value;
  if (!p) return null;

  let score = 0;
  if (p.length >= 8) {
    score++;
  }
  if (/[a-z]/.test(p)) {
    score++;
  }
  if (/[A-Z]/.test(p)) {
    score++;
  }
  if (/\d/.test(p)) {
    score++;
  }
  if (/[^a-zA-Z0-9]/.test(p)) {
    score++;
  }

  const level: StrengthLevel = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';

  return { level, score };
});

const strengthSegments = [
  { min: 1, activeClass: 'bg-destructive' },
  { min: 2, activeClass: 'bg-warning' },
  { min: 3, activeClass: 'bg-chart-3' },
  { min: 4, activeClass: 'bg-success' },
  { min: 5, activeClass: 'bg-success' },
];

const { register } = userStore;
const { loading, error } = storeToRefs(userStore);

async function handleRegister() {
  if (registerPassword.value.length < 6) {
    return;
  }
  const user = await register(registerEmail.value, registerPassword.value);
  if (user) {
    router.push('/dashboard');
  }
}
</script>
