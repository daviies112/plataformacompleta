# EnvioFácil - Shipping Quote & Tracking App

## Overview
EnvioFácil is a Brazilian shipping logistics application that allows users to compare shipping prices across multiple carriers, track packages, and manage shipments.

## Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack React Query
- **Routing**: React Router DOM v6

## Project Structure
```
src/
├── components/     # Reusable UI components
│   ├── ui/         # shadcn/ui components
│   └── Header.tsx  # Main navigation header
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── pages/          # Page components
│   ├── Cotacao.tsx      # Shipping quote calculator
│   ├── Rastreamento.tsx # Package tracking
│   ├── Envios.tsx       # Shipment management
│   └── NotFound.tsx     # 404 page
├── App.tsx         # Main app with routing
└── main.tsx        # Entry point
```

## Available Pages
- `/` - Cotação (Quote): Compare shipping prices and delivery times from multiple carriers
- `/rastreamento` - Rastreamento (Tracking): Track packages by tracking code
- `/envios` - Meus Envios (My Shipments): Manage and view all shipments

## Development
The app runs on port 5000 with Vite dev server.

## Recent Changes
- 2026-01-17: Migrated from Lovable to Replit environment
  - Removed Supabase integration (empty database schema)
  - Updated Vite config for Replit compatibility (port 5000, allowedHosts)
  - Removed lovable-tagger dependency

## Notes
- Currently uses mock data for demonstration
- UI is in Portuguese (Brazilian)
