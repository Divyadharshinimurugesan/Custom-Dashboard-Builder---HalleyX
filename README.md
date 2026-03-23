# Custom Dashboard Builder

A full-stack MERN application for managing customer orders and building custom analytics dashboards with drag-and-drop widgets.

---

## Project Description

Custom Dashboard Builder is a business analytics platform that allows users to:
- Manage customer orders (create, edit, delete, search)
- Build custom dashboards with configurable widgets
- Visualize data through charts, KPIs, and tables
- Export reports as CSV or PDF
- Filter data by time period (Today, Last 7 Days, Last 30 Days, All Time)

---

## Demo Video
  
The uploaded video file has been compressed to meet the required file size limit, so the visual quality may be slightly reduced. 
For this reason, I have provided the project demo video through the Google Drive link below.

Kindly refer to the link below for the project demonstration.

**Google Drive Video Link:** https://drive.google.com/file/d/1m9nP06XiszBq6JiuwmjB-1ybW79rEs1R/view?usp=sharing

---

## Features

- **Dashboard Builder** — Drag, drop, and resize widgets on a 12-column responsive grid
- **7 Widget Types** — KPI cards, Bar, Line, Area, Scatter charts, Pie chart, Data table
- **KPI % Change** — Shows percentage change vs previous period (e.g. +8.0% vs prev period)
- **Smart Insights** — Auto-generated insights from real order data
- **Orders Management** — Full CRUD with search, sort, filter, and pagination
- **Real-time Search** — Instant client-side search with text highlighting
- **Date Filtering** — All components (KPIs, charts, table) use the same filtered dataset
- **Export** — CSV and PDF export of filtered data
- **Undo Delete** — 5-second undo window on order deletion
- **Authentication** — Email + password login with localStorage session
- **Responsive UI** — 12-col desktop, 8-col tablet, 4-col mobile grid
- **Performance** — useMemo/useCallback throughout; no unnecessary re-renders
- **Input Focus Fix** — Widget settings panel inputs maintain focus correctly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS |
| Charts | Recharts |
| Drag & Drop | react-grid-layout |
| HTTP Client | Axios |
| PDF Export | jsPDF |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Dev Tools | nodemon, dotenv |

---

## How to Run

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017

### 1. Clone the repository
```bash
git clone <repo-url>
cd dashboard-app
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/dashboard-build
NODE_ENV=development
JWT_SECRET=orderflow_super_secret_jwt_key_2025
JWT_EXPIRE=7d
```

Start backend:
```bash
npm run dev
```
Backend runs on **http://localhost:5001**

### 3. Frontend setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on **http://localhost:3000**

### 4. Login
- Email: `admin@orderflow.com`
- Password: `ad_12@34`

---

## Seed Data (For Testing)(If Needed)

Populate the database with 50 sample orders:
```bash
cd backend
node seed.js
```

> Seed data is for testing/demo only. The dashboard starts empty — configure widgets manually after seeding.

---

## Folder Structure

```
dashboard-app/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── utils/           # Date filter helper
│   ├── seed.js          # Sample data script
│   └── server.js        # Express entry point
│
└── frontend/
    ├── public/          # index.html
    └── src/
        ├── components/  # Layout, OrderModal, UndoToast
        ├── pages/       # Dashboard, Configure, Orders, Login
        ├── services/    # Axios API calls
        ├── utils/       # helpers, export, format
        └── widgets/     # KPIWidget, ChartWidget
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders` | List orders (search, filter, sort, paginate) |
| POST | `/api/orders` | Create new order |
| PUT | `/api/orders/:id` | Update order |
| DELETE | `/api/orders/:id` | Delete order |
| GET | `/api/analytics` | Get analytics data (with date range filter) |
| GET | `/api/dashboard` | Get saved dashboard config |
| POST | `/api/dashboard` | Save dashboard config |

---

## Database Structure

### Collection: `orders`

```json
{
  "firstName":     "String",
  "lastName":      "String",
  "email":         "String",
  "phone":         "String",
  "streetAddress": "String",
  "city":          "String",
  "state":         "String",
  "postalCode":    "String",
  "country":       "String",
  "product":       "String",
  "quantity":      "Number",
  "unitPrice":     "Number",
  "totalAmount":   "Number (auto: quantity × unitPrice)",
  "status":        "Pending | In progress | Completed",
  "createdBy":     "String",
  "createdAt":     "Date",
  "updatedAt":     "Date"
}
```

### Collection: `dashboards`

```json
{
  "userId":  "String",
  "name":    "String",
  "widgets": [
    {
      "id":          "String",
      "type":        "kpi | bar | line | area | pie | scatter | table",
      "title":       "String",
      "description": "String",
      "width":       "Number",
      "height":      "Number",
      "config": {
        "xAxis":       "String",
        "yAxis":       "String",
        "metric":      "String",
        "aggregation": "String",
        "columns":     ["String"],
        "color":       "String"
      },
      "layout": { "x": "Number", "y": "Number", "w": "Number", "h": "Number" }
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## Key Functionalities

### Order Creation
- Full form validation (email, 10-digit phone, required fields)
- `totalAmount` auto-calculated = `quantity × unitPrice`
- Phone stored as string (no scientific notation in Excel export)

### Dashboard Configuration
- Choose from 4 templates (Sales, Orders, Product, Blank)
- Add widgets from left panel — placed at top of canvas
- Drag to rearrange, resize from corner handle
- Configure each widget (metric, axes, color, columns, etc.)
- Save configuration to MongoDB

### Widget Rendering
- All widgets share a single `filteredOrders` dataset (useMemo)
- Date filter applies to KPIs, all charts, table, and exports simultaneously
- Empty state shown when no data for selected period

### Data Filtering
- Client-side filtering for instant response
- `getFilteredOrders(orders, range)` — single function used everywhere
- Consistent data across KPIs, charts, table, CSV, and PDF

---

## Widget Size Defaults

| Widget Type | Width (cols) | Height (rows) |
|---|---|---|
| KPI Card | 2 | 2 |
| Bar, Line, Area, Scatter | 5 | 5 |
| Pie Chart | 4 | 4 |
| Table | 4 | 4 |

Grid: Desktop = 12 cols · Tablet = 8 cols · Mobile = 4 cols

---

## Additional Improvements
- Smart Insights Panel
Automatically analyzes order data and displays key insights such as top-selling products, highest revenue day, and most frequent customers. This helps users quickly understand business performance without manual analysis.
- Real-Time Search & Filtering
Provides instant search across customer name, email, product, and phone number with dynamic filtering. Results update in real-time without page reload, improving usability and efficiency.
- KPI Percentage Comparison
KPI cards display not only current values but also percentage change compared to the previous period (e.g., +8%). This enables users to easily track growth trends and performance changes.
