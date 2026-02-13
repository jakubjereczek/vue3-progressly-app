<template>
  <div class="flex items-center justify-center min-h-screen">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-center text-2xl">{{ t('app.core.login.title') }}</CardTitle>
        <CardDescription class="text-center">{{ t('app.core.login.description') }}</CardDescription>
      </CardHeader>

      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <Label for="loginEmail">{{ t('app.core.login.email_label') }}</Label>
            <Input
              id="loginEmail"
              v-model="loginEmail"
              type="email"
              :placeholder="'name@mail.com'"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="loginPassword">{{ t('app.core.login.password_label') }}</Label>
            <Input
              id="loginPassword"
              v-model="loginPassword"
              type="password"
              :placeholder="'******'"
              required
            />
          </div>

          <Button type="submit" class="w-full" :disabled="loading">
            <template v-if="loading">{{ t('app.core.login.loading') }}</template>
            <template v-else>{{ t('app.core.login.button') }}</template>
          </Button>

          <div v-if="error" class="text-destructive text-sm text-center">
            {{ error }}
          </div>
        </form>
      </CardContent>

      <CardFooter class="flex justify-center">
        <p class="text-sm text-muted-foreground">
          {{ t('app.core.login.no_account') }}
          <router-link to="/register" class="text-primary hover:underline"> {{ t('app.core.login.switch_to_register') }} </router-link>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../../stores';
import { useTranslation } from '@/composables/useTranslation';

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
