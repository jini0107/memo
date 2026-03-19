import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  '';

export const ITEM_IMAGE_BUCKET = 'item-images';

const createFallbackClient = (): SupabaseClient =>
  ({
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Supabase client failed to initialize') }),
      getSession: async () => ({ data: { session: null }, error: new Error('Supabase client failed to initialize') }),
      signInAnonymously: async () => ({ data: { user: null, session: null }, error: new Error('Supabase client failed to initialize') }),
    },
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: { message: 'Supabase client failed to initialize' } }) }),
      insert: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }),
      update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase client failed to initialize' } }) }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Supabase client failed to initialize') }),
        remove: async () => ({ data: null, error: new Error('Supabase client failed to initialize') }),
        createSignedUrls: async () => ({ data: [], error: new Error('Supabase client failed to initialize') }),
      }),
    },
  } as unknown as SupabaseClient);

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are missing.');
}

let client: SupabaseClient;

try {
  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  client = createFallbackClient();
}

const ensureAnonymousSession = async (): Promise<User | null> => {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    console.error('Failed to read Supabase session:', sessionError);
  }

  const currentUser = sessionData.session?.user ?? null;
  if (currentUser) {
    return currentUser;
  }

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    console.error('Failed to sign in anonymously:', error);
    throw error;
  }

  return data.user ?? null;
};

export const ensureAuthenticatedUser = async (): Promise<User | null> => {
  return ensureAnonymousSession();
};

export const getAuthenticatedUserId = async (): Promise<string | null> => {
  const user = await ensureAnonymousSession();
  return user?.id ?? null;
};

export const supabase = client;
