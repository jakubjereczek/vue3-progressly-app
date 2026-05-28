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
          <h2 class="text-2xl font-bold text-foreground">{{ t('app.core.login.title') }}</h2>
          <p class="text-muted-foreground text-sm">{{ t('app.core.login.description') }}</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div class="space-y-1.5">
            <Label for="loginEmail" class="text-sm font-medium">{{ t('app.core.login.email_label') }}</Label>
            <Input
              id="loginEmail"
              v-model="loginEmail"
              type="email"
              autocomplete="email"
              placeholder="name@mail.com"
              class="h-11"
              required
            />
          </div>

          <div class="space-y-1.5">
            <Label for="loginPassword" class="text-sm font-medium">{{ t('app.core.login.password_label') }}</Label>
            <Input
              id="loginPassword"
              v-model="loginPassword"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="h-11"
              required
            />
          </div>

          <Button type="submit" class="w-full h-11 mt-2" :disabled="loading">
            <template v-if="loading">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              {{ t('app.core.login.loading') }}
            </template>
            <template v-else>{{ t('app.core.login.button') }}</template>
          </Button>

          <div v-if="error" role="alert" class="text-destructive text-sm text-center">{{ error }}</div>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {{ t('app.core.login.no_account') }}
          <router-link to="/register" class="text-primary font-medium hover:underline ml-1">
            {{ t('app.core.login.switch_to_register') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-vue-next';
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores';
import { useTranslation } from '@/composables/useTranslation';
import ProgresslyIcon from '@/components/ProgresslyIcon.vue';

const { t } = useTranslation();

const userStore = useUserStore();
const router = useRouter();

const loginEmail = ref('');
const loginPassword = ref('');

const { login } = userStore;
const { loading, error } = storeToRefs(userStore);

async function handleLogin() {
  const user = await login(loginEmail.value, loginPassword.value);
  if (user) {
    router.push('/dashboard');
  }
}
</script>
