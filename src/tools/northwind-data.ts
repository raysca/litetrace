export const categories = [
  { id: 1, name: "Beverages",    description: "Soft drinks, coffees, teas, beers, and ales" },
  { id: 2, name: "Condiments",   description: "Sweet and savory sauces, relishes, spreads, and seasonings" },
  { id: 3, name: "Confections",  description: "Desserts, candies, and sweet breads" },
  { id: 4, name: "Dairy",        description: "Cheeses" },
  { id: 5, name: "Grains",       description: "Breads, crackers, pasta, and cereal" },
  { id: 6, name: "Meat",         description: "Prepared meats" },
  { id: 7, name: "Produce",      description: "Dried fruit and bean curd" },
  { id: 8, name: "Seafood",      description: "Seaweed and fish" },
];

export const suppliers = [
  { id: 1, name: "Exotic Liquids",          country: "UK",     contact: "Charlotte Cooper" },
  { id: 2, name: "New Orleans Cajun Delights", country: "USA", contact: "Shelley Burke" },
  { id: 3, name: "Grandma Kelly's Homestead", country: "USA",  contact: "Regina Murphy" },
  { id: 4, name: "Tokyo Traders",           country: "Japan",  contact: "Yoshi Nagase" },
  { id: 5, name: "Cooperativa de Quesos",   country: "Spain",  contact: "Antonio del Valle" },
];

export const products = [
  { id: 1,  name: "Chai",               categoryId: 1, supplierId: 1, unitPrice: 18.00, unitsInStock: 39,  discontinued: false },
  { id: 2,  name: "Chang",              categoryId: 1, supplierId: 1, unitPrice: 19.00, unitsInStock: 17,  discontinued: false },
  { id: 3,  name: "Aniseed Syrup",      categoryId: 2, supplierId: 1, unitPrice: 10.00, unitsInStock: 13,  discontinued: false },
  { id: 4,  name: "Chef Anton's Mix",   categoryId: 2, supplierId: 2, unitPrice: 22.00, unitsInStock: 53,  discontinued: false },
  { id: 5,  name: "Grandma's Boysenberry", categoryId: 2, supplierId: 3, unitPrice: 25.00, unitsInStock: 120, discontinued: false },
  { id: 6,  name: "Uncle Bob's Pears",  categoryId: 7, supplierId: 3, unitPrice: 30.00, unitsInStock: 0,   discontinued: true  },
  { id: 7,  name: "Northwoods Syrup",   categoryId: 2, supplierId: 2, unitPrice: 40.00, unitsInStock: 13,  discontinued: false },
  { id: 8,  name: "Mishi Kobe Niku",    categoryId: 6, supplierId: 4, unitPrice: 97.00, unitsInStock: 29,  discontinued: true  },
  { id: 9,  name: "Tofu",              categoryId: 7, supplierId: 4, unitPrice: 23.25, unitsInStock: 35,  discontinued: false },
  { id: 10, name: "Ikura",             categoryId: 8, supplierId: 4, unitPrice: 31.00, unitsInStock: 31,  discontinued: false },
  { id: 11, name: "Queso Cabrales",    categoryId: 4, supplierId: 5, unitPrice: 21.00, unitsInStock: 22,  discontinued: false },
  { id: 12, name: "Queso Manchego",    categoryId: 4, supplierId: 5, unitPrice: 38.00, unitsInStock: 86,  discontinued: false },
  { id: 13, name: "Konbu",             categoryId: 8, supplierId: 4, unitPrice: 6.00,  unitsInStock: 24,  discontinued: false },
  { id: 14, name: "Tofu (Silken)",     categoryId: 7, supplierId: 4, unitPrice: 23.25, unitsInStock: 35,  discontinued: false },
  { id: 15, name: "Genen Shouyu",      categoryId: 2, supplierId: 4, unitPrice: 15.50, unitsInStock: 39,  discontinued: false },
];

export const employees = [
  { id: 1, firstName: "Nancy",   lastName: "Davolio",   title: "Sales Representative", region: "WA" },
  { id: 2, firstName: "Andrew",  lastName: "Fuller",    title: "Vice President, Sales", region: "WA" },
  { id: 3, firstName: "Janet",   lastName: "Leverling", title: "Sales Representative", region: "WA" },
  { id: 4, firstName: "Margaret",lastName: "Peacock",   title: "Sales Representative", region: "WA" },
  { id: 5, firstName: "Steven",  lastName: "Buchanan",  title: "Sales Manager",        region: "UK" },
];

export const customers = [
  { id: "ALFKI", company: "Alfreds Futterkiste",    contact: "Maria Anders",    country: "Germany", city: "Berlin"   },
  { id: "ANATR", company: "Ana Trujillo Emparedados",contact: "Ana Trujillo",   country: "Mexico",  city: "Mexico D.F." },
  { id: "ANTON", company: "Antonio Moreno Taquería",contact: "Antonio Moreno", country: "Mexico",  city: "Mexico D.F." },
  { id: "AROUT", company: "Around the Horn",         contact: "Thomas Hardy",   country: "UK",      city: "London"   },
  { id: "BERGS", company: "Berglunds snabbköp",      contact: "Christina Berglund", country: "Sweden", city: "Luleå" },
  { id: "BLAUS", company: "Blauer See Delikatessen",  contact: "Hanna Moos",    country: "Germany", city: "Mannheim" },
  { id: "BOLID", company: "Bólido Comidas preparadas",contact: "Martín Sommer",country: "Spain",   city: "Madrid"   },
  { id: "BONAP", company: "Bon app'",                contact: "Laurence Lebihan",country: "France", city: "Marseille"},
  { id: "BOTTM", company: "Bottom-Dollar Markets",   contact: "Elizabeth Lincoln",country: "Canada",city: "Tsawassen"},
  { id: "BSBEV", company: "B's Beverages",           contact: "Victoria Ashworth",country: "UK",   city: "London"   },
];

