import { db, schema } from './connection.js';
import { eq, and, desc, sql } from 'drizzle-orm';

// Database utility functions for inventory operations

// Get all items with their purchases
export async function getAllItems() {
  try {
    const result = await db.query.items.findMany({
      with: {
        purchases: {
          orderBy: desc(schema.purchases.date)
        }
      },
      orderBy: desc(schema.items.createdAt)
    });

    return {
      success: true,
      data: result,
      message: `Successfully retrieved ${result.length} items`
    };
  } catch (error) {
    console.error('Error fetching items:', error);
    return {
      success: false,
      data: null,
      message: `Failed to fetch items: ${error.message}`
    };
  }
}

// Add a new item
export async function addItem(itemName) {
  try {
    const result = await db
      .insert(schema.items)
      .values({
        name: itemName.trim()
      })
      .returning();

    return {
      success: true,
      data: result[0],
      message: `Successfully added item: ${itemName}`
    };
  } catch (error) {
    console.error('Error adding item:', error);
    return {
      success: false,
      data: null,
      message: `Failed to add item: ${error.message}`
    };
  }
}

// Add a purchase to an item
export async function addPurchase(itemId, purchaseData) {
  try {
    const { qty, unitPrice, supplier, date } = purchaseData;
    
    const result = await db
      .insert(schema.purchases)
      .values({
        itemId: itemId,
        date: new Date(date),
        qty: Number(qty),
        unitPrice: Number(unitPrice),
        supplier: supplier?.trim() || null
      })
      .returning();

    return {
      success: true,
      data: result[0],
      message: 'Successfully added purchase'
    };
  } catch (error) {
    console.error('Error adding purchase:', error);
    return {
      success: false,
      data: null,
      message: `Failed to add purchase: ${error.message}`
    };
  }
}

// Add item with first purchase (convenience function)
export async function addItemWithPurchase({ name, supplier, qty, unitPrice, date }) {
  try {
    // First, try to find existing item by name
    const existingItems = await db.query.items.findMany({
      where: (items, { eq }) => eq(items.name, name.trim()),
      limit: 1
    });

    let itemId;
    let isNewItem = false;

    if (existingItems.length > 0) {
      itemId = existingItems[0].id;
    } else {
      // Create new item
      const newItemResult = await db
        .insert(schema.items)
        .values({
          name: name.trim()
        })
        .returning();
      itemId = newItemResult[0].id;
      isNewItem = true;
    }

    // Add the purchase
    const purchaseResult = await db
      .insert(schema.purchases)
      .values({
        itemId: itemId,
        date: new Date(date),
        qty: Number(qty),
        unitPrice: Number(unitPrice),
        supplier: supplier?.trim() || null
      })
      .returning();

    return {
      success: true,
      data: {
        itemId,
        purchase: purchaseResult[0],
        isNewItem
      },
      message: isNewItem ? `Successfully added item and purchase` : `Successfully added purchase to existing item`
    };
  } catch (error) {
    console.error('Error adding item with purchase:', error);
    return {
      success: false,
      data: null,
      message: `Failed to add item with purchase: ${error.message}`
    };
  }
}

// Get single item with purchases
export async function getItemById(itemId) {
  try {
    const result = await db.query.items.findMany({
      where: (items, { eq }) => eq(items.id, itemId),
      with: {
        purchases: {
          orderBy: desc(schema.purchases.date)
        }
      }
    });

    return {
      success: true,
      data: result.length > 0 ? result[0] : null,
      message: result.length > 0 ? 'Item found' : 'Item not found'
    };
  } catch (error) {
    console.error('Error fetching item:', error);
    return {
      success: false,
      data: null,
      message: `Failed to fetch item: ${error.message}`
    };
  }
}

// Delete a purchase
export async function deletePurchase(purchaseId) {
  try {
    const result = await db
      .delete(schema.purchases)
      .where(eq(schema.purchases.id, purchaseId))
      .returning();

    return {
      success: true,
      data: result[0] || null,
      message: 'Purchase deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return {
      success: false,
      data: null,
      message: `Failed to delete purchase: ${error.message}`
    };
  }
}

// Delete an item (and all its purchases due to cascade)
export async function deleteItem(itemId) {
  try {
    const result = await db
      .delete(schema.items)
      .where(eq(schema.items.id, itemId))
      .returning();

    return {
      success: true,
      data: result[0] || null,
      message: 'Item and all its purchases deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting item:', error);
    return {
      success: false,
      data: null,
      message: `Failed to delete item: ${error.message}`
    };
  }
}

// Update item name
export async function updateItemName(itemId, newName) {
  try {
    const result = await db
      .update(schema.items)
      .set({
        name: newName.trim(),
        updatedAt: new Date()
      })
      .where(eq(schema.items.id, itemId))
      .returning();

    return {
      success: true,
      data: result[0] || null,
      message: 'Item name updated successfully'
    };
  } catch (error) {
    console.error('Error updating item:', error);
    return {
      success: false,
      data: null,
      message: `Failed to update item: ${error.message}`
    };
  }
}

// Search items by name
export async function searchItems(searchTerm) {
  try {
    const result = await db.query.items.findMany({
      with: {
        purchases: {
          orderBy: desc(schema.purchases.date)
        }
      },
      where: (items, { sql }) => sql`LOWER(${items.name}) LIKE LOWER('%' || ${searchTerm} || '%')`
    });

    return {
      success: true,
      data: result,
      message: `Found ${result.length} items matching "${searchTerm}"`
    };
  } catch (error) {
    console.error('Error searching items:', error);
    return {
      success: false,
      data: [],
      message: `Failed to search items: ${error.message}`
    };
  }
}

// Get item statistics
export async function getItemStats(itemId) {
  try {
    const item = await getItemById(itemId);
    if (!item.success || !item.data) {
      return { success: false, data: null, message: 'Item not found' };
    }

    const purchases = item.data.purchases || [];
    const totalSpent = purchases.reduce((sum, p) => sum + (Number(p.qty) * Number(p.unitPrice)), 0);
    const averagePrice = purchases.length > 0 ? totalSpent / purchases.length : 0;
    const lastPurchase = purchases.length > 0 ? purchases[0] : null;

    return {
      success: true,
      data: {
        purchaseCount: purchases.length,
        totalSpent,
        averagePrice,
        lastPurchase,
        priceChange: purchases.length > 1 ? purchases[0].unitPrice - purchases[1].unitPrice : null
      },
      message: 'Item statistics calculated'
    };
  } catch (error) {
    console.error('Error calculating item stats:', error);
    return {
      success: false,
      data: null,
      message: `Failed to calculate item stats: ${error.message}`
    };
  }
}