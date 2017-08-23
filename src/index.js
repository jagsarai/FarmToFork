'use strict';
require('dotenv').config();
var Alexa = require("alexa-sdk");
const https = require("https");
const accountSid = process.env.ACCT_SID;
const authToken = process.env.AUTH_TOKEN;
// require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);
var deviceId;
var consentToken;
var marketName;


exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);

    // alexa.dynamoDBTableName = 'tomatoData';

    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function(){
      var outputSpeech = "Welcome, I can find farmers markets near you. Please tell me which city you would like to search. You can say something like, find a market near San Francisco."
      var repromptSpeech = "Please tell me which city you would like to search. You can say something like, find a market near San Francisco."
      this.emit(":ask", outputSpeech, repromptSpeech);
    },
    'SearchNearCity': function () {
       var slotCollection = delegateSlotCollection.call(this);
       console.log("attributes inside search near city", this.attributes['GetDetails'])

       var searchCity;
       console.log("city is: ", this.event.request.intent.slots.citySearch.value)
       
       //Check to see if the there is a value for city that we can search
       this.event.request.intent.slots.citySearch.value !== undefined ? searchCity = this.event.request.intent.slots.citySearch.value
                                                                      : searchCity = null;

       console.log("deviceId: ", this.event.context.System.device.deviceId);

       //Check to see if there is a device id
       this.event.context.System.device.deviceId !== undefined ? deviceId = this.event.context.System.device.deviceId
                                                               : deviceId = undefined;
       console.log("permissions: " , this.event.context.System.user.permissions);
       
       //Check to see if user permissions are given. 
       this.event.context.System.user.permissions !== undefined ? consentToken = this.event.context.System.user.permissions.consentToken 
                                                                : consentToken = undefined;

       console.log("consentToken: ", consentToken);
        if(deviceId && consentToken && searchCity){
            getCity(searchCity, (city) => {
                getFarmersMarkets(null, city, null, (result) =>{
                    //Attributes collected for the GetDetails intent. 
                    this.attributes['GetDetails'] = result;
                    var answerString = '';
                    var finalOutput;
                    console.log("result is: ", result)
                    finalOutput = result.map((answer) => {
                      return answer["1"]
                            || answer["2"]
                            || answer["3"]
                            || answer["4"]
                            || answer["5"]
                    }).map((market) => {
                      return answerString + " " + market["name"] 
                    });
                    console.log("final output is: " + finalOutput);
                    var outputSpeech = `Here are the markets near ${searchCity}: ${finalOutput}. Please tell me if you would like details on one. You can say something like, the first one.`
                    var repromptSpeech = `Here are the markets near ${searchCity}: ${finalOutput}. You can say something like, the first one.`
                    var cardTitle = `Markets near ${searchCity}`
                    var cardContent = `Here are the markets near ${searchCity}: ${finalOutput}.`
                    this.emit(":askWithCard", outputSpeech, repromptSpeech, cardTitle, cardContent, null);
                })
            })               
        }
        else if(deviceId){
            var permissions = ['read::alexa:device:all:address:country_and_postal_code']
            this.emit(":tellWithPermissionCard", "Please use the Alexa skills app to enable your location", permissions);
       }
       else{
            this.emit(":tell", "Please use a proper device to access this skill. Goodbye!")
       }  
    },    
    'SearchNearMe': function () {
      console.log("attributes inside of search near me ", this.attributes['GetDetails']);

      var slotCollection = delegateSlotCollection.call(this);

       console.log("deviceId: ", this.event.context.System.device.deviceId);
       // Check to see if device id is peresent. 
       this.event.context.System.device.deviceId !== undefined ? deviceId = this.event.context.System.device.deviceId
                                                               : deviceId = undefined;
       console.log("permissions: " , this.event.context.System.user.permissions);
       
       //Check to see if user permisisons are valid. 
       this.event.context.System.user.permissions !== undefined ? consentToken = this.event.context.System.user.permissions.consentToken 
                                                                : consentToken = undefined;

       console.log("consentToken: ", consentToken);
        if(deviceId && consentToken){
            requestZip(deviceId, consentToken, (zip) => {
                console.log("This is my zip: ", zip);
                getFarmersMarkets(zip, null, null, (result) => {
                    //Attributes collected for the GetDetails intent. 
                    this.attributes['GetDetails'] = result;
                    var answerString = '';
                    var finalOutput;
                    console.log("result is : " , result)
                    finalOutput = result.map((answer) => {
                      return answer["1"]
                            || answer["2"]
                            || answer["3"]
                            || answer["4"]
                            || answer["5"]
                    }).map((market) => {
                      return answerString +  " " + market["name"] 
                    });
                    console.log("final output is: " + finalOutput);
                    var outputSpeech = `Here are the markets near you: ${finalOutput}. Please tell me if you would like details on one. You can say something like, the first one.`
                    var repromptSpeech = `Here are the markets near you: ${finalOutput}. You can say something like, the first one.`
                    var cardTitle = `Markets near you`
                    var cardContent = `Here are the markets near you: ${finalOutput}.`
                    this.emit(":askWithCard", outputSpeech, repromptSpeech, cardTitle, cardContent, null);
                });
            });               
        }
        else if(deviceId){
            var permissions = ['read::alexa:device:all:address:country_and_postal_code']
            this.emit(":tellWithPermissionCard", "Please use the Alexa skills app to enable your location", permissions);
       }
       else{
            this.emit(":tell", "Please use a proper device to access this skill. Goodbye!")
       }  
    },
    'GetDetails': function () {
      var slotCollection = delegateSlotCollection.call(this);
      console.log("attributes inside of GetDetails ", this.attributes["GetDetails"]);
      //Get the attributes passed to us by our pervious intenets
      var details = this.attributes["GetDetails"];

      var marketToSearchFor = this.event.request.intent.slots.details.value
      console.log("Market to search for ", marketToSearchFor);

      var id = findIdOfMarket(marketToSearchFor, details);
      console.log("id is ", id)

      marketName = findNameOfMarket(marketToSearchFor, details);
      console.log("name of market ", marketName) 


      getFarmersMarkets(null, null, id, (result) => {
        console.log("results for GetDetails: ", result);
        this.attributes["SendDetails"] = result;
        var link = result['GoogleLink']
        var address = result['Address']
        var products = result['Products'] === "" ? result["Products"] = "Product detail for this market is not available" 
                                                 : result["Products"].replace(/and\Wor/g, "and")
                                                                     .replace(/,/g, ";")
                                                                     .replace(/etc.;/g, "")
                                                                     .replace(/(for immediate consumption)/g, "")
        var schedule = result['Schedule'].replace(/<br>/g, "");
    
        var outputSpeech = `Here are the products sold at ${marketName}: ${products}. Should I send the details to your phone?`
        var repromptSpeech = 'Should I send the details to your phone? You can say something like send me the details.'
        var cardTitle = `Market Details for ${marketName}`
        var cardContent = `Address: ${address} \n Products Sold: ${products} \n Schedule: ${schedule} \n link: ${link}` 
        this.emit(":askWithCard", outputSpeech, repromptSpeech, cardTitle, cardContent)
      });
    },
    'SendDetails': function (){
      var slotCollection = delegateSlotCollection.call(this)

      console.log("attributes for GetDetails inside SendDetails: ", this.attributes["GetDetails"]);
      console.log("attributes for SendDetails inside SendDetails: ", this.attributes["SendDetails"]);
      console.log("name of market: ", marketName);
      
      var phoneNum = this.event.request.intent.slots.phone.value;
      console.log("phone number inside SendDetails: ", phoneNum);

      var details = this.attributes["SendDetails"];

      var googleLink = details["GoogleLink"];
      console.log("GoogleLink: ", googleLink);

      if(phoneNum !== undefined){
        client.messages
        .create({
          to: parsePhone(phoneNum),
          from: process.env.MY_NUM,
          body: `Here are the detials for ${marketName} \n ${googleLink}`
        })
        .then((message) => {
          console.log(message.sid)
          this.emit(":tell", "The details have been sent to your phone! Goodbye!");
        });  
      }
      else {
        delegateSlotCollection.call(this);
      }
    }
};



