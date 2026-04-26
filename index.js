const express = require('express')
const session = require('express-session')
const axios   = require('axios')
const path    = require('path')
const app     = express()

const CLIENT_ID     = process.env.CLIENT_ID     || 'TON_CLIENT_ID'
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'TON_CLIENT_SECRET'
const REDIRECT_URI  = process.env.REDIRECT_URI  || 'http://localhost:3000/auth/callback'
const PORT          = process.env.PORT          || 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
  secret: 'secret06joiner',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}))

// Base de données en mémoire (leaderboard)
const leaderboard = [
  { username: 'mizano',   avatar: null, score: 4820, joins: 142, rank: 1 },
  { username: 'xXFarmerXx', avatar: null, score: 3210, joins: 98,  rank: 2 },
  { username: 'shadow06',  avatar: null, score: 2890, joins: 87,  rank: 3 },
  { username: 'brainrot_king', avatar: null, score: 1940, joins: 61, rank: 4 },
  { username: 'ezfarmer',  avatar: null, score: 1200, joins: 44,  rank: 5 },
]

// Auth Discord
app.get('/auth/login', (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`
  res.redirect(url)
})

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect('/?error=no_code')
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    const token = tokenRes.data.access_token
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const u = userRes.data
    req.session.user = {
      id:       u.id,
      username: u.username,
      avatar:   u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`,
      tag:      u.discriminator !== '0' ? `${u.username}#${u.discriminator}` : u.username,
    }
    res.redirect('/')
  } catch(e) {
    console.error(e.response?.data || e.message)
    res.redirect('/?error=auth_failed')
  }
})

app.get('/auth/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

// API
app.get('/api/me', (req, res) => {
  res.json(req.session.user || null)
})

app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboard)
})

app.get('/api/plans', (req, res) => {
  res.json([
    {
      id: 'premium', name: 'Premium', price: '$8/h',
      slots: 6, slotsUsed: 6, maxGen: '999B',
      desc: 'Maximum $/s this plan can notify for.',
      featured: true, full: true,
    },
    {
      id: 'farmer', name: 'Farmer', price: '$4/h',
      slots: 3, slotsUsed: 3, maxGen: '199M',
      desc: 'Used for brainrots without a specific cap below.',
      featured: false, full: true,
      brainrots: [
        { name: 'Bacuru And Egguru',    cap: null },
        { name: 'Burguro And Fryuro',   cap: '150M' },
        { name: 'Chicleteira Noelteira',cap: '400M' },
        { name: 'Chillin Chili',        cap: '500M' },
        { name: 'Tralalero Tralala',    cap: '300M' },
        { name: 'Bombardiro Crocodilo', cap: '250M' },
        { name: 'Brr Brr Patapim',      cap: '200M' },
        { name: 'Tung Tung Sahur',      cap: '350M' },
      ]
    },
    {
      id: 'bid', name: 'Bid', price: '$7.00/hr',
      slots: 1, slotsUsed: 1, maxGen: '999B',
      desc: 'Max $/s this tier can notify for.',
      featured: false, full: true, isBid: true,
      nextSlot: '1h 52m', lastSale: '$17.00', lastSaleHr: '$8.50/hr',
      heldBy: 'mizano', minBid: '$7.00/hr', watching: 3,
    }
  ])
})

// Toutes les routes → index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(PORT, () => console.log(`06Joiner running on port ${PORT}`))
