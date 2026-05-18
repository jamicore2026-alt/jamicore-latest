import { pgTable, pgEnum, varchar, text, integer, boolean, timestamp, decimal, uuid, jsonb, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const userRoleEnum = pgEnum('user_role', ['PLATFORM_ADMIN', 'MERCHANT_ADMIN', 'CUSTOMER', 'STAFF'])
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
export const storeStatusEnum = pgEnum('store_status', ['PENDING', 'ACTIVE', 'SUSPENDED'])

export const superAdmins = pgTable('super_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const merchantPlans = pgTable('merchant_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  billingInterval: varchar('billing_interval', { length: 50 }).notNull().default('monthly'),
  features: jsonb('features'),
  maxProducts: integer('max_products'),
  maxStaff: integer('max_staff'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }).unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  status: storeStatusEnum('status').default('PENDING').notNull(),
  planId: uuid('plan_id').references(() => merchantPlans.id),
  ownerId: uuid('owner_id').notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('store_status_idx').on(table.status),
  index('store_plan_idx').on(table.planId),
])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }),
  role: userRoleEnum('role').default('CUSTOMER').notNull(),
  storeId: uuid('store_id').references(() => stores.id),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('user_store_idx').on(table.storeId),
  index('user_email_idx').on(table.email),
])

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('category_store_slug_idx').on(table.storeId, table.slug),
])

export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  categoryId: uuid('category_id').references(() => categories.id),
  subcategoryId: uuid('subcategory_id').references(() => subcategories.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  imageUrls: jsonb('image_urls'),
  isPublished: boolean('is_published').default(false).notNull(),
  trackInventory: boolean('track_inventory').default(true).notNull(),
  currentQuantity: integer('current_quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  isActive: boolean('is_active').default(true).notNull(),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('product_store_slug_idx').on(table.storeId, table.slug),
  index('product_category_idx').on(table.categoryId),
  index('product_published_idx').on(table.isPublished),
])

export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  minSelect: integer('min_select').default(0),
  maxSelect: integer('max_select').default(1),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const modifierOptions = pgTable('modifier_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  modifierGroupId: uuid('modifier_group_id').notNull().references(() => modifierGroups.id),
  name: varchar('name', { length: 255 }).notNull(),
  priceAdjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).default('0').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
})

export const productModifierLinks = pgTable('product_modifier_links', {
  productId: uuid('product_id').notNull().references(() => products.id),
  modifierGroupId: uuid('modifier_group_id').notNull().references(() => modifierGroups.id),
}, (table) => [
  primaryKey({ columns: [table.productId, table.modifierGroupId] }),
])

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  isEmailVerified: boolean('is_email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('customer_store_email_idx').on(table.storeId, table.email),
])

export const customerAddresses = pgTable('customer_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  label: varchar('label', { length: 100 }).default('Home'),
  addressLine1: varchar('address_line_1', { length: 255 }).notNull(),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 255 }).notNull(),
  state: varchar('state', { length: 255 }),
  postalCode: varchar('postal_code', { length: 50 }).notNull(),
  country: varchar('country', { length: 2 }).notNull().default('US'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('PENDING').notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  shippingAmount: decimal('shipping_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  notes: text('notes'),
  couponCode: varchar('coupon_code', { length: 50 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('order_store_idx').on(table.storeId),
  index('order_customer_idx').on(table.customerId),
  index('order_status_idx').on(table.status),
  index('order_payment_idx').on(table.paymentStatus),
])

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb('modifiers'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 255 }),
  body: text('body'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('review_product_idx').on(table.productId),
  index('review_customer_idx').on(table.customerId),
])

export const wishlists = pgTable('wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  name: varchar('name', { length: 255 }).default('My Wishlist').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('wishlist_store_customer_name_idx').on(table.storeId, table.customerId, table.name),
])

export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  wishlistId: uuid('wishlist_id').notNull().references(() => wishlists.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('wishlist_item_unique_idx').on(table.wishlistId, table.productId),
])

export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  customerId: uuid('customer_id').references(() => customers.id),
  sessionId: varchar('session_id', { length: 255 }),
  isGuest: boolean('is_guest').default(true).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  shippingAmount: decimal('shipping_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  couponCode: varchar('coupon_code', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cart_customer_idx').on(table.customerId),
  index('cart_session_idx').on(table.sessionId),
])

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').notNull().references(() => carts.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb('modifiers'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('cart_item_unique_idx').on(table.cartId, table.productId),
])

export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 20 }).notNull(),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').default(0).notNull(),
  startsAt: timestamp('starts_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('coupon_store_code_idx').on(table.storeId, table.code),
])

export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  countries: jsonb('countries'),
  regions: jsonb('regions'),
  postalCodes: jsonb('postal_codes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  zoneId: uuid('zone_id').notNull().references(() => shippingZones.id),
  name: varchar('name', { length: 255 }).notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  freeShippingThreshold: decimal('free_shipping_threshold', { precision: 10, scale: 2 }),
  minWeight: decimal('min_weight', { precision: 10, scale: 3 }),
  maxWeight: decimal('max_weight', { precision: 10, scale: 3 }),
  deliveryDaysMin: integer('delivery_days_min'),
  deliveryDaysMax: integer('delivery_days_max'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const taxRates = pgTable('tax_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  rate: decimal('rate', { precision: 5, scale: 4 }).notNull(),
  country: varchar('country', { length: 2 }),
  state: varchar('state', { length: 255 }),
  postalCode: varchar('postal_code', { length: 50 }),
  city: varchar('city', { length: 255 }),
  appliesToShipping: boolean('applies_to_shipping').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  variables: jsonb('variables'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id),
  userId: uuid('user_id'),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  action: varchar('action', { length: 50 }).notNull(),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('activity_store_idx').on(table.storeId),
  index('activity_entity_idx').on(table.entityType, table.entityId),
])

export const storeAnalytics = pgTable('store_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  date: timestamp('date').notNull(),
  pageViews: integer('page_views').default(0).notNull(),
  uniqueVisitors: integer('unique_visitors').default(0).notNull(),
  ordersCount: integer('orders_count').default(0).notNull(),
  revenue: decimal('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
  averageOrderValue: decimal('average_order_value', { precision: 10, scale: 2 }).default('0').notNull(),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }).default('0').notNull(),
  topProducts: jsonb('top_products'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('analytics_store_date_idx').on(table.storeId, table.date),
])

export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('token_email_idx').on(table.email),
])

export const staffInvitations = pgTable('staff_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('STAFF').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('PENDING').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: userRoleEnum('role').notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  isAllowed: boolean('is_allowed').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('permission_role_resource_action_idx').on(table.role, table.resource, table.action),
])

export const storeRelations = relations(stores, ({ one, many }) => ({
  plan: one(merchantPlans, { fields: [stores.planId], references: [merchantPlans.id] }),
  categories: many(categories),
  products: many(products),
  customers: many(customers),
  orders: many(orders),
  coupons: many(coupons),
  shippingZones: many(shippingZones),
  taxRates: many(taxRates),
  analytics: many(storeAnalytics),
}))

export const productRelations = relations(products, ({ one, many }) => ({
  store: one(stores, { fields: [products.storeId], references: [stores.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  subcategory: one(subcategories, { fields: [products.subcategoryId], references: [subcategories.id] }),
  reviews: many(reviews),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}))

export const customerRelations = relations(customers, ({ one, many }) => ({
  store: one(stores, { fields: [customers.storeId], references: [stores.id] }),
  addresses: many(customerAddresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlists: many(wishlists),
}))

export const orderRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
}))
