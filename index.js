"use strict";

const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const get_steam_screenshots = require('./routes/get-steam-screenshots');

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/get-steam-screenshots', get_steam_screenshots)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
