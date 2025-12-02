require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { WebSocketServer } = require('ws');
const http = require('http');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_EMAIL = 'altaycevik@gmail.com';

if (!GEMINI_API_KEY) {
  console.error('❌ ERREUR : GEMINI_API_KEY manquante');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const PRIMARY_MODEL = 'gemini-2.0-flash-exp';

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({
  users: [],
  history: [],
  dailyUsage: {},
  subscriptions: []
}).write();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DOCTORS = {
  general: {
    id: 'general',
    name: 'Dr. Adam',
    specialty: 'Médecine Générale & Régulation',
    experience: '25 ans',
    avatar: '👨‍⚕️',
    bio: 'Diplômé de la Faculté de Médecine de Paris (1999). Spécialiste en médecine d\'urgence et triage.',
    keywords: ['triage', 'urgence', 'orientation', 'premiers soins']
  },
  cardio: {
    id: 'cardio',
    name: 'Dr. Kenza',
    specialty: 'Cardiologie',
    experience: '22 ans',
    avatar: '❤️',
    bio: 'Cardiologue interventionnelle, CHU de Lyon (2002).',
    keywords: ['cœur', 'cardiaque', 'palpitation', 'essoufflement', 'douleur thoracique', 'tension', 'hypertension', 'coeur', 'poitrine']
  },
  psy: {
    id: 'psy',
    name: 'Dr. Sam',
    specialty: 'Psychiatrie & Psychologie',
    experience: '20 ans',
    avatar: '🧠',
    bio: 'Psychiatre et psychothérapeute, Université de Bordeaux (2004).',
    keywords: ['anxiété', 'stress', 'dépression', 'sommeil', 'insomnie', 'angoisse', 'mental', 'psychologique', 'burnout', 'tristesse']
  },
  pediatrie: {
    id: 'pediatrie',
    name: 'Dr. Léo',
    specialty: 'Pédiatrie',
    experience: '24 ans',
    avatar: '👶',
    bio: 'Pédiatre hospitalier, CHU de Lille (2000).',
    keywords: ['enfant', 'bébé', 'nourrisson', 'adolescent', 'vaccination', 'croissance', 'fièvre enfant', 'pédiatre']
  },
  dermato: {
    id: 'dermato',
    name: 'Dr. Léa',
    specialty: 'Dermatologie',
    experience: '21 ans',
    avatar: '🔬',
    bio: 'Dermatologue, Hôpital Saint-Louis Paris (2003).',
    keywords: ['peau', 'bouton', 'acné', 'démangeaison', 'rougeur', 'grain de beauté', 'eczéma', 'psoriasis', 'cutané']
  },
  nutrition: {
    id: 'nutrition',
    name: 'Dr. Hugo',
    specialty: 'Nutrition & Diététique',
    experience: '20 ans',
    avatar: '🥗',
    bio: 'Médecin nutritionniste, Institut Pasteur (2004).',
    keywords: ['poids', 'régime', 'alimentation', 'diabète', 'cholestérol', 'obésité', 'nutrition', 'maigrir', 'grossir']
  },
  pneumo: {
    id: 'pneumo',
    name: 'Dr. Anis',
    specialty: 'Pneumologie',
    experience: '23 ans',
    avatar: '🫁',
    bio: 'Pneumologue, CHU de Toulouse (2001).',
    keywords: ['respiration', 'asthme', 'toux', 'poumon', 'essoufflement', 'bronchite', 'allergies respiratoires', 'respirer']
  },
  ophtalmo: {
    id: 'ophtalmo',
    name: 'Dr. Iris',
    specialty: 'Ophtalmologie',
    experience: '22 ans',
    avatar: '👁️',
    bio: 'Ophtalmologue, Hôpital des Quinze-Vingts Paris (2002).',
    keywords: ['œil', 'yeux', 'vision', 'vue', 'flou', 'lunettes', 'fatigue oculaire', 'conjonctivite', 'oeil']
  },
  neuro: {
    id: 'neuro',
    name: 'Dr. Alex',
    specialty: 'Neurologie',
    experience: '21 ans',
    avatar: '🧬',
    bio: 'Neurologue, CHU de Strasbourg (2003).',
    keywords: ['migraine', 'maux de tête', 'vertige', 'mémoire', 'tremblements', 'épilepsie', 'neurologique', 'cerveau', 'mal de tete', 'tete', 'mal de tête', 'nausé', 'nausée']
  },
  rhumato: {
    id: 'rhumato',
    name: 'Dr. Mathis',
    specialty: 'Rhumatologie',
    experience: '24 ans',
    avatar: '🦴',
    bio: 'Rhumatologue, Hôpital Cochin Paris (2000).',
    keywords: ['articulation', 'douleur', 'arthrose', 'dos', 'genou', 'rhumatisme', 'tendinite', 'mal de dos']
  },
  gyneco: {
    id: 'gyneco',
    name: 'Dr. Nora',
    specialty: 'Gynécologie & Obstétrique',
    experience: '23 ans',
    avatar: '🤰',
    bio: 'Gynécologue-obstétricienne, Maternité Port-Royal Paris (2001).',
    keywords: ['grossesse', 'menstruation', 'règles', 'contraception', 'enceinte', 'cycle', 'gynécologique', 'femme']
  },
  endocrino: {
    id: 'endocrino',
    name: 'Dr. Clara',
    specialty: 'Endocrinologie',
    experience: '20 ans',
    avatar: '🔬',
    bio: 'Endocrinologue-diabétologue, CHU de Nantes (2004).',
    keywords: ['thyroïde', 'hormone', 'diabète', 'fatigue chronique', 'prise poids inexpliquée', 'ménopause', 'thyroide']
  },
  allergo: {
    id: 'allergo',
    name: 'Dr. Inès',
    specialty: 'Allergologie',
    experience: '21 ans',
    avatar: '🤧',
    bio: 'Allergologue, Hôpital Tenon Paris (2003).',
    keywords: ['allergie', 'éternuement', 'nez bouché', 'urticaire', 'intolérance alimentaire', 'rhinite', 'allergique', 'ethernue', 'nez']
  },
  gastro: {
    id: 'gastro',
    name: 'Dr. Elias',
    specialty: 'Gastro-entérologie',
    experience: '22 ans',
    avatar: '🩺',
    bio: 'Gastro-entérologue, CHU de Marseille (2002).',
    keywords: ['estomac', 'digestion', 'douleur abdominale', 'diarrhée', 'constipation', 'reflux', 'intestin', 'ventre']
  }
};

const PLANS = {
  free: { name: 'Gratuit', dailyLimit: 5, specialists: ['general'], features: [] },
  student: {
    name: 'Étudiant',
    price: 19.99,
    dailyLimit: 50,
    specialists: ['general', 'psy', 'dermato'],
    features: ['Dr. Adam illimité', 'Accès 3 spécialistes', 'Export PDF']
  },
  individual: {
    name: 'Individuel',
    price: 29.99,
    dailyLimit: 999,
    specialists: Object.keys(DOCTORS),
    features: ['Tous les spécialistes', 'Historique sécurisé', 'Export PDF', 'Analyse images']
  },
  family: {
    name: 'Famille',
    price: 49.99,
    dailyLimit: 999,
    specialists: Object.keys(DOCTORS),
    features: ['Jusqu\'à 5 profils', 'Module Pédiatrie', 'Toutes fonctionnalités']
  },
  enterprise: {
    name: 'Entreprise',
    price: null,
    dailyLimit: 99999,
    specialists: Object.keys(DOCTORS),
    features: ['Santé préventive', 'Dashboard RH', 'Support dédié']
  },
  admin: {
    name: 'Admin',
    price: 0,
    dailyLimit: 99999,
    specialists: Object.keys(DOCTORS),
    features: ['Accès illimité', 'Toutes fonctionnalités', 'Test tous plans']
  }
};

function getUserPlan(email) {
  if (email === ADMIN_EMAIL) return 'admin';
  const user = db.get('users').find({ email }).value();
  return user?.subscription || 'free';
}

function checkSubscriptionAccess(email, specialist) {
  const plan = getUserPlan(email);
  const allowedSpecialists = PLANS[plan]?.specialists || ['general'];
  return allowedSpecialists.includes(specialist);
}

function checkDailyQuota(email) {
  const plan = getUserPlan(email);
  const limit = PLANS[plan]?.dailyLimit || 5;

  if (email === ADMIN_EMAIL) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  const today = new Date().toISOString().split('T')[0];
  let usage = db.get('dailyUsage').find({ email, date: today }).value();

  if (!usage) {
    usage = { email, date: today, count: 0 };
    db.get('dailyUsage').push(usage).write();
  }

  if (usage.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  return { allowed: true, remaining: limit - usage.count, limit };
}

function incrementUsage(email) {
  const today = new Date().toISOString().split('T')[0];
  db.get('dailyUsage')
    .find({ email, date: today })
    .update('count', n => n + 1)
    .write();
}

let requestCount = 0;
let requestWindow = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - requestWindow > 60000) {
    requestCount = 0;
    requestWindow = now;
  }
  if (requestCount >= 15) return false;
  requestCount++;
  return true;
}

