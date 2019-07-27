const fetch = require('node-fetch');
const querystring = require('querystring');
const db = require('./db');
const utils = require('./utils');

// With thanks to Dennis Alund https://medium.com/evenbit/building-a-slack-app-with-firebase-as-a-backend-151c1c98641d

exports.oauth_redirect = async function(req, res) {
  if (req.method !== 'GET') {
    console.error(`Got unsupported ${req.method} request. Expected GET.`);
    return res.send(405, 'Only GET requests are accepted');
  }

  if (!req.query && !req.query.code) {
    return res.status(401).send("Missing query attribute 'code'");
  }

  const [id, secret] = utils.getDbOrConfigValues('config', 'slack', [
    'id',
    'secret'
  ]);

  const queryParams = {
    code: req.query.code,
    client_id: id,
    client_secret: secret,
    redirect_uri: `https://europe-west1-${
      process.env.GCLOUD_PROJECT
    }.cloudfunctions.net/oauth_redirect`
  };

  const encodedQueryString = querystring.stringify(queryParams);
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=utf8'
    }
  };

  const response = await fetch(
    `https://slack.com/api/oauth.access?${encodedQueryString}`,
    options
  );

  const responseJson = await response.json();
  if (!responseJson.ok) {
    console.error('The request was not ok: ' + JSON.stringify(result));
    return res
      .header(
        'Location',
        `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`
      )
      .send(302);
  }

  await db
    .collection('tokens')
    .doc(responseJson.team_id)
    .set({
      token: responseJson.access_token
    });

  return res
    .header(
      'Location',
      `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/success.html`
    )
    .send(302);
};
