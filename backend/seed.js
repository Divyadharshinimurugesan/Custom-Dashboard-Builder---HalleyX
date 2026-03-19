require('dotenv').config();
const mongoose = require('mongoose');
const Order    = require('./models/Order');

const PRODUCTS = [
  'Fiber Internet 300 Mbps', '5G Unlimited Mobile Plan', 'Fiber Internet 1 Gbps',
  'Business Internet 500 Mbps', 'VoIP Corporate Package'
];
const STATUSES  = ['Pending', 'In progress', 'Completed'];
const CREATED_BY = ['Mr. Michael Harris', 'Mr. Ryan Cooper', 'Ms. Olivia Carter', 'Mr. Lucas Martin'];
const FIRST = ['Divya','Ananya','Priya','Ravi','Karthik','Meera','Arun','Sneha','Vijay','Lakshmi','Arjun','Deepa','Suresh','Nithya','Rahul'];
const LAST  = ['Sharma','Patel','Kumar','Iyer','Nair','Reddy','Singh','Mehta','Joshi','Bose','Pillai','Rao','Verma','Gupta','Das'];
const CITIES  = ['Chennai','Bangalore','Mumbai','Delhi','Hyderabad','Pune','Kolkata','Kochi'];
const STATES  = ['Tamil Nadu','Karnataka','Maharashtra','Delhi','Telangana','Maharashtra','West Bengal','Kerala'];
const STREETS = ['MG Road','Anna Salai','Brigade Road','Park Street','Linking Road','Jubilee Hills','MG Marg'];

const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
const randNum = (mn, mx) => Math.floor(Math.random() * (mx - mn + 1)) + mn;
const genDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(randNum(8,20), randNum(0,59)); return d; };

const orders = [];
for (let i = 0; i < 50; i++) {
  const fn = rand(FIRST), ln = rand(LAST);
  const cityIdx  = randNum(0, CITIES.length - 1);
  const product  = rand(PRODUCTS);
  const quantity = randNum(1, 10);
  const unitPrice = [299, 399, 499, 599, 749, 899][randNum(0, 5)];
  const daysAgo  = randNum(0, 89);
  const date     = genDate(daysAgo);
  orders.push({
    firstName: fn, lastName: ln,
    email:    `${fn.toLowerCase()}.${ln.toLowerCase()}${randNum(1,99)}@email.com`,
    phone:    `${randNum(7000000000, 9999999999)}`,   // 10-digit string
    streetAddress: `${randNum(1,999)} ${rand(STREETS)}`,
    city:      CITIES[cityIdx],
    state:     STATES[cityIdx],
    postalCode: String(randNum(400001, 641099)),
    country:   'India',
    product, quantity, unitPrice,
    totalAmount: quantity * unitPrice,
    status:    i < 8 ? 'Pending' : rand(STATUSES),
    createdBy: rand(CREATED_BY),
    createdAt: date, updatedAt: date
  });
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', process.env.MONGO_URI);

  await Order.deleteMany({});
  console.log('Cleared existing orders');

  await Order.collection.insertMany(orders);
  console.log(`✅ Inserted ${orders.length} orders into dashboard-build.orders`);

  await mongoose.disconnect();
  console.log('\n🎉 Seed complete!');
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
