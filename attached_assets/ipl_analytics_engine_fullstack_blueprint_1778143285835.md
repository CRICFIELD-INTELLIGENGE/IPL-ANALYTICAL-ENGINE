# IPL Analytics Engine — Full Stack Replica Blueprint

## Tech Stack

### Frontend
- Next.js 15
- Tailwind CSS
- Framer Motion
- shadcn/ui
- Recharts
- Lucide Icons

### Backend
- Node.js + Express
- PostgreSQL
- Prisma ORM
- REST APIs

### Analytics
- Power BI embeds
- Tableau embeds

### Deployment
- Frontend → Vercel
- Backend → Render/Railway
- Database → Neon/Supabase

---

# Folder Structure

```bash
ipl-analytics-engine/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── styles/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── prisma/
│   ├── middleware/
│   └── server.js
│
└── datasets/
```

---

# FRONTEND SETUP

## Create Project

```bash
npx create-next-app@latest frontend
cd frontend
```

Install:

```bash
npm install tailwindcss framer-motion recharts lucide-react axios
```

---

# HOME PAGE LAYOUT

## app/page.tsx

```tsx
import Hero from '@/components/Hero'
import InsightsSection from '@/components/InsightsSection'
import StatsOverview from '@/components/StatsOverview'
import AskAI from '@/components/AskAI'
import ReportsSection from '@/components/ReportsSection'

export default function HomePage() {
  return (
    <main className="bg-black min-h-screen text-white">
      <Hero />
      <InsightsSection />
      <StatsOverview />
      <AskAI />
      <ReportsSection />
    </main>
  )
}
```

---

# HERO SECTION

## components/Hero.tsx

```tsx
'use client'

import { motion } from 'framer-motion'

export default function Hero() {
  return (
    <section className="grid lg:grid-cols-2 gap-8 p-10 items-center">
      <div>
        <h1 className="text-6xl font-bold leading-tight">
          IPL is not just cricket.
          <span className="text-yellow-400"> It’s a Product.</span>
        </h1>

        <p className="mt-6 text-zinc-400 text-lg">
          Sports. Product. Business. Growth. Strategy.
        </p>

        <button className="mt-8 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl">
          Explore Insights
        </button>
      </div>

      <div>
        <img
          src="/hero.png"
          className="rounded-3xl border border-zinc-800"
        />
      </div>
    </section>
  )
}
```

---

# INSIGHTS CARDS

## components/InsightsSection.tsx

```tsx
const insights = [
  {
    title: 'Why CSK Builds Better Teams',
    category: 'Business',
    image: '/csk.jpg'
  },
  {
    title: 'IPL Beats OTT Engagement',
    category: 'Product',
    image: '/ott.jpg'
  }
]

export default function InsightsSection() {
  return (
    <section className="px-10 mt-12">
      <div className="flex justify-between mb-6">
        <h2 className="text-3xl font-semibold">Latest Insights</h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {insights.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800"
          >
            <img src={item.image} className="h-44 w-full object-cover" />

            <div className="p-4">
              <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
                {item.category}
              </span>

              <h3 className="mt-3 text-lg font-medium">
                {item.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

# STATS OVERVIEW

## components/StatsOverview.tsx

```tsx
const stats = [
  {
    label: 'Total Matches',
    value: '1234'
  },
  {
    label: 'Total Runs',
    value: '345678'
  },
  {
    label: 'Average Score',
    value: '168'
  }
]

