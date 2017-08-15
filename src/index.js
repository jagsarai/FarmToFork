'use strict';
var Alexa = require("alexa-sdk");
const https = require("https");
var deviceId;
var consentToken;

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function(){
        this.emit('LaunchIntent');
    },
    'LaunchIntent': function () {
       console.log("deviceId: ", this.event.context.System.device.deviceId);
       this.event.context.System.device.deviceId !== undefined ? deviceId = this.event.context.System.device.deviceId
                                                               : deviceId = undefined;
       console.log("permissions: " , this.event.context.System.user.permissions);
       
       this.event.context.System.user.permissions !== undefined ? consentToken = this.event.context.System.user.permissions.consentToken 
                                                               : consentToken = undefined;

       console.log("consentToken: ", consentToken);
       if(deviceId !== undefined && consentToken !== undefined){
        this.emit(":ask", "Hi, please give me a city to search.", "Please provide a city name.")
       }
       else if(deviceId){
        var permissions = ['read::alexa:device:all:address:country_and_postal_code']
        this.emit(":tellWithPermissionCard", "Please use the Alexa skills app to enable your location", permissions);
       }
       else{
         this.emit(":tell", "Please use a proper device to access this skill. Goodbye!")
       }
    },
    'SearchNearCity': function () {
       var searchCity;
       console.log("city is: ", this.event.request.intent.slots.citySearch.value)

       this.event.request.intent.slots.citySearch.value !== undefined ? searchCity = this.event.request.intent.slots.citySearch.value
                                                                      : searchCity = null;
       console.log("deviceId: ", this.event.context.System.device.deviceId);
       this.event.context.System.device.deviceId !== undefined ? deviceId = this.event.context.System.device.deviceId
                                                               : deviceId = undefined;
       console.log("permissions: " , this.event.context.System.user.permissions);
       
       this.event.context.System.user.permissions !== undefined ? consentToken = this.event.context.System.user.permissions.consentToken 
                                                               : consentToken = undefined;

       console.log("consentToken: ", consentToken);
        if(deviceId !== undefined && consentToken !== undefined && searchCity !== undefined){
            getCity(searchCity, (city) => {
                getFarmersMarkets(null, city, null, (result) =>{
                    console.log("results inside search: ", result)
                    this.attributes = result;
                    var answerString = '';
                    var finalOutput;
                    finalOutput = result.map((answer) => {
                        return answerString + (" " + answer['name']);
                    });
                    console.log("final output is: " + finalOutput);
                    this.emit(":ask", `Here are the markets near ${searchCity}: ${finalOutput}`);
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
       console.log("attributes inside search near me: " , this.attributes);
       console.log("deviceId: ", this.event.context.System.device.deviceId);
       this.event.context.System.device.deviceId !== undefined ? deviceId = this.event.context.System.device.deviceId
                                                               : deviceId = undefined;
       console.log("permissions: " , this.event.context.System.user.permissions);
       
       this.event.context.System.user.permissions !== undefined ? consentToken = this.event.context.System.user.permissions.consentToken 
                                                               : consentToken = undefined;

       console.log("consentToken: ", consentToken);
        if(deviceId !== undefined && consentToken !== undefined){
            requestZip(deviceId, consentToken, (zip) => {
                console.log("This is my zip: ", zip);
                getFarmersMarkets(zip, null, null, (result) => {
                    var answerString = '';
                    var finalOutput;
                    finalOutput = result.map((answer) => {
                        return answerString + (" " + answer['name']);
                    });
                    console.log("final output is: " + finalOutput);
                    this.emit(":tell", `Here are the markets near you: ${finalOutput}`);
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
    }
};




//***********Helper Funcitons***********//


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


function getFarmersMarketsByCity(city){
    getCity('sacramento', (city) => {
      return getFarmersMarkets(null, city, (data) => {
        console.log(data);
        return data;
      });
    });
}

function getFarmersMarketsByZip(zip){
  getFarmersMarkets(zip, null, (result) => {
    console.log(result);
    return result
  });
};

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
          
          farmData.results ? farmData = getMartketData(farmData.results) : farmData = farmData.marketdetails

          callback(farmData);
      });
    });
    req.end();
}

function getCity(city, callback){
  city = city.replace(/\s/g, "%20")
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
