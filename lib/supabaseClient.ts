export const supabase = {
  auth: {
    getUser: async () => ({ 
      data: { 
        user: { 
          id: 'mock-user',
          user_metadata: {
            avatar_url: 'https://ui-avatars.com/api/?name=Pro+User',
            full_name: 'Pro User'
          }
        } 
      } 
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ 
      data: { 
        session: {
          user: { 
            id: 'mock-user',
            user_metadata: {
              avatar_url: 'https://ui-avatars.com/api/?name=Pro+User',
              full_name: 'Pro User'
            }
          } 
        } 
      }, 
      error: null 
    }),
    signInWithOAuth: async () => ({}),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { expires_at: new Date(Date.now() + 86400000).toISOString(), generations_count: 0 }, error: null })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null })
        })
      })
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: null })
      })
    })
  })
} as any;