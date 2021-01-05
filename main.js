// import { getLyrics, getSong } from "genius-lyrics-api";
const genius = require("genius-lyrics-api");
const netch = require("node-fetch");
const ObjectsToCsv = require("objects-to-csv");

// const objectsToCSV = (data, songName) => {
//   // new ObjectsToCsv(data).toDisk(`./${artistName}/${albumName}/${songName}.csv`);
//   new ObjectsToCsv(data).toDisk(`./csv/${songName}.csv`);
// };

const objectsToCSV = (data, artistName) => {
  new ObjectsToCsv(data).toDisk(`./${artistName}.csv`, { append: true });
};

const artistName = "Taylor Swift";
console.log("Artist ", artistName);

//Global CSV
const lyricLineObjectArray = [];

netch(`https://api.genius.com/search?q=${encodeURIComponent(artistName)}`, {
  method: "GET",
  headers: {
    cookie: "__cfduid=d8a2585fa6bb4fa3710e54c451c3b73c41609760728",
    "content-type": "application/json",
    authorization:
      "Bearer zbbERCz8pMqh1Q5LGqi0oEfxk6RTOT8BwjCiIilqU6drCl3vmzHykkEWQtKA0k1B",
  },
})
  .then((res) => res.json())
  .then((json) => processArtistSearch(json.response.hits))
  .catch((err) => {
    console.log(err);
  });

// Gets the ID of the artist from the first result
const processArtistSearch = (hits) => {
  const firstHit = hits[0];
  console.log("Artist ID ", firstHit.result.primary_artist.id);
  // objectsToCSV(lyricLineObjectArray, artistName);
};

// Make a request to the artist with ID i.e https://api.genius.com/artists/1177
//(Then find all the album ids, so everything with /albums/######)

netch("https://api.genius.com/artists/1177", {
  method: "GET",
  headers: {
    cookie: "__cfduid=d8a2585fa6bb4fa3710e54c451c3b73c41609760728",
    "content-type": "application/json",
    authorization:
      "Bearer zbbERCz8pMqh1Q5LGqi0oEfxk6RTOT8BwjCiIilqU6drCl3vmzHykkEWQtKA0k1B",
  },
})
  .then((res) => res.json())
  .then((json) => getAllAlbums(json.response))
  .catch((err) => {
    console.log(err);
  });

// Second method of obtaining all Albums via dom tree
const getAllAlbums = (response) => {
  //Description is actually 'children' will be an array holding "tag objects"
  const description = response.artist.description.dom.children;
  const albumApiPathArray = [];

  for (let child of description) {
    if (child.children) {
      // const children = child;
      for (let miniChild of child.children) {
        if (miniChild.data) {
          if (miniChild.data.api_path.includes("/albums/")) {
            // console.log(miniChild.data.api_path);
            albumApiPathArray.push(miniChild.data.api_path);
          }
        }
      }
    }
  }
  for (let albumAPIpath of albumApiPathArray) {
    getAllSongsFromAlbum(albumAPIpath);
  }

  // return albumApiPathArray;
};

const getAllSongsFromAlbum = (albumAPIpath) => {
  netch(`https://api.genius.com${albumAPIpath}`, {
    method: "GET",
    headers: {
      cookie: "__cfduid=d8a2585fa6bb4fa3710e54c451c3b73c41609760728",
      "content-type": "application/json",
      authorization:
        "Bearer zbbERCz8pMqh1Q5LGqi0oEfxk6RTOT8BwjCiIilqU6drCl3vmzHykkEWQtKA0k1B",
    },
  })
    .then((res) => res.json())
    .then((json) => processSongsFromAlbum(json.response))
    .catch((err) => {
      console.log(err);
    });
};

// getAllSongsFromAlbum(110728);

const processSongsFromAlbum = (response) => {
  const albumSongsApiPaths = [];
  const children =
    response.album.description_annotation.annotations[0].body.dom.children;

  console.log("Album Name ", response.album.full_title);
  for (let child of children) {
    if (child.children) {
      for (let miniChild of child.children) {
        if (miniChild.data) {
          if (miniChild.data.api_path.includes("/songs/")) {
            // console.log(miniChild.data.api_path);
            albumSongsApiPaths.push(miniChild.data.api_path);
          }
        }
      }
    }
  }

  for (let songAPIpath of albumSongsApiPaths) {
    getSongByID(songAPIpath, response.album.full_title);
  }

  // return albumSongsApiPaths;
};

//Find title artist
const getSongByID = (songAPIpath, albumName) => {
  netch(`https://api.genius.com${songAPIpath}`, {
    method: "GET",
    headers: {
      cookie: "__cfduid=d8a2585fa6bb4fa3710e54c451c3b73c41609760728",
      "Content-Type": "application/json",
      Authorization:
        "Bearer zbbERCz8pMqh1Q5LGqi0oEfxk6RTOT8BwjCiIilqU6drCl3vmzHykkEWQtKA0k1B",
    },
  })
    .then((res) => res.json())
    .then((json) => processSongTitleArtist(json.response, albumName))
    .catch((err) => {
      console.error(err);
    });
};

// Get Song name
const processSongTitleArtist = (response, albumName) => {
  const annotatable = response.song.description_annotation.annotatable;
  const songName = annotatable.title;
  console.log(annotatable.title);
  getLyricsFunction(songName, artistName, albumName);
};

// getSongByID(542389, "1989");

//Create an array of objects with lyric/line numbers and return it to the function that called it
const getLyricsFunction = (songName, artist, albumName) => {
  const options = {
    apiKey: "zbbERCz8pMqh1Q5LGqi0oEfxk6RTOT8BwjCiIilqU6drCl3vmzHykkEWQtKA0k1B",
    title: songName,
    artist: artist,
    optimizeQuery: true,
  };
  genius
    .getLyrics(options)
    .then((lyrics) => processLyrics(lyrics, songName, albumName));
};

// Responsible for converting the format on GENIUS.com into lines.
const processLyrics = (lyricsChunk, songName, albumName) => {
  // An array of objects with variable line and line number.
  const lyricArray = [];

  const lyricArrayRaw = lyricsChunk.split("\n");

  //Copy each line
  for (let line of lyricArrayRaw) {
    //If line is blank don't copy it over
    if (line !== "" && line.charAt(0) !== "[") {
      lyricArray.push(line);
    }
  }
  // console.log(lyricArray);

  for (let i = 0; i < lyricArray.length; ++i) {
    lyricLineObjectArray.push({
      artist: artistName,
      album: albumName,
      line: lyricArray[i],
      lineNumber: i + 1,
    });
  }
  console.log(lyricLineObjectArray);
  objectsToCSV(lyricLineObjectArray, artistName);
};

// new ObjectsToCsv(lyricLineObjectArray).toDisk(`${artistName}.csv`);
