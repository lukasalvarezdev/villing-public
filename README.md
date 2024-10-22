# Villing dashboard

## Overview

This repository contains the source code for the dasboard of Villing developed
using React, Remix, TypeScript, PosgreSQL, Express and deployed on Digital Ocean.

## Prerequisites

- Node.js and npm installed
- PostgreSQL installed

## Getting Started

1. Clone the repository.
2. Copy `.env.example` into `.env`.
3. Run `npm run setup` to install dependencies and run validation.
4. Run the application: `npm run dev`.
5. Access Villing in your browser at `http://localhost:3000`.

If the setup script doesn't work, run each command manually:

```shell
# copy the .env.example to .env
cp .env.example .env

# Install dependencies
npm install

# setup database
prisma migrate reset --force

# run build, typecheck, linting
npm run validate
```

If all that worked without trouble, start the development server with:

```
npm run dev
```

Open up `http://localhost:3000` and rock!
