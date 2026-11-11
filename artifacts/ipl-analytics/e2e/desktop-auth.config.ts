import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'desktop-auth.spec.ts',timeout:90000,expect:{timeout:30000},workers:1,reporter:'list',outputDir:'.results/desktop-auth',use:{baseURL:process.env.E2E_BASE_URL??'http://localhost:3000',channel:'chrome',viewport:{width:1440,height:900},screenshot:'only-on-failure',trace:'retain-on-failure'}});
