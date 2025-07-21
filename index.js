const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("ERRORE: File 'firebase-service-account.json' non trovato.");
    process.exit(1);
}
const db = admin.firestore();

const app = express();

// --- CONFIGURAZIONE CORS CORRETTA ---
// Abilita CORS per tutte le richieste. Questo è un modo più robusto per risolvere l'errore.
app.use(cors());
app.options('*', cors()); // Abilita le richieste di pre-flight per tutte le rotte

app.use(express.json());

// --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: 'dyewzmvpa', 
  api_key: '245647176451857', 
  api_secret: 'cR-VWOp7lHX3kV6Wns_TuPm2MiM' 
});

// --- SETUP STORAGE PER UPLOAD ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder;
    if (req.path.includes('dish')) {
        folder = 'dish_images';
    } else {
        folder = 'logos';
    }
    return {
        folder: folder,
        allowed_formats: ['jpeg', 'png', 'jpg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    };
  },
});
const upload = multer({ storage: storage });

// --- ROTTE UPLOAD ---
app.post('/upload-dish-image', upload.single('dishImage'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nessun file caricato.' });
  res.status(200).json({ url: req.file.path });
});

// --- ROTTA PER AGGIUNGERE UN NUOVO PIATTO ---
app.post('/add-dish/:restaurantId', upload.single('photo'), async (req, res) => {
    const { restaurantId } = req.params;
    const { name, description, price, category, isSpecial } = req.body;
    const allergens = JSON.parse(req.body.allergens || '[]'); 

    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Nome, prezzo e categoria sono obbligatori.' });
    }

    try {
        let photoUrl = null;
        if (req.file) {
            photoUrl = req.file.path;
        }

        const newDishData = {
            name,
            description,
            price: parseFloat(price),
            category,
            isSpecial: isSpecial === 'true',
            allergens,
            photoUrl
        };

        const docRef = await db.collection(`ristoranti`).doc(restaurantId).collection('menu').add(newDishData);

        res.status(201).json({ success: true, message: 'Piatto aggiunto con successo!', dishId: docRef.id });

    } catch (error) {
        console.error("Errore durante l'aggiunta del piatto:", error);
        res.status(500).json({ error: 'Errore interno del server durante l\'aggiunta del piatto.' });
    }
});


