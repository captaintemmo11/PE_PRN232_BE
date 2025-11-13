require('dotenv').config();
const express = require('express');
const cors = require('cors');
const moviesRouter = require('./routes/movies');

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.use('/movies', moviesRouter);

app.get('/', (req, res) => res.send('PE_PRN232_BE is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
