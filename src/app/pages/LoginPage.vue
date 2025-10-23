<template>
  <div class="flex items-center justify-center min-h-screen">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="text-center text-2xl">Log In</CardTitle>
        <CardDescription class="text-center"> Access your account </CardDescription>
      </CardHeader>

      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <Label for="loginEmail">Email</Label>
            <Input id="loginEmail" v-model="loginEmail" type="email" placeholder="you@example.com" required />
          </div>

          <div class="space-y-2">
            <Label for="loginPassword">Password</Label>
            <Input id="loginPassword" v-model="loginPassword" type="password" placeholder="********" required />
          </div>

          <Button type="submit" class="w-full" :disabled="loading">
            <template v-if="loading">Logging in...</template>
            <template v-else>Log In</template>
          </Button>

          <div v-if="error" class="text-destructive text-sm text-center">
            {{ error }}
          </div>
        </form>
      </CardContent>

      <CardFooter class="flex justify-center">
        <p class="text-sm text-muted-foreground">
          Don’t have an account?
          <router-link to="/register" class="text-primary hover:underline"> Register </router-link>
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
import { useUserStore } from '../../stores';

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
