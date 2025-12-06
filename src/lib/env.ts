import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required'),
});

type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export const getEnv = (): Env => {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    // Support both VITE_SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_ANON_KEY
    // They are the same thing (anon key = publishable key)
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY 
      || import.meta.env.VITE_SUPABASE_ANON_KEY;

    validatedEnv = envSchema.parse({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    });
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(
        `Missing or invalid environment variables: ${missingVars}\n` +
        'Please check your .env file and ensure all required variables are set.\n' +
        'Note: You can use either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY (they are the same).'
      );
    }
    throw error;
  }
};

// Validate on import
if (typeof window !== 'undefined') {
  try {
    getEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}

