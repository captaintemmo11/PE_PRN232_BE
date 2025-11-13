const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { body } = require('express-validator');
const ctrl = require('../controllers/moviesController');

router.get('/', ctrl.listMovies);
router.get('/:id', ctrl.getMovie);

router.post('/',
  upload.single('poster'),
  body('title').notEmpty().withMessage('Title required'),
  ctrl.createMovie
);

router.put('/:id',
  upload.single('poster'),
  ctrl.updateMovie
);

router.delete('/:id', ctrl.deleteMovie);

module.exports = router;
