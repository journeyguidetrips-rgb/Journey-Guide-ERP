# Journey Guide ERP System

A comprehensive, scalable ERP system designed for travel agencies. Built with modern technologies to manage itineraries, payments, creative assets (watermarking, placards), and centralized file logging.

## 🎯 Features

### 1. **Payment & Receipt Management**
- Client and vendor payment tracking
- Automated receipt generation (MS Word → PDF)
- Payment history and reports
- Multi-currency support (future)

### 2. **Itinerary Designer**
- Convert vendor quotes to formatted itineraries
- Markdown editor for easy customization
- Automated HTML → PDF conversion
- Smart formatting (remove codes, rates, unwanted sections)
- Auto-logging and archiving

### 3. **Watermark Tool**
- Instagram-ready flyer design (1080 x 1350px)
- Multi-position logo placement (corners)
- Dynamic logo sizing and repositioning
- Export as PNG/JPG with watermarks

### 4. **Airport Placard Generator**
- Create personalized airport placards
- Passenger name, flight details, custom messages
- A4 landscape PDF export
- Print-ready formatting

### 5. **Unified Log & File Management**
- Automatic file organization by date
- Year → Month → Day → Client folder structure
- Search and retrieve archived files
- Auto-archiving on end-of-day

### 6. **Dashboard & Analytics**
- Real-time business metrics
- Payment status overview
- Recent activity tracking
- Quick access to all tools

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Browser (React)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │Dashboard │ Payments │ Itineraries │ Watermark │...   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ (HTTPS API)
┌──────────────────────▼──────────────────────────────────────┐
│                   Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes │ Controllers │ Services │ File Processing    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼───┐     ┌───▼────┐    ┌───▼──────┐
    │  DB   │     │  File  │    │ Log Mgmt │
    │(Postgres)   │Storage │    │(Auto-org)│
    └───────┘     └────────┘    └──────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Lightning fast build tool
- **TailwindCSS** - Utility-first CSS
- **React Router** - Navigation
- **Zustand** - State management
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Node.js** with Express.js
- **TypeScript** - Type safety
- **PostgreSQL** - Primary database
- **Multer** - File uploads
- **Sharp** - Image processing
- **UUID** - Unique identifiers
- **CORS** - Cross-origin support

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **PostgreSQL** - Database container

## 📦 Project Structure

```
Journey-Guide-ERP/
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── database/
│   │   │   └── connection.ts    # PostgreSQL pool
│   │   ├── routes/              # API routes
│   │   ├── controllers/         # Business logic
│   │   ├── services/            # Business services
│   │   ├── middleware/          # Express middleware
│   │   ├── utils/               # Utilities
│   │   └── types/               # TypeScript types
│   ├── .env.example
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                     # React + TypeScript + Vite
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Root component
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API calls
│   │   ├── stores/             # Zustand stores
│   │   ├── types/              # TypeScript types
│   │   └── styles/             # Global styles
│   ├── .env.example
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── package.json
│   ├── index.html
│   └── Dockerfile
│
├── docker-compose.yml           # Container orchestration
├── .gitignore
├── README.md                    # This file
└── ARCHITECTURE.md              # Detailed architecture docs
```

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/journeyguidetrips-rgb/Journey-Guide-ERP.git
cd Journey-Guide-ERP

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Database: localhost:5432
```

### Option 2: Local Development (Without Docker)

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your local database credentials
# DATABASE_URL=postgres://user:password@localhost:5432/travel_erp

npm run dev  # Runs on http://localhost:5000
```

#### Frontend Setup (New Terminal)
```bash
cd frontend
npm install
cp .env.example .env

npm run dev  # Runs on http://localhost:5173
```

## 🔧 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/travel_erp
JWT_SECRET=your-secret-key-here
FILE_UPLOAD_DIR=./uploads
LOG_DIR=./logs
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 📚 API Documentation

Base URL: `http://localhost:5000/api`

### Health Check
```
GET /health
```

### Payments
```
POST   /payments              # Create payment
GET    /payments              # List all payments
GET    /payments/:id          # Get payment details
PUT    /payments/:id          # Update payment
DELETE /payments/:id          # Delete payment
POST   /payments/:id/receipt  # Generate receipt
```

### Itineraries
```
POST   /itineraries           # Create itinerary
GET    /itineraries           # List all itineraries
GET    /itineraries/:id       # Get itinerary
PUT    /itineraries/:id       # Update itinerary
POST   /itineraries/:id/pdf   # Generate PDF
```

### Files & Logs
```
GET    /files/logs            # Get organized logs
GET    /files/logs/:date      # Get files for specific date
POST   /files/archive         # Archive files
```

## 🗄️ Database Schema (Coming Soon)

The database will include these main tables:
- `users` - System users and admin
- `clients` - Travel clients
- `vendors` - Travel vendors (hotels, flights, etc.)
- `payments` - Payment tracking
- `itineraries` - Trip itineraries
- `receipts` - Generated receipts
- `files_log` - File archiving and organization

Migration scripts coming in Phase 2.

## 🎨 Frontend Pages

- **Dashboard** - Overview and statistics
- **Payments** - Payment management and receipt generation
- **Itineraries** - Itinerary designer and management
- **Watermark Tool** - Flyer watermarking
- **Placard Generator** - Airport placard creation
- **Logs** - File organization and retrieval

## 🔐 Security Features (To Implement)

- JWT-based authentication
- Role-based access control (RBAC)
- Encrypted sensitive data
- CORS configuration
- Input validation and sanitization
- Rate limiting
- SQL injection prevention

## 📝 Development Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Project setup and scaffolding
- [x] Docker configuration
- [ ] Database schema and migrations

### Phase 2: Payment Module
- [ ] Payment API endpoints
- [ ] Receipt generation logic
- [ ] Payment UI components

### Phase 3: Itinerary Module
- [ ] File upload handler
- [ ] Markdown editor integration
- [ ] PDF conversion pipeline

### Phase 4: Creative Tools
- [ ] Watermark tool implementation
- [ ] Placard generator

### Phase 5: Logging System
- [ ] Auto-archiving logic
- [ ] File organization system
- [ ] Search functionality

### Phase 6: Deployment
- [ ] AWS/Azure deployment
- [ ] CI/CD pipeline
- [ ] Production optimization

## 🚢 Deployment

### Deploying to AWS
```bash
# Docker image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker build -t journey-guide-erp .
docker tag journey-guide-erp:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/journey-guide-erp:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/journey-guide-erp:latest
```

### Deploying to Azure
```bash
# Similar process with Azure Container Registry (ACR)
az acr login --name your-registry-name
docker build -t journey-guide-erp .
docker tag journey-guide-erp your-registry-name.azurecr.io/journey-guide-erp:latest
docker push your-registry-name.azurecr.io/journey-guide-erp:latest
```

## 📞 Support & Contribution

For issues, feature requests, or contributions, please create an issue or pull request.

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for small travel businesses**