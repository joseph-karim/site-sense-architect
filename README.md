# Site Sense Architect
Overview
SiteSense Architect is an interactive tool that helps users analyze residential properties in Austin, TX and receive AI-recommended floor plans based on site-specific zoning regulations and environmental characteristics. This tool bridges the gap between site selection and architectural design, providing valuable insights for property owners, developers, and architects.
Features

Interactive Map Interface: Select any residential address in Austin through a Mapbox-powered map
Comprehensive Property Analysis: Instantly view zoning constraints, environmental factors, and building potential
AI-Recommended Floor Plans: See floor plan designs specifically tailored to the selected property
Conversational AI Assistant: Ask questions about the property through text or voice interface
Environmental Considerations: Analysis includes slope, flood risk, and solar orientation

Tech Stack

Frontend: React.js
Backend: FastAPI (Python)
Database: Structured JSON files
Deployment: Vercel (frontend and serverless functions)
External Services:

Mapbox GL JS (mapping and geocoding)
OpenAI API (AI analysis and chat)
Vapi (voice interface)



Installation
Prerequisites

Node.js (v14+)
Python (v3.9+)
Mapbox API key
OpenAI API key
Vapi API key

Setup

Clone the repository

bashCopygit clone https://github.com/yourusername/sitesense-architect.git
cd sitesense-architect

Set up the backend

bashCopycd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

Configure environment variables

Create a .env file in the backend directory:
CopyOPENAI_API_KEY=your_openai_api_key_here
MAPBOX_TOKEN=your_mapbox_token_here
FRONTEND_URL=http://localhost:3000

Set up the frontend

bashCopycd ../frontend
npm install
Create a .env file in the frontend directory:
CopyNEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
OPENAI_API_KEY=your_openai_api_key_here

Start the development servers

In one terminal (backend):
bashCopycd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload
In another terminal (frontend):
bashCopycd frontend
npm run dev

Open your browser and navigate to http://localhost:3000

Data Sources
SiteSense Architect uses several data sources:

Zoning Data: Derived from Austin's Land Development Code
Floor Plans: Processed from the CubiCasa5k dataset
Environmental Data: Elevation, flood zones, and solar orientation calculations

Adding Custom Floor Plans
To add your own floor plans to the database:

Place floor plan images in the data/floor_plans directory
Add entries to data/floor_plans.json with the following format:

jsonCopy{
  "id": "plan_00001",
  "name": "Modern Ranch Home",
  "square_footage": 2200,
  "num_floors": 1,
  "bedrooms": 3,
  "bathrooms": 2,
  "lot_width": 60,
  "lot_depth": 100,
  "suitable_zones": ["SF-3", "SF-4", "SF-5"],
  "image_url": "/floor_plans/plan_00001.jpg"
}
Usage

Property Selection

Enter an address in the search bar or browse the map to select a property
The tool will automatically geocode the address and retrieve property data


View Analysis

See zoning information, including setbacks, height limits, and lot coverage
Review environmental factors like slope, flood risk, and solar orientation
Understand key constraints and opportunities for development


Explore Floor Plans

Browse AI-recommended floor plans that match the property's constraints
View compatibility scores and specific matching factors
Click on plans to see more detailed information


Ask Questions

Use the AI assistant to ask specific questions about the property
Get guidance on zoning regulations, variance possibilities, and design considerations
Toggle between text and voice interaction modes



Application Structure
Copysitesense-architect/
├── frontend/                # React frontend
│   ├── public/              # Static assets
│   ├── src/                 # React source code
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── styles/          # CSS styles
│   │   └── utils/           # Utility functions
│   ├── package.json         # Frontend dependencies
│   └── .env                 # Frontend environment variables
├── backend/                 # FastAPI backend
│   ├── main.py              # Main application file
│   ├── routers/             # API route handlers
│   ├── models/              # Data models
│   ├── services/            # Business logic services
│   ├── requirements.txt     # Backend dependencies
│   └── .env                 # Backend environment variables
├── data/                    # Data files
│   ├── zoning_regulations.json  # Austin zoning data
│   ├── floor_plans.json     # Floor plan database
│   └── floor_plans/         # Floor plan images
└── README.md                # Project documentation
API Endpoints
The backend exposes the following API endpoints:

GET /api/site-info/{address} - Retrieve comprehensive property analysis
POST /api/chat - Interact with the AI assistant
GET /api/floor-plans - List all available floor plans
GET /api/floor-plans/{id} - Get details for a specific floor plan

Development
Adding New Zoning Codes
To add support for additional zoning codes:

Update data/zoning_regulations.json with the new zone information
Add parsing logic in backend/services/zoning_service.py if needed
Update the floor plan matching algorithm to consider the new zone

Extending to New Cities
To extend the tool to support additional cities:

Gather zoning data for the target city
Create a new city-specific zoning data file
Add city detection in the address geocoding process
Implement city-specific environmental factor calculations
Update the frontend to allow city selection

Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

License
This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgments

CubiCasa5k Dataset - For providing the base floor plan data
City of Austin - For making zoning and planning data accessible
Mapbox - For their excellent mapping platform
OpenAI - For powering the conversational AI features
Vapi - For enabling voice interface capabilities

