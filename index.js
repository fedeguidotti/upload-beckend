const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

// --- INIZIALIZZAZIONE FIREBASE ADMIN ---
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("ERRORE CRITICO: File 'firebase-service-account.json' non trovato o non valido.");
    process.exit(1);
}
const db = admin.firestore();

const app = express();

// --- CORS CONFIGURATION ---
app.use(cors());
app.options('*', cors()); 
app.use(express.json());

// --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: 'dyewzmvpa', 
  api_key: '245647176451857', 
  api_secret: 'cR-VWOp7lHX3kV6Wns_TuPm2MiM' 
});

// --- SETUP STORAGE PER UPLOAD IMMAGINI ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder = req.path.includes('dish') ? 'dish_images' : 'logos';
    return {
        folder: folder,
        allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    };
  },
});
const upload = multer({ storage: storage });

// --- FUNZIONE DI UTILITÀ PER LA CANCELLAZIONE RICORSIVA ---
async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });
  
    async function deleteQueryBatch(query, resolve) {
      const snapshot = await query.get();
      if (snapshot.size === 0) return resolve();
  
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
  
      process.nextTick(() => deleteQueryBatch(query, resolve));
    }
}

// --- ROTTA PER GENERARE QR CODE ---
app.post('/generate-qr', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            color: {
                dark:"#000000",
                light:"#FFFFFF"
            }
        });
        res.json({ qrCode: qrCodeDataUrl });
    } catch (err) {
        console.error('Failed to generate QR code', err);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// --- ROTTE GESTIONE PIATTI ---
// ... (codice invariato)

// --- ROTTE DI LOGIN ---
// ... (codice invariato)

// --- ROTTE GESTIONE RISTORATORE (DASHBOARD) ---
// ... (codice invariato)

// --- ROTTE SUPER ADMIN ---
// ... (codice invariato)

// --- ROTTA ANALYTICS DEFINITIVA E ROBUSTA ---
app.get('/analytics/:restaurantId', async (req, res) => {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Date di inizio e fine richieste.' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sessionsRef = db.collection(`ristoranti/${restaurantId}/historicSessions`);
        // Recupera TUTTI i documenti senza usare .where sulla data per evitare crash
        const snapshot = await sessionsRef.get();

        let totalRevenue = 0;
        let totalSessions = 0;
        const topDishes = {};
        const dailyRevenue = {};
        const dailySessions = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // CONTROLLO MANUALE DELLA DATA (ANTI-CRASH)
            if (!data.paidAt || typeof data.paidAt.toDate !== 'function') {
                return; // Salta il documento se paidAt non è un Timestamp valido
            }
            const paidAtDate = data.paidAt.toDate();
            if (paidAtDate < start || paidAtDate > end) {
                return; // Salta il documento se è fuori dal range di date
            }

            totalSessions++;
            totalRevenue += data.totalAmount || 0;

            const dateKey = paidAtDate.toISOString().split('T')[0];
            dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (data.totalAmount || 0);
            dailySessions[dateKey] = (dailySessions[dateKey] || 0) + 1;

            (data.orders || []).forEach(item => {
                if (item.name && typeof item.quantity === 'number') {
                    topDishes[item.name] = (topDishes[item.name] || 0) + item.quantity;
                }
            });
        });

        const formattedTopDishes = Object.entries(topDishes)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        const formattedDailyData = (dataObj) => {
            const result = [];
            const loopDate = new Date(start);
            while (loopDate <= end) {
                const dateKey = loopDate.toISOString().split('T')[0];
                result.push({
                    date: dateKey,
                    value: dataObj[dateKey] || 0
                });
                loopDate.setDate(loopDate.getDate() + 1);
            }
            return result;
        };

        res.json({
            totalRevenue,
            totalSessions,
            topDishes: formattedTopDishes,
            dailyRevenue: formattedDailyData(dailyRevenue).map(d => ({ date: d.date, revenue: d.value })),
            dailySessions: formattedDailyData(dailySessions).map(d => ({ date: d.date, sessions: d.value }))
        });

    } catch (error) {
        console.error("Errore analytics:", error);
        res.status(500).json({ error: 'Errore nel recupero delle analitiche.' });
    }
});


app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo e Funzionante!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
