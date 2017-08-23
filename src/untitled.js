require('dotenv').config();

	  const phoneNum = '5307133641'
      const accountSid = process.env.ACCT_SID
      console.log(process.env.ACCT_SID);
      const authToken = process.env.AUTH_TOKEN;
      console.log(authToken);

      // require the Twilio module and create a REST client
      const client = require('twilio')(accountSid, authToken);

      client.messages
        .create({
          to: parsePhone(phoneNum),
          from: process.env.MY_NUM,
          body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
        })
        .then((message) => console.log(message.sid));

function parsePhone(phone){
  return '+1' + phone;
}