function detectSpecialist(message) {
  const msgLower = message.toLowerCase();

  for (const [id, doctor] of Object.entries(DOCTORS)) {
    if (id === 'general') continue;

    for (const keyword of doctor.keywords) {
      if (msgLower.includes(keyword.toLowerCase())) {
        return id;
      }
    }
  }

  return 'general';
}

// ========== WEBSOCKET POUR VISIO ==========
wss.on('connection', (ws) => {
  console.log('🎥 Nouvelle connexion visio');

  let sessionData = {
    email: null,
    currentSpecialist: 'general',
    conversationHistory: [],
    lastAnalysisTime: 0,
    lastVideoAnalysisTime: 0
  };

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'start':
          sessionData.email = message.email;
          sessionData.currentSpecialist = 'general';
          sessionData.conversationHistory = [];

          const welcomeMsg = "Bonjour ! Je suis Dr. Adam. Décrivez-moi votre problème ou montrez-moi ce qui vous inquiète.";

          ws.send(JSON.stringify({
            type: 'started',
            doctor: DOCTORS['general'],
            message: welcomeMsg
          }));

          console.log(`✅ Visio démarrée pour ${message.email} avec Dr. Adam`);
          break;

        case 'transcript':
          const transcript = message.text;
          console.log(`🎤 Patient dit: "${transcript}"`);

          sessionData.conversationHistory.push({
            role: 'user',
            content: transcript
          });

          const now = Date.now();
          if (now - sessionData.lastAnalysisTime < 2000) {
            break;
          }
          sessionData.lastAnalysisTime = now;

          await analyzeAndRespond(ws, sessionData, transcript);
          break;

        case 'videoFrame':
          // Analyse vidéo toutes les 5 secondes
          const nowVideo = Date.now();
          if (nowVideo - sessionData.lastVideoAnalysisTime < 5000) {
            break;
          }
          sessionData.lastVideoAnalysisTime = nowVideo;

          await analyzeVideoFrame(ws, sessionData, message.data);
          break;

        case 'stop':
          console.log('🛑 Visio arrêtée');
          ws.close();
          break;
      }
    } catch (error) {
      console.error('❌ Erreur WebSocket:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('👋 Connexion fermée');
  });
});

