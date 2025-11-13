const { admin, db, bucket } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

const moviesCollection = db.collection('movies');

async function uploadPoster(buffer, originalName, mimeType) {
  const filename = `posters/${Date.now()}_${uuidv4()}_${originalName}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

exports.listMovies = async (req, res) => {
  try {
    const { q, genre, sort = 'createdAt', order = 'desc', limit = 20 } = req.query;
    let query = moviesCollection;

    if (genre) query = query.where('genre', '==', genre);

    if (['rating', 'title', 'createdAt'].includes(sort)) {
      query = query.orderBy(sort, order);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    const snapshot = await query.limit(Number(limit)).get();
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (q) {
      const qLower = q.toString().toLowerCase();
      results = results.filter(m => m.title && m.title.toLowerCase().includes(qLower));
    }

    res.json({ data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMovie = async (req, res) => {
  try {
    const doc = await moviesCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createMovie = async (req, res) => {
  try {
    const { title, genre, rating, posterUrl } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let finalPosterUrl = posterUrl || null;

    if (req.file) {
      finalPosterUrl = await uploadPoster(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const now = new Date();
    const docRef = await moviesCollection.add({
      title,
      titleLower: title.toLowerCase(),
      genre: genre || null,
      rating: rating ? Number(rating) : null,
      posterUrl: finalPosterUrl,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now)
    });

    const doc = await docRef.get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, genre, rating, posterUrl } = req.body;

    const docRef = moviesCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const updates = {};
    if (title) {
      updates.title = title;
      updates.titleLower = title.toLowerCase();
    }
    if (genre !== undefined) updates.genre = genre || null;
    if (rating !== undefined) updates.rating = rating !== '' ? Number(rating) : null;

    if (req.file) {
      updates.posterUrl = await uploadPoster(req.file.buffer, req.file.originalname, req.file.mimetype);
    } else if (posterUrl !== undefined) {
      updates.posterUrl = posterUrl || null;
    }

    updates.updatedAt = admin.firestore.Timestamp.fromDate(new Date());

    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    const id = req.params.id;
    await moviesCollection.doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