export default function StatsOverview() {
  return (
    <section className="px-10 mt-12">
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"
          >
            <p className="text-zinc-400">{stat.label}</p>
            <h2 className="text-4xl font-bold mt-2">{stat.value}</h2>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

# ASK IPL AI COMPONENT

## components/AskAI.tsx

```tsx
'use client'

import { useState } from 'react'
import axios from 'axios'

export default function AskAI() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  async function askAI() {
    const response = await axios.post(
      'http://localhost:5000/api/ask',
      {
        question
      }
    )

    setAnswer(response.data.answer)
  }

  return (
    <section className="px-10 mt-16">
      <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h2 className="text-3xl font-semibold">Ask IPL AI</h2>

        <div className="mt-6 flex gap-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Who performs best in death overs?"
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />

          <button
            onClick={askAI}
            className="bg-purple-600 px-6 rounded-xl"
          >
            Ask
          </button>
        </div>

        {answer && (
          <div className="mt-6 text-zinc-300">
            {answer}
          </div>
        )}
      </div>
    </section>
  )
}
```

---

# REPORTS SECTION

## components/ReportsSection.tsx

```tsx
const reports = [
  {
    title: 'IPL Analytics Engine Report',
    file: '/reports/ipl-report.pdf'
  },
  {
    title: 'IPL Product Economy',
    file: '/reports/product.pdf'
  }
]

export default function ReportsSection() {
  return (
    <section className="px-10 py-16">
      <h2 className="text-3xl font-semibold mb-8">Reports</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div
            key={index}
            className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800"
          >
            <h3 className="text-xl font-medium">{report.title}</h3>

            <a
              href={report.file}
              className="inline-block mt-4 bg-purple-600 px-5 py-2 rounded-lg"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

# BACKEND SETUP

## Initialize Backend

```bash
mkdir backend
cd backend
npm init -y
```

Install:

```bash
npm install express cors dotenv prisma @prisma/client
```

---

# server.js

```js
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.post('/api/ask', async (req, res) => {
  const { question } = req.body

  let answer = 'No insight available.'

  if (question.includes('death overs')) {
    answer = 'MS Dhoni and Andre Russell dominate death-over strike rates.'
  }

  if (question.includes('spin')) {
    answer = 'Chepauk remains one of the strongest spin-dominant venues.'
  }

  res.json({ answer })
})

app.listen(5000, () => {
  console.log('Server running on port 5000')
})
```

---

# DATABASE SCHEMA

## prisma/schema.prisma

```prisma
model Blog {
  id        Int      @id @default(autoincrement())
  title     String
  category  String
  image     String
  content   String
  createdAt DateTime @default(now())
}

model Report {
  id        Int      @id @default(autoincrement())
  title     String
  file      String
  createdAt DateTime @default(now())
}
```

---

# POWER BI EMBED

## app/dashboard/page.tsx

```tsx
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold mb-8">
        IPL Analytics Dashboard
      </h1>

      <iframe
        title="Power BI"
        width="100%"
        height="700"
        src="YOUR_POWERBI_EMBED_LINK"
        allowFullScreen
      />
    </div>
  )
}
```

---

# BLOG SYSTEM

## app/blogs/page.tsx

```tsx
async function getBlogs() {
  const response = await fetch('http://localhost:5000/api/blogs')
  return response.json()
}

export default async function BlogsPage() {
  const blogs = await getBlogs()

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold mb-10">Blogs</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog: any) => (
          <div
            key={blog.id}
            className="bg-zinc-900 rounded-2xl overflow-hidden"
          >
            <img src={blog.image} className="h-52 w-full object-cover" />

            <div className="p-5">
              <h2 className="text-xl font-semibold">{blog.title}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

# DATASETS YOU NEED

## Sports Layer
- IPL ball-by-ball dataset
- Match dataset
- Player salary CSV

## Product Layer
- YouTube engagement data
- Google Trends

## Business Layer
- Franchise valuations
- Sponsorship data

---

# DEPLOYMENT

## Frontend

```bash
vercel
```

## Backend
Deploy on:
- Railway
- Render

---

# FINAL ROADMAP

## WEEK 1
- Setup frontend
- Setup backend
- Setup datasets

## WEEK 2
- Build home page
- Add blog cards
- Add reports

## WEEK 3
- Build Power BI dashboards
- Embed dashboards

## WEEK 4
- Add AI answers
- Deploy

---

# RECOMMENDED NEXT FEATURES

- Match center
- Player pages
- Heatmaps
- AI-powered rec