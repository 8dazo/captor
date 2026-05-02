const handler: ProxyHandler<object> = {
  get() {
    throw new Error('Not implemented: database not configured');
  },
  apply() {
    throw new Error('Not implemented: database not configured');
  },
};

export const prisma = new Proxy(Object.create(null), handler) as any;