//***********Helper Functions***********//

function parsePhone(phone){
  return '+1' + phone;
}

function findIdOfMarket(marketToSearchFor, details){
  var id 
  marketToSearchFor === '1st' || marketToSearchFor === 'first'  || marketToSearchFor === 'one'   || marketToSearchFor === '1'  ? id = details[0]["1"]["id"] : id = 'cannot find that id'
  marketToSearchFor === '2nd' || marketToSearchFor === 'second' || marketToSearchFor === 'two'   || marketToSearchFor === '2'  ? id = details[1]["2"]["id"] : id 
  marketToSearchFor === '3rd' || marketToSearchFor === 'third'  || marketToSearchFor === 'three' || marketToSearchFor === '3'  ? id = details[2]["3"]["id"] : id
  marketToSearchFor === '4th' || marketToSearchFor === 'fourth' || marketToSearchFor === 'four'  || marketToSearchFor === '4'  ? id = details[3]["4"]["id"] : id
  marketToSearchFor === '5th' || marketToSearchFor === 'fifth'  || marketToSearchFor === 'five'  || marketToSearchFor === '5'  || marketToSearchFor === 'last' ? id = details[4]["5"]["id"] : id
  return id
}

function findNameOfMarket(marketToSearchFor, details){
  var name
  marketToSearchFor === '1st' || marketToSearchFor === 'first'  || marketToSearchFor === 'one'   || marketToSearchFor === '1'  ?  name = details[0]["1"]["name"] : name = 'cannot find that name'
  marketToSearchFor === '2nd' || marketToSearchFor === 'second' || marketToSearchFor === 'two'   || marketToSearchFor === '2'  ?  name = details[1]["2"]["name"] : name
  marketToSearchFor === '3rd' || marketToSearchFor === 'third'  || marketToSearchFor === 'three' || marketToSearchFor === '3'  ?  name = details[2]["3"]["name"] : name 
  marketToSearchFor === '4th' || marketToSearchFor === 'fourth' || marketToSearchFor === 'four'  || marketToSearchFor === '4'  ?  name = details[3]["4"]["name"] : name 
  marketToSearchFor === '5th' || marketToSearchFor === 'fifth'  || marketToSearchFor === 'five'  || marketToSearchFor === '5'  || marketToSearchFor === 'last' ? name = details[4]["5"]["name"] : name

  return name
}