async function analyzeVideoFrame(ws, sessionData, frameBase64) {
  try {
    console.log('📸 Analyse de la frame vidéo...');

    const doctor = DOCTORS[sessionData.currentSpecialist];
    const userProfile = db.get('users').find({ email: sessionData.email }).value()?.profile || {};

    // Extraire le base64 pur
    const base64Data = frameBase64.split(',')[1] || frameBase64;

    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });

    const prompt = `Tu es ${doctor.name}, médecin en ${doctor.specialty}.

Patient: ${userProfile.age || 'N/A'} ans, ${userProfile.sex || 'N/A'}

Analyse cette image que le patient te montre en VISIO.

Si tu vois quelque chose d'intéressant (symptôme, lésion, problème visible):
- Décris ce que tu vois en 2 phrases
- Pose 1 question précise

Si l'image est floue ou ne montre rien d'important:
- Ne dis rien (réponds juste "RAS")

Sois direct et concis.`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const analysis = response.text();

    // Ne parler que si quelque chose d'intéressant est détecté
    if (analysis && analysis.trim() !== '' && !analysis.includes('RAS') && analysis.length > 10) {
      console.log('📸 Analyse vidéo:', analysis);

      sessionData.conversationHistory.push({
        role: 'assistant',
        content: `[Observation visuelle] ${analysis}`
      });

      ws.send(JSON.stringify({
        type: 'videoAnalysis',
        doctor: doctor,
        message: analysis
      }));
    }

  } catch (error) {
    console.error('❌ Erreur analyse vidéo:', error);
  }
}

