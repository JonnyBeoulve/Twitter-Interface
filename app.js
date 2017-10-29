/*=======================================================================
// Require dependencies.
=======================================================================*/
const express = require('express');
const twit = require('twit');
const moment = require('moment');

/*=======================================================================
// Set up server with Express, static files, config, and Pug.
=======================================================================*/
const app = express();
const server = require('http').Server(app);
const config = require('./config');

app.use(express.static('public'));
app.set('view engine', 'pug');

/*=======================================================================
// Pull keys from config file.
=======================================================================*/
const user = new twit(config);

/*=======================================================================
// Begin routing
// The first route will pull your user data and create and array
// with its information.
=======================================================================*/
app.use((req, res, next) => {
  user.get('account/verify_credentials', { skip_status: true })

    .then((result)=> {
      result = result.data;

      // create array and insert data
      let profileData = [];
      profileData.name = result.name;
      profileData.username = result.screen_name;
      profileData.followingTotal = result.friends_count;
      profileData.avatarURL = result.profile_image_url.replace('_normal', '');
      req.profileData = profileData;
      next();
    })

    .catch((err) => {
      err.status = 500;
      err.message = "Unable to get account information.";
      next(err);
    });
});

/*=======================================================================
// The second route will get your last 5 tweets.
=======================================================================*/
app.use((req, res, next) => {
  user.get('statuses/user_timeline', { screen_name: req.profileData.username, count: 5 })

    .then((result) => {
      let timelineData = [];

      // for your 5 recent posts pulled from twitter
      for (let i = 0; i < result.data.length; i+= 1) {
        let currentTweet = result.data[i];
        let tweet = [];

        // pull the retweeted tweet instead if applicable
        if (currentTweet.retweeted_status) {
          currentTweet = currentTweet.retweeted_status;
        }

        // media image will be pulled from tweet if available
        if (currentTweet.entities.media) {
          tweet.media = currentTweet.entities.media[0].media_url;
        }
      
        // fill out tweet information in array to be pushed into dom
        tweet.avatarURL = currentTweet.user.profile_image_url.replace('_normal', '');
        tweet.name = currentTweet.user.name;
        tweet.username = currentTweet.user.screen_name;
        tweet.created_at = moment(Date.parse(currentTweet.created_at)).fromNow()
        tweet.text = currentTweet.text;
        tweet.retweets = currentTweet.retweet_count;
        tweet.likes  = currentTweet.favorite_count;
        
        timelineData.push(tweet); 
      }
      req.timelineData = timelineData;
      next();
    })

    .catch((err) => {
      err.status = 500;
      err.message = "An error occurred while getting your timeline information.";
      next(err);
    });
});

/*=======================================================================
// The third route will get the last 5 users you followed.
=======================================================================*/
app.use((req, res, next) => {
  user.get('friends/list', { skip_status: true, screen_name: req.profileData.username, count: 5 })

    .then((result)=> {
      let followerData = [];

      // for your 5 recent follows pulled from twitter
      for(let i = 0; i < result.data.users.length; i +=1) {
        let currentFollower = result.data.users[i];
        let follower = {};

        // fill out follower information in array to be pushed into dom
        follower.avatarURL = currentFollower.profile_image_url.replace('_normal', '');
        follower.name = currentFollower.name;
        follower.username = currentFollower.screen_name;
        followerData.push(follower);
      }
      req.followerData = followerData;
      next();

    })
    .catch((err) => {
      err.status = 500;
      err.message = "An error occurred while getting your follower data.";
      next(err);
    });
});

/*=======================================================================
// The fourth and final route will get your last 5 messages.
=======================================================================*/
app.use((req, res, next) => {
  user.get('direct_messages', { count: 5 })

    .then((result)=> {
      let messageData = [];

      // for your 5 recent direct messages pulled from twitter
      for(let i = 0; i < result.data.length; i +=1) {
        let currentMessage = result.data[i];
        let message = [];

        // fill out message information in array to be pushed into dom
        message.avatarURL = currentMessage.sender.profile_image_url.replace('_normal',  '');
        message.name = currentMessage.sender.name;
        message.screen_name = currentMessage.sender.screen_name;
        message.text = currentMessage.text;
        message.created_at = moment(Date.parse(currentMessage.created_at)).fromNow();
        messageData.push(message);
      }
      req.messageData = messageData;
      next();
    })

    .catch((err) => {
      err.status = 500;
      err.message = 'An error occurred while getting your messages information.';
      next(err);
    });
});

/*=======================================================================
// Main route
// Push data from middleware to DOM.
=======================================================================*/
app.get('/', (req, res) => {
  res.render('index', {
    profileData: req.profileData,
    timelineData: req.timelineData,
    followerData: req.followerData,
    messageData: req.messageData
  })
});

/*=======================================================================
// Error routes.
=======================================================================*/
app.use((req, res, next) => {
  const err = new Error('An unknown error has occured.');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.locals.error = err;
  res.status(err.status);
  res.render('error', { error: err });
});

/*=======================================================================
// Create listen server on port 3000.
=======================================================================*/
server.listen(3000, () => {
  console.log('Application is running at localhost:3000.');
});
