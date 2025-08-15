const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'leo_imperial_sfax_secret_2024';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuration multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Données en mémoire (remplace localStorage)
let clubData = {
  visitors: [],
  members: [],
  memberOfMonth: null,
  recruitOfMonth: null,
  news: []
};

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes API
app.post('/api/contact', async (req, res) => {
  try {
    const { nom, prenom, email, message } = req.body;
    
    // Vérification du code secret
    if (message === 'leoimer123456789') {
      const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ redirect: '/admin', token });
    }

    const visitor = {
      id: Date.now(),
      nom,
      prenom,
      email,
      message,
      date: new Date().toISOString()
    };

    clubData.visitors.push(visitor);
    res.json({ success: true, message: 'Message envoyé avec succès!' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password === 'imper2526') {
      const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ error: 'Mot de passe incorrect' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/visitors', authenticateToken, (req, res) => {
  res.json(clubData.visitors);
});

app.get('/api/admin/members', authenticateToken, (req, res) => {
  res.json(clubData.members);
});

app.post('/api/admin/members', authenticateToken, (req, res) => {
  try {
    const member = {
      id: Date.now(),
      ...req.body,
      dateAjout: new Date().toISOString()
    };
    clubData.members.push(member);
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/member-of-month', authenticateToken, upload.single('photo'), (req, res) => {
  try {
    const { nom, prenom } = req.body;
    clubData.memberOfMonth = {
      nom,
      prenom,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      date: new Date().toISOString()
    };
    res.json({ success: true, data: clubData.memberOfMonth });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/admin/recruit-of-month', authenticateToken, upload.single('photo'), (req, res) => {
  try {
    const { nom, prenom } = req.body;
    clubData.recruitOfMonth = {
      nom,
      prenom,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      date: new Date().toISOString()
    };
    res.json({ success: true, data: clubData.recruitOfMonth });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/news', authenticateToken, (req, res) => {
  try {
    const news = {
      id: Date.now(),
      ...req.body,
      date: new Date().toISOString()
    };
    clubData.news.unshift(news);
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/admin/news/:id', authenticateToken, (req, res) => {
  try {
    const newsId = parseInt(req.params.id);
    clubData.news = clubData.news.filter(n => n.id !== newsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/public/data', (req, res) => {
  res.json({
    memberOfMonth: clubData.memberOfMonth,
    recruitOfMonth: clubData.recruitOfMonth,
    news: clubData.news,
    membersCount: clubData.members.length
  });
});

app.get('/api/admin/export-visitors', authenticateToken, (req, res) => {
  try {
    const csv = [
      'Nom,Prénom,Email,Message,Date',
      ...clubData.visitors.map(v => 
        `"${v.nom}","${v.prenom}","${v.email}","${v.message}","${new Date(v.date).toLocaleDateString()}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=visiteurs.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer le dossier uploads s'il n'existe pas
(async () => {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads');
  }
})();

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
// Remplacer la ligne actuelle app.use(cors())
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'], // Ajoutez votre URL de production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
