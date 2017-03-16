'use strict';

const express = require('express');
const morgan = require('morgan');
// this will load our .env file if we're
// running locally. On Gomix, .env files
// are automatically loaded.
require('dotenv').config();

// apparently the emailer.js takes care of just about everything?
const {sendEmail} = require('./emailer');


const {logger} = require('./utilities/logger');
// these are custom errors we've created
const {FooError, BarError, BizzError} = require('./errors');

const app = express();

// this route handler randomly throws one of `FooError`,
// `BarError`, or `BizzError`
const russianRoulette = (req, res) => {
  const errors = [FooError, BarError, BizzError];
  throw new errors[
    Math.floor(Math.random() * errors.length)]('It blew up!');
};


app.use(morgan('common', {stream: logger.stream}));

// for any GET request, we'll run our `russianRoulette` function
app.get('*', russianRoulette);

// YOUR MIDDLEWARE FUNCTION should be activated here using
// `app.use()`. It needs to come BEFORE the `app.use` call
// below, which sends a 500 and error message to the client
app.use(function (err,req,res,next) {
  // here's the payload
  const emailData = {
  from: process.env.ALERT_FROM_EMAIL,
  to: process.env.ALERT_TO_EMAIL,
  subject: `ALERT: a ${err} Occurred!`,
  text: `The error message is: ${err.message}.  The stack is: ${err.stack}`,
  html: `<p>The error message is ${err.message}. The error stack is ${err.stack}</p>`
}
  // check which error it is and construct the error message, route Foo and Bar errors
  if (err instanceof FooError || err instanceof BarError) {
    logger.info(`Trying to send email alert to ${process.env.ALERT_TO_EMAIL}`)
    sendEmail(emailData);    
  } else {
    res.send(`<h1>You made it here okay!</h1><p>BTW, the error was a ${err}</p>`);
    //console.log(emailData);  // Just for checking the email contents that *would* have gotten sent
    next();
  }
});


app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({error: 'Something went wrong'}).end();
});

const port = process.env.PORT || 8080;

const listener = app.listen(port, function () {
  logger.info(`Your app is listening on port ${port}`);
});