function requestZip(deviceId, consentToken, callback) {

    var options = {
        hostname: 'api.amazonalexa.com',
        port: 443,
        path: `/v1/devices/${deviceId}/settings/address/countryAndPostalCode`,                
        method: 'GET',
        headers: {
            Authorization: `Bearer ${consentToken}`
        },
        accept: 'application/json'
    };

    var req = https.request(options, res => {
        res.setEncoding('utf8');
        var returnData;

        res.on('data', data => {
            console.log("data is: ", data)
            returnData = data;
        });

        res.on('end', () => {
            console.log("return data is: ", returnData)
            var zip = JSON.parse(returnData).postalCode;
            console.log("zip is: ", zip)
            callback(zip);  // this will execute whatever function the caller defined, with one argument

        });   
    });
    req.end();
}



function getFarmersMarkets(zipcode=0, city=0, id=0, callback){
  var location;
  !city && !zipcode ? location = `/mktDetail?id=${id}` : location = null;
  !city && !location ? location = `/zipSearch?zip=${zipcode}` : location ;
  !zipcode && !location ? location = `/locSearch?${city}` : location ;
  console.log("location : ", location)

  var options = {
        hostname: 'search.ams.usda.gov',
        port: 443,
        path: '/farmersmarkets/v1/data.svc' + location,
        method: 'GET',
        accept: 'application/json'
    };
  var req = https.request(options, res => {
      res.setEncoding('utf8');
      var farmData;

      res.on('data', data =>{
          farmData = data;
      });

      res.on('end', () => {
          farmData = JSON.parse(farmData)
          
          farmData.results ? farmData = parseData(getMartketData(farmData.results)) : farmData = farmData.marketdetails

          callback(farmData);
      });
    });
    req.end();
}

function getCity(city, callback){
  city = city.toLowerCase().replace(/\s/g, "%20")
  var API = 'AIzaSyCa5X-TyC8sqmqrkbS5lzhklqRCw6-hkDA';
  var options = {
    hostname: 'maps.googleapis.com',
    port: 443,
    path: `/maps/api/geocode/json?&address=${city}`,
    method: 'GET',
    accept: 'application/json'
  }

  var req = https.request(options, res => {
    res.setEncoding('utf8');
    var location = '';

    res.on('data', data => {
      location += data
    });

    res.on('end', () => {
      location = JSON.parse(location).results[0].geometry.location

      location = parseCity(location);

      callback(location);
    });
  }); 
  req.end();
};

function getMartketData(searchResults) {
    return searchResults.slice(0, 5).map((market)=> {
        return {name: market['marketname'].replace(/[0-9].[0-9]\s|[0-9][0-9].[0-9]\s/g, ""), 
                id: market['id']}
    });
};

function parseCity(city){
  return `lat=${city['lat']}&lng=${city['lng']}`
}

function parseData(result){
  var results = [];
  
  results.push({"1": result[0]});
  results.push({"2": result[1]});
  results.push({"3": result[2]});
  results.push({"4": result[3]});
  results.push({"5": result[4]});

  return results
}


function delegateSlotCollection(){
  console.log("in delegateSlotCollection");
  console.log("current dialogState: "+this.event.request.dialogState);
    if (this.event.request.dialogState === "STARTED") {
      console.log("in Beginning");
      var updatedIntent=this.event.request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      this.emit(":delegate", updatedIntent);
    } else if (this.event.request.dialogState !== "COMPLETED") {
      console.log("in not completed");
      // return a Dialog.Delegate directive with no updatedIntent property.
      this.emit(":delegate");
    } else {
      console.log("in completed");
      console.log("returning: "+ JSON.stringify(this.event.request.intent));
      // Dialog is now complete and all required slots should be filled,
      // so call your normal intent handler.
      return this.event.request.intent;
    }
}
