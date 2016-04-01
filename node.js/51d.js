var eventEmitter = require("events");
var fs = require("fs");
var path = require("path");

var FiftyOneDegrees = {};

// Return the Provider object initialised with the supplied config file.
FiftyOneDegrees.provider = function (configFile) {
    FiftyOneDegrees.log = new eventEmitter();

    var rawConfig = fs.readFileSync(configFile, "UTF8"),
        config = JSON.parse(rawConfig),
        FODcore,
        returnedProvider;

    // Require the 51Degrees node library.
    if (path.parse(config.dataFile).ext === ".dat") {
        config.Type = "BinaryV32";
        FODcore = require(__dirname + '/build/Release/FiftyOneDegreesPatternV3');
    } else if (path.parse(config.dataFile).ext === ".trie") {
        config.Type = "Trie";
        FODcore = require(__dirname + '/build/Release/FiftyOneDegreesTrieV3');
    } else {
        // Throw an error if neither Pattern or Trie are specified.
        throw "Invalid method " + config.Method + " in " + configFile;
    }

    // Initialise the Provider. Account for all variations here as the node SWIG interface
    // treats undefined as a value.
    try {
        if (config.Method === "Trie") {
            if (config.properties) {
                returnedProvider =  new FODcore.Provider(config.dataFile, config.properties);
            } else {
                returnedProvider =  new FODcore.Provider(config.dataFile);
            }
        } else {
            if (config.properties) {
                if (config.cacheSize && config.poolSize) {
                    returreturnedProvider = new FODcore.Provider(config.dataFile, config.properties, config.cacheSize, config.poolSize);
                } else {
                    returnedProvider = new FODcore.Provider(config.dataFile, config.properties);
                }
            } else {
                if (config.cacheSize && config.poolSize) {
                    returnedProvider = new FODcore.Provider(config.dataFile, config.cacheSize, config.poolSize);
                } else {
                    returnedProvider = new FODcore.Provider(config.dataFile);
                }
            }
        }
    } catch (e) {
        //TODO Add in proper error code.
        throw "51Degrees Provider failed to initialise";
    }


    // Get the important headers from the data set, this is used when matching with HTTP headers accounting
    // the case of the header names.
    var getImportantHeaders = function () {
        var i;
        var importantHeaders = {};
        for (i = 0; i < returnedProvider.getHttpHeaders().size(); i++) {
            var currentHeader = returnedProvider.getHttpHeaders().get(i);
            importantHeaders[returnedProvider.getHttpHeaders().get(i).toLowerCase()] = returnedProvider.getHttpHeaders().get(i);
        }
        return importantHeaders;
    }
    var importantHeaders = getImportantHeaders();

    // Expose the config for extrernal use.
    returnedProvider.config = config;

    // Wrapper function to ensure matching with HTTP headers uses the correct native function.
    returnedProvider.getMatchForHttpHeaders = function (headers) {
        var headersMap = new FODcore.MapStringString();
        Object.keys(headers).forEach(function (key) {
                Object.keys(importantHeaders).forEach(function (lowerKey) {
                    if (lowerKey === key.toLowerCase()) {
                        headersMap.set(importantHeaders[lowerKey], headers[key]);
                    }
                })
            })
            // Return the Match object.
        return returnedProvider.getMatch(headersMap);
    }

    // Start the auto update process in the background.
    if (config.Licence) {
        require("./update")(returnedProvider, FiftyOneDegrees);
    }

    return returnedProvider;
}

module.exports = FiftyOneDegrees;