async function analyzeAndRespond(ws, sessionData, transcript) {
  try {
    const doctor = DOCTORS[sessionData.currentSpecialist];
    const userProfile = db.get('users').find({ email: sessionData.email }).value()?.profile || {};

    const systemPrompt = buildSystemPrompt(
      sessionData.currentSpecialist,
      userProfile,
      false,
      sessionData.conversationHistory
    );

    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });

    const history = sessionData.conversationHistory.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Compris, prêt.' }] },
        ...history
      ],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.85
      }
    });

    const result = await chat.sendMessage(transcript);
    const response = await result.response;
    const text = response.text();

    sessionData.conversationHistory.push({
      role: 'assistant',
      content: text
    });

    const fullHistory = sessionData.conversationHistory.map(m => m.content).join(' ');
    const detected = detectSpecialist(fullHistory);

    let redirect = false;

    if (detected !== 'general' && detected !== sessionData.currentSpecialist) {
      if (checkSubscriptionAccess(sessionData.email, detected)) {
        redirect = true;

        const oldDoctor = sessionData.currentSpecialist;
        sessionData.currentSpecialist = detected;

        ws.send(JSON.stringify({
          type: 'redirect',
          newDoctor: DOCTORS[detected],
          oldDoctor: DOCTORS[oldDoctor],
          message: text
        }));

        console.log(`🔀 Redirection: ${DOCTORS[oldDoctor].name} → ${DOCTORS[detected].name}`);

        setTimeout(async () => {
          const newDoctorPrompt = buildSystemPrompt(
            detected,
            userProfile,
            true,
            sessionData.conversationHistory
          );

          const newModel = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
          const newResult = await newModel.generateContent(newDoctorPrompt);
          const newResponse = await newResult.response;
          const newText = newResponse.text();

          sessionData.conversationHistory.push({
            role: 'assistant',
            content: newText
          });

          ws.send(JSON.stringify({
            type: 'response',
            doctor: DOCTORS[detected],
            message: newText
          }));
        }, 2000);

        return;
      }
    }

    ws.send(JSON.stringify({
      type: 'response',
      doctor: doctor,
      message: text
    }));

  } catch (error) {
    console.error('❌ Erreur analyse:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Erreur lors de l\'analyse'
    }));
  }
}