app.post('/update-dish/:restaurantId/:dishId', upload.single('photo'), async (req, res) => {
    const { restaurantId, dishId } = req.params;
    const { name, description, price, category, isSpecial } = req.body;
    const allergens = JSON.parse(req.body.allergens || '[]');

    try {
        const docRef = db.collection(`ristoranti/${restaurantId}/menu`).doc(dishId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Piatto non trovato.' });

        const updateData = {
            name,
            description,
            price: parseFloat(price),
            category,
            isSpecial: isSpecial === 'true',
            allergens
        };

        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.photoUrl && oldData.photoUrl.includes('cloudinary')) {
                const folder = oldData.photoUrl.includes('/dish_images/') ? 'dish_images' : 'uploads';
                const publicId = folder + '/' + oldData.photoUrl.split(`/${folder}/`)[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.photoUrl = req.file.path;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Piatto aggiornato!' });
    } catch (error) {
        console.error("Errore aggiornamento piatto:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento del piatto.' });
    }
});


// --- ROTTE ADMIN E UTILITY ---
app.get('/cloudinary-usage', async (req, res) => {
    try {
        const usage = await cloudinary.api.usage({ credits: true });
        res.status(200).json(usage);
    } catch (error) {
        res.status(500).json({ error: "Impossibile recuperare i dati di utilizzo." });
    }
});

app.post('/delete-image', async (req, res) => {
    const { photoUrl } = req.body;
    if (!photoUrl || !photoUrl.includes('cloudinary')) return res.status(400).json({ error: 'URL non valido.' });
    try {
        const folder = photoUrl.includes('/dish_images/') ? 'dish_images' : 'logos';
        const publicId = folder + '/' + photoUrl.split(`/${folder}/`)[1].split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        res.status(200).json({ success: true, message: 'Immagine eliminata.' });
    } catch (error) {
        res.status(500).json({ error: "Errore durante l'eliminazione dell'immagine." });
    }
});

async function deleteCollection(db, collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await deleteCollection(db, collectionPath);
}

// --- ROTTE RISTORATORE ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password sono obbligatori.' });
    try {
        const snapshot = await db.collection('ristoranti').where('username', '==', username).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ success: false, error: 'Credenziali non valide.' });
        
        const restaurantDoc = snapshot.docs[0];
        const restaurantData = restaurantDoc.data();
        const isPasswordCorrect = await bcrypt.compare(password, restaurantData.passwordHash);

        if (!isPasswordCorrect) return res.status(401).json({ success: false, error: 'Credenziali non valide.' });

        res.json({ 
          success: true, 
          docId: restaurantDoc.id,
          restaurantId: restaurantData.restaurantId,
          nomeRistorante: restaurantData.nomeRistorante,
          logoUrl: restaurantData.logoUrl || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.post('/update-restaurant-details/:docId', upload.single('logo'), async (req, res) => {
    const { docId } = req.params;
    const { nomeRistorante } = req.body;
    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const updateData = { nomeRistorante };
        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.logoUrl) {
                const publicId = 'logos/' + oldData.logoUrl.split('/logos/')[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.logoUrl = req.file.path;
        }
        await docRef.update(updateData);
        const finalData = (await docRef.get()).data();
        res.json({ success: true, message: 'Dati aggiornati!', updatedData: { nomeRistorante: finalData.nomeRistorante, logoUrl: finalData.logoUrl } });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

// --- ROTTE ADMIN ---
app.get('/restaurants', async (req, res) => {
    try {
        const snapshot = await db.collection('ristoranti').get();
        const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(restaurants);
    } catch (error) {
        console.error("Errore nel recuperare i ristoranti:", error);
        res.status(500).json({ error: 'Impossibile recuperare i ristoranti.' });
    }
});

app.post('/create-restaurant', upload.single('logo'), async (req, res) => {
    const { nomeRistorante, username, password } = req.body;
    if (!nomeRistorante || !username || !password) return res.status(400).json({ error: 'Dati mancanti.' });
    try {
        let logoUrl = null;
        if (req.file) {
            logoUrl = req.file.path;
        }
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);

        await db.collection('ristoranti').add({
            nomeRistorante, username, passwordHash, passwordPlain: password, restaurantId, logoUrl
        });
        res.status(201).json({ message: 'Ristorante creato con successo.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore nella creazione del ristorante.' });
    }
});

app.delete('/delete-restaurant/:docId', async (req, res) => {
    const { docId } = req.params;
    try {
        const restoDoc = await db.collection('ristoranti').doc(docId).get();
        if (!restoDoc.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });
        
        const restaurantData = restoDoc.data();
        const restaurantId = restaurantData.restaurantId;

        if (restaurantData.logoUrl) {
            const publicId = 'logos/' + restaurantData.logoUrl.split('/logos/')[1].split('.')[0];
            await cloudinary.uploader.destroy(publicId).catch(err => console.warn("Logo non trovato"));
        }

        const menuSnapshot = await db.collection(`ristoranti/${restaurantId}/menu`).get();
        const dishImagePublicIds = [];
        menuSnapshot.forEach(doc => {
            const photoUrl = doc.data().photoUrl;
            if (photoUrl && photoUrl.includes('cloudinary')) {
                const folder = photoUrl.includes('/dish_images/') ? 'dish_images' : 'uploads';
                const publicId = folder + '/' + photoUrl.split(`/${folder}/`)[1].split('.')[0];
                dishImagePublicIds.push(publicId);
            }
        });
        if (dishImagePublicIds.length > 0) await cloudinary.api.delete_resources(dishImagePublicIds).catch(err => console.warn("Immagini non trovate"));

        await deleteCollection(db, `ristoranti/${restaurantId}/menu`);
        await deleteCollection(db, `ristoranti/${restaurantId}/menuCategories`);
        await deleteCollection(db, `ristoranti/${restaurantId}/fixedTables`);
        
        await db.collection('ristoranti').doc(docId).delete();

        res.json({ message: 'Ristorante e tutti i dati associati eliminati.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'eliminazione.' });
    }
});

app.post('/update-restaurant-admin/:docId', upload.single('logo'), async (req, res) => {
    const { docId } = req.params;
    const { nomeRistorante, username, password } = req.body;
    
    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const updateData = { nomeRistorante, username };
        if (password) {
            const salt = bcrypt.genSaltSync(10);
            updateData.passwordHash = bcrypt.hashSync(password, salt);
            updateData.passwordPlain = password;
        }
        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.logoUrl) {
                const publicId = 'logos/' + oldData.logoUrl.split('/logos/')[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.logoUrl = req.file.path;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Dati aggiornati!' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});


app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
