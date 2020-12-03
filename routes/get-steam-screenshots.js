"use strict";
const request = require('request-promise-native');
const cheerio = require("cheerio");
const express = require('express');
const ejs = require('ejs');
const LIST_URL = "http://steamcommunity.com/id/" + process.env.STEAM_USER + "/screenshots/?appid=0&sort=newestfirst&browsefilter=myfiles&view=grid"
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false
});

const get_steam_screenshots = (req, res) => {
  console.log(LIST_URL);
  request({ url: LIST_URL, encoding: null },
        async (error, response, body) => {
              if (!error && response.statusCode == 200) {
                const client = await pool.connect();
                const $ = cheerio.load(body);
                let json = {};
                // DBからタイトルJSON取得
                try {
                  const result = await client.query('SELECT json FROM steam_screenshots_title where id = 0');
                  json = result["rows"][0]["json"];
                  console.log(json);
                } catch (e) {
                  res.send(e);
                  return;
                }

                let p = [];
                let screenshots = []
                $(".profile_media_item").each((i, elem) => {
                  let ss = {}
                  screenshots.push(ss);
                  p.push(new Promise((resolve, reject) => {
                    const q = $('.imgWallHoverDescription q', elem);
                    const title = q.length ? q.text() : "(untitled)";
                    ss['title'] = title
                    const node = $('div.imgWallItem', elem);
                    const node_id = node['0']['attribs']['id'];
                    const item_id = node_id.replace('imgWallItem_', '');
                    const link = "http://steamcommunity.com/sharedfiles/filedetails/?id=" + item_id;
                    ss['link'] = link
                    const thumb = node['0']['attribs']['style'].split("'")[1]
                    ss['thumb'] = thumb
  
                    // ゲーム名取得
                    let game_title = "";
                    if (item_id in json) {
                      game_title = json[item_id];
                      ss['game_title'] = game_title
                      resolve(game_title);
                    } else {
  
                      request({url: link, headers: {'Accept-Language': 'ja,en-US'}}).then((html) => {
                        const $$ = cheerio.load(html);
                        const h3 = $$('h3.apphub_responsive_menu_title');
                        const a = $$('div.screenshotAppName a');
                        game_title = h3.text() != ''? h3.text(): a.text();
                        json[item_id] = game_title;
                      }).then(() => {
                        ss['game_title'] = game_title
                        resolve(game_title);
                      });
                    }
                  }));
                });
                let pall = Promise.all(p).then((t) => {
                  
                  // DBからタイトルJSON取得
                  client.query('update steam_screenshots_title set json = $1 where id = 0', [json])
                  .then((result) => {
                    console.log(result);
                  })
                  .finally(() => {
                    client.release();
                  });
                  
                  let data = {screenshots: screenshots};
                  res.render('pages/get_steam_screenshots', data);
                });
          }
    });
};

module.exports = get_steam_screenshots;
