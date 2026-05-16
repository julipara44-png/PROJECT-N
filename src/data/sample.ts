export const SAMPLE_HOTEL_DATA = {
  name: "Grand Mt. Everest Resort",
  location: "Namche Bazaar, Solu-Khumbu",
  currency: "NPR",
  stats: {
    revenue: 4500000,
    expenses: 2800000,
    profit: 1700000,
    occupancy: 0.82,
  },
  monthlyPerformance: [
    { name: 'Jan', revenue: 420000, expenses: 210000 },
    { name: 'Feb', revenue: 380000, expenses: 200000 },
    { name: 'Mar', revenue: 510000, expenses: 240000 },
    { name: 'Apr', revenue: 640000, expenses: 280000 },
    { name: 'May', revenue: 590000, expenses: 270000 },
    { name: 'Jun', revenue: 310000, expenses: 190000 },
    { name: 'Jul', revenue: 280000, expenses: 180000 },
    { name: 'Aug', revenue: 320000, expenses: 190000 },
    { name: 'Sep', revenue: 580000, expenses: 260000 },
    { name: 'Oct', revenue: 720000, expenses: 310000 },
    { name: 'Nov', revenue: 680000, expenses: 300000 },
    { name: 'Dec', revenue: 560000, expenses: 250000 },
  ],
  inventory: [
    { id: 1, item: "Basmati Rice", category: "Food", stock: 120, unit: "kg", unitPrice: 180, expiryDate: "2024-12-20", reorderLevel: 50 },
    { id: 2, item: "White Wine", category: "Bar", stock: 45, unit: "bottles", unitPrice: 3200, expiryDate: "2025-05-15", reorderLevel: 20 },
    { id: 3, item: "Linens", category: "Housekeeping", stock: 210, unit: "units", unitPrice: 1200, expiryDate: "N/A", reorderLevel: 100 },
    { id: 4, item: "Toiletries", category: "Housekeeping", stock: 500, unit: "sets", unitPrice: 150, expiryDate: "2024-08-30", reorderLevel: 200 },
    { id: 5, item: "Chicken Breast", category: "Food", stock: 15, unit: "kg", unitPrice: 650, expiryDate: "2024-05-18", reorderLevel: 25 },
    { id: 6, item: "Whole Milk", category: "Food", stock: 12, unit: "liters", unitPrice: 110, expiryDate: "2024-05-11", reorderLevel: 10 },
    { id: 7, item: "Cooking Gas", category: "Kitchen", stock: 3, unit: "tanks", unitPrice: 2800, expiryDate: "N/A", reorderLevel: 10 },
    { id: 8, item: "Organic Honey", category: "Food", stock: 24, unit: "jars", unitPrice: 850, expiryDate: "2025-10-10", reorderLevel: 10 },
  ],
  cashFlow: [
    { 
      category: 'OPERATING INFLOWS', 
      items: [
        { name: 'Room Bookings (Cash)', amount: 1850000 },
        { name: 'Restaurant Receipts', amount: 420000 },
        { name: 'Activities & Tours', amount: 150000 },
      ], 
      total: 2420000 
    },
    { 
      category: 'OPERATING OUTFLOWS', 
      items: [
        { name: 'Vendor Payments', amount: 580000 },
        { name: 'Salary Disbursals', amount: 1200000 },
        { name: 'Utility Payments', amount: 320000 },
        { name: 'Govt Fees & Licenses', amount: 120000 },
      ], 
      total: 2220000 
    },
  ],
  queries: [
    { id: 1, customer: "John Doe", query: "Do you have heating in all rooms?", date: "2024-05-10", status: "Resolved", platform: "WhatsApp" },
    { id: 2, customer: "Rita Sharma", query: "Interested in the trekking package for Oct.", date: "2024-05-12", status: "Pending", platform: "Email" },
    { id: 3, customer: "Alex Wong", query: "Lost my trekking boots in the lobby.", date: "2024-05-13", status: "Replied", platform: "Facebook" },
    { id: 4, customer: "Sarah Smith", query: "Can I book for 15 people for dinner?", date: "2024-05-14", status: "Pending", platform: "WhatsApp" },
    { id: 5, customer: "Mingma Sherpa", query: "Do you offer airport pickup from Lukla?", date: "2024-05-15", status: "Pending", platform: "Email" },
  ],
  team: [
    { id: 1, name: "Karma Sherpa", role: "Owner", salary: 85000, status: "On Duty", joinedDate: "2021-03-12" },
    { id: 2, name: "Pema Dolma", role: "Manager", salary: 35000, status: "On Duty", joinedDate: "2022-05-20" },
    { id: 3, name: "Lhakpa Tashi", role: "Accountant", salary: 65000, status: "Off Duty", joinedDate: "2023-01-15" },
    { id: 4, name: "Suman Thapa", role: "Marketer", salary: 28000, status: "On Duty", joinedDate: "2023-11-02" },
    { id: 5, name: "Nurbu Sherpa", role: "Pending", salary: 0, status: "Off Duty", joinedDate: "2024-05-01" },
  ],
  balanceSheet: {
    assets: [
      { name: "Cash and Equivalents", amount: 1500000 },
      { name: "Property & Equipment", amount: 25000000 },
      { name: "Inventory", amount: 450000 },
    ],
    liabilities: [
      { name: "Bank Loans", amount: 8000000 },
      { name: "Accounts Payable", amount: 320000 },
      { name: "Accrued Wages", amount: 150000 },
    ],
    equity: [
      { name: "Retained Earnings", amount: 18480000 },
    ]
  }
};