export const orders = [
  { id: 10248, customerId: "ALFKI", employeeId: 5, orderDate: "2024-07-04", shipCountry: "France",  freight: 32.38 },
  { id: 10249, customerId: "ANATR", employeeId: 6, orderDate: "2024-07-05", shipCountry: "Germany", freight: 11.61 },
  { id: 10250, customerId: "ANTON", employeeId: 4, orderDate: "2024-07-08", shipCountry: "Brazil",  freight: 65.83 },
  { id: 10251, customerId: "AROUT", employeeId: 3, orderDate: "2024-07-08", shipCountry: "France",  freight: 41.34 },
  { id: 10252, customerId: "BERGS", employeeId: 4, orderDate: "2024-07-09", shipCountry: "Belgium", freight: 51.30 },
  { id: 10253, customerId: "BLAUS", employeeId: 3, orderDate: "2024-07-10", shipCountry: "Brazil",  freight: 58.17 },
  { id: 10254, customerId: "BOLID", employeeId: 5, orderDate: "2024-07-11", shipCountry: "Switzerland", freight: 22.98 },
  { id: 10255, customerId: "BONAP", employeeId: 9, orderDate: "2024-07-12", shipCountry: "Switzerland", freight: 148.33 },
  { id: 10256, customerId: "BOTTM", employeeId: 3, orderDate: "2024-07-15", shipCountry: "Brazil",  freight: 13.97 },
  { id: 10257, customerId: "BSBEV", employeeId: 4, orderDate: "2024-07-16", shipCountry: "Venezuela",freight: 81.91 },
  { id: 10258, customerId: "ALFKI", employeeId: 1, orderDate: "2024-07-17", shipCountry: "Austria", freight: 140.51 },
  { id: 10259, customerId: "ANATR", employeeId: 4, orderDate: "2024-07-18", shipCountry: "USA",     freight: 3.25  },
  { id: 10260, customerId: "AROUT", employeeId: 4, orderDate: "2024-07-19", shipCountry: "Brazil",  freight: 55.09 },
];

export const orderDetails = [
  { orderId: 10248, productId: 11, unitPrice: 14.00, quantity: 12, discount: 0    },
  { orderId: 10248, productId: 42, unitPrice: 9.80,  quantity: 10, discount: 0    },
  { orderId: 10248, productId: 72, unitPrice: 34.80, quantity: 5,  discount: 0    },
  { orderId: 10249, productId: 14, unitPrice: 18.60, quantity: 9,  discount: 0    },
  { orderId: 10249, productId: 51, unitPrice: 42.40, quantity: 40, discount: 0    },
  { orderId: 10250, productId: 41, unitPrice: 7.70,  quantity: 10, discount: 0    },
  { orderId: 10250, productId: 51, unitPrice: 42.40, quantity: 35, discount: 0.15 },
  { orderId: 10250, productId: 65, unitPrice: 16.80, quantity: 15, discount: 0.15 },
  { orderId: 10251, productId: 22, unitPrice: 16.80, quantity: 6,  discount: 0.05 },
  { orderId: 10251, productId: 57, unitPrice: 15.60, quantity: 15, discount: 0.05 },
  { orderId: 10252, productId: 20, unitPrice: 64.80, quantity: 40, discount: 0.05 },
  { orderId: 10252, productId: 33, unitPrice: 2.00,  quantity: 25, discount: 0.05 },
  { orderId: 10253, productId: 31, unitPrice: 10.00, quantity: 20, discount: 0    },
  { orderId: 10253, productId: 39, unitPrice: 14.40, quantity: 42, discount: 0    },
  { orderId: 10254, productId: 24, unitPrice: 3.60,  quantity: 15, discount: 0.15 },
  { orderId: 10255, productId: 2,  unitPrice: 15.20, quantity: 20, discount: 0    },
  { orderId: 10255, productId: 3,  unitPrice: 7.70,  quantity: 35, discount: 0    },
  { orderId: 10256, productId: 53, unitPrice: 26.20, quantity: 15, discount: 0    },
  { orderId: 10257, productId: 27, unitPrice: 35.10, quantity: 25, discount: 0    },
  { orderId: 10258, productId: 2,  unitPrice: 15.20, quantity: 50, discount: 0.20 },
  { orderId: 10258, productId: 5,  unitPrice: 17.00, quantity: 65, discount: 0.20 },
  { orderId: 10259, productId: 21, unitPrice: 8.00,  quantity: 10, discount: 0    },
  { orderId: 10260, productId: 41, unitPrice: 7.70,  quantity: 16, discount: 0.25 },
  { orderId: 10260, productId: 57, unitPrice: 15.60, quantity: 50, discount: 0    },
];
