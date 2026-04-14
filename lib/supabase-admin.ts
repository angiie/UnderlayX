export const supabaseAdmin = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { id: 'mock-user', email: 'test@example.com' }, error: null })
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
