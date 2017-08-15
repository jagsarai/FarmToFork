var https = require("https");

    function getFarmersMarketsByCity(city){
      getCity(city, (city) => {
      return getFarmersMarkets(null, city, (data) => {
        console.log(data);
        return data;
      });
    });
    }

    getFarmersMarketsByCity('the dalles oregon');

    function getFarmersMarketsByZip(zip){
      getFarmersMarkets(zip, null, (result) => {
        console.log(result);
        return result
      });
    };

    function getFarmersMarkets(zipcode=0, city=0, callback){
      var location;
      !city ? location = `/zipSearch?zip=${zipcode}` : location = `/locSearch?${city}`;

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
              farmData = JSON.parse(farmData).results
              
              farmData = getMartketData(farmData);

              callback(farmData);
          });
        });
        req.end();
    }

    function getCity(city, callback){
      city = city.replace(/\s/g, "%20");
      console.log(city);
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