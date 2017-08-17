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
        this.emit(":ask", "Hi, please give me a city to search. You can say something like, near San Francisco", "You can say something like, near San Francisco.")
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
      console.log("attributes inside search near city", this.attributes['GetDetails'])
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
                    this.attributes['GetDetails'] = result;
                    var answerString = '';
                    var finalOutput;
                    finalOutput = result.map((answer) => {
                      return answer["1"]
                            || answer["2"]
                            || answer["3"]
                            || answer["4"]
                            || answer["5"]
                    }).map((market) => {
                      return answerString +  market["name"] 
                    });
                    console.log("final output is: " + finalOutput);
                    this.emit(":askWithCard", `Here are the markets near ${searchCity}: ${finalOutput}. Please tell me if you would like details on one. You can say something like, the first one.`, 'Please tell me which market you would like details on. You can say something like, the first one.');
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
                    this.attributes['GetDetails'] = result
                    var answerString = '';
                    var finalOutput;
                    finalOutput = result.map((answer) => {
                      return answer["1"]
                            || answer["2"]
                            || answer["3"]
                            || answer["4"]
                            || answer["5"]
                    }).map((market) => {
                      return answerString +  market["name"] 
                    });
                    console.log("final output is: " + finalOutput);
                    this.emit(":askWithCard", `Here are the markets near you: ${finalOutput}. Please tell me if you would like details on one. You can say something like, the first one.`, 'Please tell me which market you would like details on. You can say something like, the first one.');
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
      console.log("attributes inside of GetDetails ", this.attributes["GetDetails"]);
      var details = this.attributes["GetDetails"];
      console.log("details inside GetDetails ", details);

      var marketToSearchFor = this.event.request.intent.slots.details.value
      console.log("Market to search for ", marketToSearchFor);

      var id;
      id = findIdOfMarket(marketToSearchFor, details);
      console.log("id is ", id)

      getFarmersMarkets(null, null, id, (result) => {
        console.log("results for GetDetails: ", result);
        console.log("GoogleLink for GetDetails:", result["GoogleLink"])
        var marketDetail = ''
        var finalOutput = marketDetail + result['GoogleLink'];
        this.emit(":tellWithCard", `Here are the details: ${finalOutput}`)
      });
    }
};



//***********Helper Funcitons***********//

function findIdOfMarket(marketToSearchFor, details){
  var id 
  marketToSearchFor === '1st' ? id = details[0]["1"]["id"] : id = 'cannot find that id'
  marketToSearchFor === 'second' ? id = details[1]["2"]["id"] : id 
  marketToSearchFor === '3rd' ? id = details[2]["3"]["id"] : id 
  marketToSearchFor === '4th' ? id = details[3]["4"]["id"] : id 
  marketToSearchFor === '5th' ? id = details[4]["5"]["id"] : id

  return id
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
