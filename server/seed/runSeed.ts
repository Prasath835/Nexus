import { resetToSeedData } from '../config/db';

const state = resetToSeedData();
console.log(
  `[Seed] Database reset completed: ${state.users.length} users, ${state.categories.length} categories, ${state.products.length} products, ${state.coupons.length} coupons, ${state.orders.length} orders.`
);
