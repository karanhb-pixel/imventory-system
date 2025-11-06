# Imventory System - Neon Database Setup Guide

## 🎯 Overview
Your inventory system has been successfully configured to work with Neon PostgreSQL database. This guide will help you complete the setup.

## 📋 Prerequisites
- A Neon account (sign up at https://neon.tech)
- A project created in Neon

## 🚀 Step-by-Step Setup

### 1. Create a Neon Database
1. Go to https://neon.tech/dashboard
2. Click "New Project"
3. Choose a name (e.g., "imventory-system")
4. Select a region close to you
5. Wait for the project to be created

### 2. Get Your Connection String
1. In your Neon dashboard, go to your project
2. Click on "Connection" or "Connection String"
3. Copy the "Connection string" - it looks like:
   ```
   postgresql://user:password@host/dbname?sslmode=require
   ```

### 3. Update Environment Configuration
1. Update your `.env` file with your actual Neon connection string:
   ```env
   DATABASE_URL=your_actual_connection_string_here
   NODE_ENV=development
   ```

### 4. Run Database Setup
1. In your Neon dashboard, go to the SQL Editor
2. Copy and paste the content from `src/database/setup.sql`
3. Run the SQL to create the tables

### 5. Test the Database Connection
```bash
node src/database/test-setup.js
```

## 📁 Database Structure

### Tables Created:
- **items**: Stores inventory items (id, name, timestamps)
- **purchases**: Stores purchase records (item_id, date, qty, unit_price, supplier)

### Key Features:
- Automatic timestamps (created_at, updated_at)
- Cascade deletion (deleting an item removes all its purchases)
- Indexed columns for performance

## 🔧 Available Database Operations

The system provides these functions in `src/database/operations.js`:

- `getAllItems()` - Get all items with purchases
- `addItemWithPurchase({name, supplier, qty, unitPrice, date})` - Add item with first purchase
- `addItem(name)` - Add new item
- `addPurchase(itemId, purchaseData)` - Add purchase to existing item
- `getItemById(itemId)` - Get single item with purchases
- `deletePurchase(purchaseId)` - Delete a purchase
- `searchItems(searchTerm)` - Search items by name
- `getItemStats(itemId)` - Get statistics for an item

## 🌐 Netlify Deployment

### Set Environment Variables in Netlify:
1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add `DATABASE_URL` with your Neon connection string
4. Add `NODE_ENV=production`

### Files to Include:
- All files in `src/database/` directory
- Updated `package.json` with dependencies
- `.env` for local development

## 🔍 Troubleshooting

### Connection Issues:
1. Check your DATABASE_URL format
2. Ensure SSL is enabled (add `?sslmode=require`)
3. Verify your Neon project is active

### Table Creation Issues:
1. Run the SQL script in Neon SQL Editor
2. Check for any error messages
3. Ensure you have proper permissions

### Common Errors:
- `Invalid connection string`: Check your DATABASE_URL
- `Relation does not exist`: Run the setup.sql script
- `Authentication failed`: Check username/password in connection string

## 📚 Integration with React App

To integrate the database with your React app:

1. Replace localStorage operations with database functions
2. Import database operations:
   ```javascript
   import { getAllItems, addItemWithPurchase } from './database/operations.js';
   ```
3. Update your App.jsx to use async/await with database functions
4. Handle loading states and error states

## 🎉 Success!

Once setup is complete, your inventory system will:
- ✅ Store data persistently in the cloud
- ✅ Support multiple users and sessions
- ✅ Provide reliable database operations
- ✅ Scale with your usage
- ✅ Work seamlessly on Netlify deployment