// ========== ROUTES API CLASSIQUES ==========
app.post('/api/auth', (req, res) => {
  try {
    const { email, token, displayName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    let user = db.get('users').find({ email }).value();

    if (!user) {
      user = {
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
        profile: null,
        subscription: email === ADMIN_EMAIL ? 'admin' : 'free',
        referrals: 0
      };
      db.get('users').push(user).write();
      console.log('✅ Utilisateur créé:', email);
    }

    const quota = checkDailyQuota(email);
    const plan = getUserPlan(email);

    res.json({
      success: true,
      user: {
        ...user,
        plan: PLANS[plan]
      },
      quota: {
        remaining: quota.remaining,
        limit: quota.limit,
        resetTime: 'minuit'
      }
    });
  } catch (error) {
    console.error('❌ Erreur auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const { email, age, sex, country, language } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const user = db.get('users').find({ email }).value();

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    db.get('users')
      .find({ email })
      .assign({
        profile: { age, sex, country, language },
        updatedAt: new Date().toISOString()
      })
      .write();

    console.log('✅ Profil mis à jour:', email);
    res.json({ success: true, message: 'Profil enregistré' });
  } catch (error) {
    console.error('❌ Erreur profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/doctors', (req, res) => {
  try {
    const email = req.query.email;
    const plan = getUserPlan(email);
    const allowedSpecialists = PLANS[plan]?.specialists || ['general'];

    const availableDoctors = Object.entries(DOCTORS)
      .map(([id, doctor]) => ({
        ...doctor,
        locked: !allowedSpecialists.includes(id)
      }));

    res.json({
      success: true,
      doctors: availableDoctors,
      plan: PLANS[plan]
    });
  } catch (error) {
    console.error('❌ Erreur doctors:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, specialist, userProfile, userEmail } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Connexion requise' });
    }

    if (!checkSubscriptionAccess(userEmail, specialist)) {
      return res.status(403).json({
        error: `Accès refusé. ${DOCTORS[specialist]?.name} nécessite un abonnement supérieur.`,
        upgrade: true
      });
    }

    const quota = checkDailyQuota(userEmail);
    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Limite quotidienne atteinte.',
        quota: { remaining: 0, limit: quota.limit }
      });
    }

    if (!checkRateLimit()) {
      return res.status(429).json({ error: 'Trop de requêtes. Attendez 1 minute.' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages requis' });
    }

    let finalSpecialist = specialist;
    let autoRedirect = false;

    if (specialist === 'general' && messages.length >= 2) {
      const lastMessage = messages[messages.length - 1].content;
      const detected = detectSpecialist(lastMessage);

      if (detected !== 'general' && checkSubscriptionAccess(userEmail, detected)) {
        finalSpecialist = detected;
        autoRedirect = true;
        console.log(`🔀 Redirection vers ${DOCTORS[detected].name}`);
      }
    }

    const systemPrompt = buildSystemPrompt(finalSpecialist, userProfile, autoRedirect, messages);

    const model = genAI.getGenerativeModel({
      model: PRIMARY_MODEL,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    });

    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Compris, prêt.' }] },
        ...history
      ],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.85
      }
    });

    console.log(`📤 Envoi à ${DOCTORS[finalSpecialist].name}...`);
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    incrementUsage(userEmail);
    const updatedQuota = checkDailyQuota(userEmail);

    console.log('✅ Réponse reçue');

    res.json({
      success: true,
      response: text,
      specialist: finalSpecialist,
      autoRedirect: autoRedirect,
      quota: {
        remaining: updatedQuota.remaining,
        limit: updatedQuota.limit
      }
    });
  } catch (error) {
    console.error('❌ Erreur chat:', error);
    res.status(500).json({
      error: 'Erreur: ' + error.message
    });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, imageType, userProfile, userEmail } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Connexion requise' });
    }

    const plan = getUserPlan(userEmail);
    if (!['individual', 'family', 'enterprise', 'admin'].includes(plan)) {
      return res.status(403).json({
        error: 'Analyse images réservée aux abonnés Individuel+.',
        upgrade: true
      });
    }

    const quota = checkDailyQuota(userEmail);
    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Limite atteinte.',
        quota: { remaining: 0, limit: quota.limit }
      });
    }

    if (!checkRateLimit()) {
      return res.status(429).json({ error: 'Trop de requêtes.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image requise' });
    }

    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });

    const prompt = `Tu es un médecin expert avec 20+ ans d'expérience.

Patient: ${userProfile?.age || 'N/A'} ans, ${userProfile?.sex || 'N/A'}

Analyse cette image en 4-5 phrases courtes :

1. Ce que tu vois
2. Hypothèse probable
3. Spécialiste à consulter
4. Urgence (routine / 48h / immédiat)

Style court et clair.`;

    console.log('📤 Analyse image...');

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const analysis = response.text();

    incrementUsage(userEmail);
    const updatedQuota = checkDailyQuota(userEmail);

    console.log('✅ Analyse terminée');

    res.json({
      success: true,
      analysis,
      quota: {
        remaining: updatedQuota.remaining,
        limit: updatedQuota.limit
      }
    });
  } catch (error) {
    console.error('❌ Erreur analyse:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/summary', async (req, res) => {
  try {
    const { conversation, language, userEmail } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Connexion requise' });
    }

    if (!checkRateLimit()) {
      return res.status(429).json({ error: 'Limite atteinte' });
    }

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: 'Conversation requise' });
    }

    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });

    const conversationText = conversation
      .map(msg => `${msg.role === 'user' ? 'Patient' : 'Médecin'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `Résumé médical professionnel en ${language === 'fr' ? 'français' : 'anglais'} :

${conversationText}

Format :
- Motif
- Symptômes
- Hypothèses
- Spécialiste recommandé
- Conseils

Max 200 mots.`;

    console.log('📤 Génération résumé...');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    console.log('✅ Résumé généré');

    res.json({ success: true, summary });
  } catch (error) {
    console.error('❌ Erreur résumé:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/change-plan', (req, res) => {
  try {
    const { email, adminEmail, newPlan } = req.body;

    if (adminEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!PLANS[newPlan]) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    db.get('users')
      .find({ email })
      .assign({ subscription: newPlan })
      .write();

    console.log(`✅ Plan changé pour ${email}: ${newPlan}`);

    res.json({ success: true, message: `Plan changé vers ${PLANS[newPlan].name}` });
  } catch (error) {
    console.error('❌ Erreur changement plan:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

function buildSystemPrompt(specialist, userProfile, isRedirected = false, messages = []) {
  const age = userProfile?.age || 'non précisé';
  const sex = userProfile?.sex || 'non précisé';
  const country = userProfile?.country || 'France';

  const doctor = DOCTORS[specialist];

  let contextualIntro = '';

  if (isRedirected && messages.length > 0) {
    const patientHistory = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' | ');

    const adamResponse = messages
      .filter(m => m.role === 'assistant')
      .slice(-1)[0]?.content || '';

    contextualIntro = `
**🔀 PATIENT REDIRIGÉ PAR DR. ADAM**

**Ce que le patient a dit :**
${patientHistory}

**Dr. Adam a déjà répondu :**
${adamResponse}

**TA MISSION :**
1. Dis rapidement "Bonjour, Dr. Adam m'a bien briefé sur ton cas"
2. NE REDEMANDE PAS ce qu'il a déjà dit
3. CONTINUE directement avec 1-2 questions PRÉCISES sur tes spécialités
4. Va droit au but

Exemple: "Bonjour ! Dr. Adam m'a briefé. Mal de tête + nausées 1 semaine. C'est plutôt pulsatile ou constant ? Vision floue ?"
`;
  }

  const basePrompt = `Tu es ${doctor.name}, médecin avec ${doctor.experience} d'expérience en ${doctor.specialty}.

Patient : ${age} ans, ${sex}, ${country}
${contextualIntro}

**TON STYLE (CRITIQUE) :**
- MAX 3-4 phrases courtes par réponse
- Tutoie le patient (style chaleureux)
- Pose 1 seule question à la fois
- Va droit au but : symptôme → question → hypothèse
- PAS de numérotation (1. 2. 3.)
- PAS de listes à puces
- Parle comme un vrai médecin en cabinet

**RÈGLES :**
- Ne dis JAMAIS que tu es une IA
- Si urgence → dis "Appelle le 15 maintenant !"
- Si pas ton domaine → oriente vers le bon spécialiste

**TON DOMAINE :** ${doctor.keywords.join(', ')}`;

  if (specialist === 'general') {
    return basePrompt + `

**TA MISSION (Dr. Adam - Régulateur) :**
1. Écoute le symptôme
2. Pose 1-2 questions max
3. Oriente VITE vers le bon spécialiste :
   - Cœur → Dr. Kenza
   - Stress → Dr. Sam
   - Enfant → Dr. Léo
   - Peau → Dr. Léa
   - Poids → Dr. Hugo
   - Respiration → Dr. Anis
   - Yeux → Dr. Iris
   - Maux de tête → Dr. Alex
   - Dos/articulations → Dr. Mathis
   - Femme/grossesse → Dr. Nora
   - Hormones → Dr. Clara
   - Allergies → Dr. Inès
   - Ventre → Dr. Elias

Dis : "Je t'oriente vers Dr. X qui s'occupe de ça."`;
  }

  return basePrompt;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  const host = process.env.NODE_ENV === 'production' ? `ehosp.onrender.com` : 'localhost';
  const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss://' : 'ws://';

  console.log(`\n🏥 ========================================`);
  console.log(`   EHOSP - Système Multi-Agents + Visio`);
  console.log(`========================================`);
  console.log(`📍 URL: ${protocol}${host}:${PORT}`);
  console.log(`🎥 WebSocket: ${wsProtocol}${host}:${PORT}`);
  console.log(`🤖 Modèle: ${PRIMARY_MODEL}`);
  console.log(`👨‍⚕️ Médecins: 14 spécialistes`);
  console.log(`🔐 Admin: ${ADMIN_EMAIL}`);
  console.log(`========================================\n`);
});
