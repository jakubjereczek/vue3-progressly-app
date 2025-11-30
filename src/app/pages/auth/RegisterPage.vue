<template>
  <div class="flex items-center justify-center min-h-screen">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-center text-2xl">{{ t('register.title') }}</CardTitle>
        <CardDescription class="text-center">{{ t('register.description') }}</CardDescription>
      </CardHeader>

      <CardContent>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-2">
            <Label for="registerEmail">{{ t('register.emailLabel') }}</Label>
            <Input
              id="registerEmail"
              v-model="registerEmail"
              type="email"
              :placeholder="'name@mail.com'"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="registerPassword">{{ t('register.passwordLabel') }}</Label>
            <Input
              id="registerPassword"
              v-model="registerPassword"
              type="password"
              :placeholder="'******'"
              required
            />
          </div>

          <Button type="submit" class="w-full" :disabled="loading">
            <template v-if="loading">{{ t('register.loading') }}</template>
            <template v-else>{{ t('register.button') }}</template>
          </Button>

          <div v-if="error" class="text-destructive text-sm text-center">
            {{ error }}
          </div>
        </form>
      </CardContent>

      <CardFooter class="flex justify-center">
        <p class="text-sm text-muted-foreground">
          {{ t('register.haveAccount') }}
          <router-link to="/login" class="text-primary hover:underline">
            {{ t('register.login') }}
          </router-link>
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
import { useUserStore } from '@/stores';
import { useTranslation } from '@/composables/useTranslation';

const { t } = useTranslation();

const userStore = useUserStore();
const router = useRouter();

const registerEmail = ref('');
const registerPassword = ref('');

const { register } = userStore;
const { loading, error } = storeToRefs(userStore);

async function handleRegister() {
  const user = await register(registerEmail.value, registerPassword.value);

  if (user) {
    router.push('/dashboard');
  }
}
</script>
