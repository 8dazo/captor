function notImplemented() {
  throw new Error('Not implemented');
}

export const stripeServer = {
  subscriptions: {
    create: notImplemented,
    retrieve: notImplemented,
    update: notImplemented,
    list: notImplemented,
    cancel: notImplemented,
  },
  customers: {
    create: notImplemented,
    retrieve: notImplemented,
    update: notImplemented,
    list: notImplemented,
    delete: notImplemented,
  },
  prices: {
    retrieve: notImplemented,
    list: notImplemented,
  },
  products: {
    retrieve: notImplemented,
    list: notImplemented,
  },
  checkout: {
    sessions: {
      create: notImplemented,
      retrieve: notImplemented,
      list: notImplemented,
    },
  },
  billingPortal: {
    sessions: {
      create: notImplemented,
    },
  },
};
