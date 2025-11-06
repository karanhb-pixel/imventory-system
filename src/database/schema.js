import { pgTable, text, timestamp, numeric, serial, varchar } from 'drizzle-orm/pg-core';

// Items table - stores inventory items
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Purchases table - stores purchase records
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  itemId: serial('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(),
  qty: numeric('qty', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  supplier: varchar('supplier', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Helper function to get the schema structure for reference
export const getSchemaStructure = () => ({
  tables: {
    items: {
      description: 'Main inventory items table',
      columns: {
        id: 'Primary key (auto-increment)',
        name: 'Item name (unique, required)',
        createdAt: 'Creation timestamp',
        updatedAt: 'Last update timestamp'
      }
    },
    purchases: {
      description: 'Purchase records table',
      columns: {
        id: 'Primary key (auto-increment)',
        itemId: 'Foreign key to items.id (required)',
        date: 'Purchase date (required)',
        qty: 'Quantity purchased (required)',
        unitPrice: 'Price per unit (required)',
        supplier: 'Supplier name (optional)',
        createdAt: 'Record creation timestamp'
      }
    }
  },
  relationships: {
    oneToMany: {
      items: {
        relatedTable: 'purchases',
        foreignKey: 'itemId',
        description: 'One item can have many purchases'
      }
    },
    cascadeDelete: {
      purchases: {
        description: 'When an item is deleted, all its purchases are also deleted'
      }
    }
  }
});