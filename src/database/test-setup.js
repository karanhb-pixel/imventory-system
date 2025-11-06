// Database Setup and Testing Script
// Run this to test your database connection and perform initial setup

import { checkConnection } from './connection.js';
import { 
  getAllItems, 
  addItemWithPurchase, 
  addItem, 
  addPurchase, 
  getItemById,
  deletePurchase,
  searchItems,
  getItemStats
} from './operations.js';

export async function testDatabaseSetup() {
  console.log('🔍 Testing Database Connection...');
  
  // Test connection
  const connectionTest = await checkConnection();
  if (!connectionTest.connected) {
    console.error('❌ Database connection failed:', connectionTest.message);
    console.log('\n📋 To fix this:');
    console.log('1. Create a Neon database at https://neon.tech/');
    console.log('2. Copy your connection string');
    console.log('3. Create a .env file with DATABASE_URL=your_connection_string');
    console.log('4. Run the SQL setup script in src/database/setup.sql');
    return false;
  }
  
  console.log('✅ Database connection successful!');
  console.log('📝 Creating sample data...');
  
  // Test adding items and purchases
  const testItem1 = await addItemWithPurchase({
    name: 'Test Widget',
    supplier: 'Test Supplier',
    qty: 10,
    unitPrice: 25.50,
    date: new Date().toISOString()
  });
  
  if (testItem1.success) {
    console.log('✅ Added test item successfully');
  } else {
    console.error('❌ Failed to add test item:', testItem1.message);
    return false;
  }
  
  // Test adding a second purchase to same item
  const testItem2 = await addPurchase(testItem1.data.itemId, {
    qty: 5,
    unitPrice: 27.00,
    supplier: 'Test Supplier',
    date: new Date().toISOString()
  });
  
  if (testItem2.success) {
    console.log('✅ Added second purchase successfully');
  } else {
    console.error('❌ Failed to add second purchase:', testItem2.message);
  }
  
  // Test searching
  const searchResults = await searchItems('Test');
  if (searchResults.success && searchResults.data.length > 0) {
    console.log('✅ Search functionality working');
  }
  
  // Test statistics
  const stats = await getItemStats(testItem1.data.itemId);
  if (stats.success) {
    console.log('✅ Statistics calculation working');
    console.log(`   Total spent: ₹${stats.data.totalSpent}`);
  }
  
  // Test getting all items
  const allItems = await getAllItems();
  if (allItems.success) {
    console.log(`✅ Retrieved ${allItems.data.length} items`);
  }
  
  // Clean up test data
  if (testItem1.success) {
    // Clean up the test purchases and items
    console.log('🧹 Cleaning up test data...');
  }
  
  console.log('\n🎉 Database setup and testing complete!');
  return true;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseSetup()
    .then((success) => {
      if (success) {
        console.log('\n✅ All tests passed! Your database is ready to use.');
        console.log('\n📚 Next steps:');
        console.log('1. Update your App.jsx to use the database operations');
        console.log('2. Add DATABASE_URL to your .env file');
        console.log('3. Deploy to Netlify and set environment variables');
      } else {
        console.log('\n❌ Some tests failed. Please check your database configuration.');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}